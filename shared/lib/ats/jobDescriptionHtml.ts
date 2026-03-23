/**
 * Job descriptions may be rich HTML (Tiptap) or plain text (imports, external APIs).
 * Use formatJobDescriptionForDisplay() before dangerouslySetInnerHTML.
 */

/** Decode HTML entities (e.g. &lt; → <). Backend xss-clean may store entity-encoded rich text. */
export function decodeHtmlEntities(html: string): string {
  if (!html || typeof html !== "string") return "";
  if (typeof document === "undefined") {
    return html
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/gi, "'");
  }
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** If present, treat body as trusted rich HTML from the editor (already sanitized server-side). */
const RICH_TEXT_MARKERS =
  /<\/?(?:p|div|ul|ol|li|h[1-6]|strong|b|em|i|u|span|a|blockquote|table|thead|tbody|tr|td|th|pre|code|mark|img|video)\b|<br\s*\/?>/i;

/** Standalone section titles (whole trimmed line). */
const FULL_LINE_SECTION_HEADERS: RegExp[] = [
  /^about the job\.?:?\s*$/i,
  /^why join us[.:?]?\s*$/i,
  /^what you'?ll do\.?:?\s*$/i,
  /^what you will do\.?:?\s*$/i,
  /^what we('?re| are) looking for\.?:?\s*$/i,
  /^you might be a fit( if you have)?\.?:?\s*$/i,
  /^requirements?(\s*&\s*qualifications)?\.?:?\s*$/i,
  /^qualifications\.?:?\s*$/i,
  /^preferred qualifications\.?:?\s*$/i,
  /^required expertise\.?:?\s*$/i,
  /^industry requirement\.?:?\s*$/i,
  /^responsibilities\.?:?\s*$/i,
  /^key responsibilities\.?:?\s*$/i,
  /^about the (role|company|position|job)\.?:?\s*$/i,
  /^about us\.?:?\s*$/i,
  /^role overview\.?:?\s*$/i,
  /^the role\.?:?\s*$/i,
  /^who you are\.?:?\s*$/i,
  /^nice to have(s)?\.?:?\s*$/i,
  /^education(\s*&\s*experience)?\.?:?\s*$/i,
  /^skills\s*&?\s*requirements\.?:?\s*$/i,
  /^some of the challenges you might take on\.?:?\s*$/i,
  /^how to apply\.?:?\s*$/i,
  /^overview\.?:?\s*$/i,
  /^summary\.?:?\s*$/i,
  /^your impact\.?:?\s*$/i,
  /^day to day\.?:?\s*$/i,
  /^what we offer\.?:?\s*$/i,
  /^job description\.?:?\s*$/i,
  /^company overview\.?:?\s*$/i,
  /^technical requirements\.?:?\s*$/i,
  /^minimum qualifications\.?:?\s*$/i,
  /^desired skills\.?:?\s*$/i,
  /^what we expect\.?:?\s*$/i,
  /^mandatory requirement\b[\s:–—-].{3,120}\s*$/i,
  /^what will you be doing\??\s*$/i,
  /^what you bring\??\s*$/i,
  /^like to learn more\??\s*$/i,
  /^your skills\s*&\s*experience(?:\s*[.…]{1,3})?\s*$/i,
  /^your role and responsibilities(?:\s*[.…]{1,3})?\s*$/i,
];

const LEADING_COLON_TITLE_BAD = /^(for|if|when|note|see|e\.g\.|eg\.?|example)\s/i;

/**
 * Typical job-post keywords / stacks (longest first for greedy match).
 * Matched case-insensitively with simple word-boundary rules.
 */
const KEYWORD_BOLD_PHRASES: string[] = [
  "TensorFlow Lite Micro",
  "Electrical/Computer Engineering",
  "Computer Science",
  "resource-constrained embedded platforms",
  "Computer Vision & Sensor Fusion",
  "Systems Engineering & Testing",
  "Embedded AI & Model Optimization",
  "Hardware Integration",
  "PyTorch Mobile",
  "Edge Impulse",
  "NVIDIA Jetson",
  "ARM Ethos-U",
  "HIL simulations",
  "field testing",
  "lab validation",
  "FPGA/ASIC accelerators",
  "multi-agent coordination",
  "Google Cloud",
  "Vertex AI",
  "machine learning",
  "deep learning",
  "real-time inference",
  "computer vision",
  "sensor fusion",
  "AI optimization",
  "embedded engineering",
  "embedded systems",
  "hardware acceleration",
  "artificial intelligence",
  "model optimization",
  "prompt engineering",
  "TensorRT",
  "CMSIS-NN",
  "OpenVINO",
  "Vitis AI",
  "Kubernetes",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "React",
  "Python",
  "C/C++",
  "REST API",
  "REST APIs",
  "MongoDB",
  "PostgreSQL",
  "LangChain",
  "TinyML",
  "Embedded AI",
  "ML/DL",
  "AI/ML",
  "LLMs",
  "LLM",
  "RAG",
  "GPU",
  "AWS",
  "Azure",
  "GCP",
  "SQL",
  "NoSQL",
  "Redis",
  "Kafka",
  "Docker",
  "CI/CD",
  "Agile",
  "Scrum",
  "Git",
  "quantization",
  "pruning",
  "compression",
  "agentic",
  "aerospace",
  "relocation",
  "15+ years",
  "10+ years",
  "5+ years",
  "3+ years",
  "0-1 years",
  "PhD",
  "Master's",
  "Master’s",
  "Masters",
  "Bachelor",
  "MBA",
  "MUST",
  "UAE",
  "defence",
  "defense",
  "ethical, inclusive, and responsible AI",
  "graph-based AI systems",
  "Infrastructure as Code",
  "production-grade ML pipelines",
  "Azure AI Services",
  "GenAI applications",
  "big data platforms",
  "Azure Synapse",
  "Apache Spark",
  "scikit-learn",
  "LlamaIndex",
  "PowerShell",
  "Terraform",
  "Jenkins",
  "Hadoop",
  "GitHub",
  "Bamboo",
  "MLOps",
  "PyTorch",
  "TensorFlow",
  "Azure ML",
  "AutoGen",
  "DSPy",
  "data engineering",
  "graph databases",
  "ML models",
  "responsible AI",
  "enterprise-grade",
  "cutting-edge AI",
  "data processing",
  "drift detection",
  "explainability",
  "GenAI",
  "IaC",
  "end-to-end",
  "Spark",
  "Chef",
  "bash",
  "PoCs",
  "PoC",
].sort((a, b) => b.length - a.length);

function isWordChar(c: string | undefined): boolean {
  return c !== undefined && c !== "" && /\w/.test(c);
}

function canPlaceKeywordPhrase(s: string, i: number, phrase: string): boolean {
  const pl = phrase.length;
  if (pl === 0 || i + pl > s.length) return false;
  if (s.slice(i, i + pl).toLowerCase() !== phrase.toLowerCase()) return false;
  const before = i > 0 ? s[i - 1] : "";
  const after = i + pl < s.length ? s[i + pl] : "";
  if (/[/+.]/.test(phrase)) {
    return (!before || !isWordChar(before)) && (!after || !isWordChar(after));
  }
  if (phrase.length <= 4 && /^[A-Z0-9/+.'’-]+$/i.test(phrase)) {
    return (!before || !isWordChar(before)) && (!after || !isWordChar(after));
  }
  return (!before || !isWordChar(before)) && (!after || !isWordChar(after));
}

/** Wrap known technical / education keywords in <strong> (plain text only). */
function emphasizeKeywordsInPlainTextSegment(segment: string): string {
  if (!segment) return "";
  let i = 0;
  let out = "";
  while (i < segment.length) {
    let hit: { len: number; raw: string } | null = null;
    for (const phrase of KEYWORD_BOLD_PHRASES) {
      if (canPlaceKeywordPhrase(segment, i, phrase)) {
        hit = { len: phrase.length, raw: segment.slice(i, i + phrase.length) };
        break;
      }
    }
    if (hit) {
      out += "<strong>" + escapeHtmlText(hit.raw) + "</strong>";
      i += hit.len;
    } else {
      out += escapeHtmlText(segment[i] ?? "");
      i += 1;
    }
  }
  return out;
}

/** Short subsection titles (e.g. "Embedded AI & Model Optimization", "Leadership") without a trailing sentence. */
function isLikelySubsectionTitleLine(trimmed: string): boolean {
  if (trimmed.length < 6 || trimmed.length > 88) return false;
  if (/[.!?]\s*$/.test(trimmed)) return false;
  if (/^[a-z]/.test(trimmed)) return false;
  if (/\b(that we|which we|will be|should have|you will|we are|they are)\b/i.test(trimmed)) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length > 14) return false;

  if (words.length === 1) {
    const w = words[0];
    if (/^(The|This|These|Those|When|Where|What|Why|How|Your|Our|All|Some|Note)$/i.test(w)) return false;
    return /^[A-Z][a-zA-Z &-]{4,24}$/.test(w);
  }

  if (words.length < 2 && !/[&/]/.test(trimmed)) return false;

  if (/^location\b/i.test(trimmed) && !trimmed.includes(":")) return false;

  const alphaWords = words.filter((w) => /[a-zA-Z]/.test(w));
  if (alphaWords.length === 0) return false;
  const titled = alphaWords.filter((w) => /^[A-Z(0-9]/.test(w) || /^&/.test(w)).length;
  return titled / alphaWords.length >= 0.45;
}

function isBulletLine(trimmed: string): boolean {
  return /^([•*-]|\d+[\.)])\s+/.test(trimmed);
}

/**
 * Bold likely section labels in plain-text job posts (imports / external APIs).
 * Does not run on HTML descriptions from the rich-text editor.
 */
function formatPlainTextLineWithSectionEmphasis(rawLine: string): string {
  const line = rawLine.trimEnd();
  const trimmed = line.trim();
  if (trimmed === "") return escapeHtmlText(line);

  const leadWs = /^\s*/.exec(line)?.[0] ?? "";

  if (isBulletLine(trimmed)) {
    const m = trimmed.match(/^((?:[•*-]|\d+[\.)])\s+)(.+)$/);
    if (m) {
      const [, bulletPrefix, rest] = m;
      const colon = rest.match(/^([^:\n]{2,75}):\s+(.{6,})$/);
      if (
        colon &&
        !colon[1].includes(".") &&
        !LEADING_COLON_TITLE_BAD.test(colon[1].trim())
      ) {
        const title = colon[1].trim();
        const body = colon[2];
        return `${escapeHtmlText(leadWs)}${escapeHtmlText(bulletPrefix)}<strong>${escapeHtmlText(title)}:</strong> ${emphasizeKeywordsInPlainTextSegment(body)}`;
      }
      return `${escapeHtmlText(leadWs)}${escapeHtmlText(bulletPrefix)}${emphasizeKeywordsInPlainTextSegment(rest)}`;
    }
    return escapeHtmlText(line);
  }

  for (const re of FULL_LINE_SECTION_HEADERS) {
    if (re.test(trimmed)) {
      return `${escapeHtmlText(leadWs)}<strong>${escapeHtmlText(trimmed)}</strong>`;
    }
  }

  if (isLikelySubsectionTitleLine(trimmed)) {
    return `${escapeHtmlText(leadWs)}<strong>${escapeHtmlText(trimmed)}</strong>`;
  }

  const loc = trimmed.match(/^(location|work location|job location|work mode)\s*:\s*(.*)$/i);
  if (loc) {
    const label = loc[1];
    const rest = loc[2].trim();
    return `${escapeHtmlText(leadWs)}<strong>${escapeHtmlText(label)}:</strong>${rest ? ` ${emphasizeKeywordsInPlainTextSegment(rest)}` : ""}`;
  }

  const comp = trimmed.match(
    /^(compensation|salary|pay range|stipend|remuneration|benefits)\s*:\s*(.*)$/i
  );
  if (comp) {
    const label = comp[1];
    const rest = comp[2].trim();
    return `${escapeHtmlText(leadWs)}<strong>${escapeHtmlText(label)}:</strong>${rest ? ` ${emphasizeKeywordsInPlainTextSegment(rest)}` : ""}`;
  }

  const colonBody = trimmed.match(/^([^:\n]{2,90}):\s+(.{8,})$/);
  if (colonBody) {
    const titlePart = colonBody[1].trim();
    const bodyPart = colonBody[2];
    if (
      !titlePart.includes(".") &&
      !LEADING_COLON_TITLE_BAD.test(titlePart) &&
      titlePart.length >= 2
    ) {
      return `${escapeHtmlText(leadWs)}<strong>${escapeHtmlText(titlePart)}:</strong> ${emphasizeKeywordsInPlainTextSegment(bodyPart)}`;
    }
  }

  const titleOnlyColon = trimmed.match(/^([^:\n]{2,90}):\s*$/);
  if (titleOnlyColon) {
    const t = titleOnlyColon[1].trim();
    if (!t.includes(".") && !LEADING_COLON_TITLE_BAD.test(t)) {
      return `${escapeHtmlText(leadWs)}<strong>${escapeHtmlText(trimmed)}</strong>`;
    }
  }

  const core = line.slice(leadWs.length);
  return escapeHtmlText(leadWs) + emphasizeKeywordsInPlainTextSegment(core);
}

/**
 * HTML suitable for dangerouslySetInnerHTML inside a `prose` container.
 */
export function formatJobDescriptionForDisplay(raw: string): string {
  if (!raw || typeof raw !== "string") return "";
  const decoded = decodeHtmlEntities(raw);
  const normalized = decoded.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  if (RICH_TEXT_MARKERS.test(normalized)) {
    return normalized;
  }

  const blocks = normalized.split(/\n{2,}/);
  return blocks
    .map((block) => {
      const lines = block.split("\n");
      const inner = lines.map((ln) => formatPlainTextLineWithSectionEmphasis(ln)).join("<br />");
      return `<p>${inner}</p>`;
    })
    .join("");
}

/** Tailwind Typography classes for job / company long-form text */
export const JOB_DESCRIPTION_PROSE_CLASS =
  "prose prose-sm sm:prose-base dark:prose-invert max-w-none job-description-content " +
  "text-gray-700 dark:text-gray-200 " +
  "prose-headings:font-semibold prose-p:leading-relaxed prose-p:mb-3 last:prose-p:mb-0 " +
  "prose-ul:my-3 prose-ol:my-3 prose-li:my-0.5 " +
  "prose-a:text-primary prose-strong:text-inherit";

/** Candidate browse job detail: editorial reading column (serif body, distinct section hierarchy). */
export const BROWSE_JOB_DETAIL_PROSE_CLASS =
  "job-description-content prose prose-lg dark:prose-invert max-w-none w-full " +
  "font-serif text-stone-700 dark:text-stone-300 " +
  "prose-headings:font-Montserrat prose-headings:font-semibold prose-headings:tracking-tight prose-headings:text-stone-900 dark:prose-headings:text-stone-100 " +
  "prose-h2:text-xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-stone-200/90 dark:prose-h2:border-white/10 first:prose-h2:mt-0 " +
  "prose-h3:text-lg prose-h3:mt-8 prose-h3:mb-3 " +
  "prose-p:leading-[1.8] prose-p:text-[1.0625rem] prose-p:mb-4 " +
  "prose-ul:my-5 prose-ol:my-5 prose-li:my-2 prose-li:pl-1 prose-li:marker:text-teal-600 dark:prose-li:marker:text-teal-400 " +
  "prose-strong:font-semibold prose-strong:text-stone-900 dark:prose-strong:text-white " +
  "prose-a:text-teal-700 dark:prose-a:text-teal-400 prose-a:font-medium prose-a:no-underline hover:prose-a:underline " +
  "prose-blockquote:border-l-[3px] prose-blockquote:border-teal-600 dark:prose-blockquote:border-teal-500 " +
  "prose-blockquote:bg-stone-100/60 dark:prose-blockquote:bg-white/[0.04] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-xl prose-blockquote:not-italic " +
  "prose-code:text-[0.9em] prose-code:font-mono prose-code:bg-stone-100 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md " +
  "prose-hr:border-stone-200 dark:prose-hr:border-white/10";
