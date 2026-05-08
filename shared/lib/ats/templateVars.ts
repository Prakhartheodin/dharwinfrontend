/**
 * Job template variable resolver.
 *
 * Substitutes {{token}} placeholders inside template HTML with values
 * sourced from the current job-form context. Unknown tokens are left
 * untouched so a recruiter can fill them by hand.
 *
 * Tokens are case-insensitive; surrounding whitespace inside the braces
 * is tolerated: {{job_title}}, {{ Job_Title }}, {{JOB_TITLE}} all match.
 */

export interface TemplateVarContext {
  jobTitle?: string;
  company?: string;
  location?: string;
  salaryMin?: string | number;
  salaryMax?: string | number;
  salaryCurrency?: string;
  jobType?: string;
  experienceLevel?: string;
  education?: string;
}

/** Public list — useful for hint UIs that show recruiters what they can use. */
export const TEMPLATE_VAR_TOKENS = [
  "job_title",
  "company",
  "location",
  "salary_min",
  "salary_max",
  "salary_range",
  "job_type",
  "experience_level",
  "education",
] as const;

export type TemplateVarToken = (typeof TEMPLATE_VAR_TOKENS)[number];

function fmtMoney(n: string | number | undefined, currency: string | undefined): string {
  if (n === undefined || n === null || n === "") return "";
  const num = typeof n === "number" ? n : Number(String(n).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(num)) return String(n);
  const cur = currency === "USD" ? "$" : currency ?? "";
  return `${cur}${num.toLocaleString()}`;
}

function buildValueMap(ctx: TemplateVarContext): Record<TemplateVarToken, string> {
  const min = fmtMoney(ctx.salaryMin, ctx.salaryCurrency);
  const max = fmtMoney(ctx.salaryMax, ctx.salaryCurrency);
  const range = min && max ? `${min} – ${max}` : min || max || "";

  return {
    job_title: ctx.jobTitle ?? "",
    company: ctx.company ?? "",
    location: ctx.location ?? "",
    salary_min: min,
    salary_max: max,
    salary_range: range,
    job_type: ctx.jobType ?? "",
    experience_level: ctx.experienceLevel ?? "",
    education: ctx.education ?? "",
  };
}

/**
 * Replace every recognized {{token}} in `html` with its resolved value.
 * Tokens whose resolved value is empty string are left untouched —
 * better to expose `{{salary_min}}` than to silently delete it.
 */
export function resolveTemplateVars(html: string, ctx: TemplateVarContext): string {
  if (!html) return html;
  const values = buildValueMap(ctx);
  return html.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (whole, rawKey: string) => {
    const key = rawKey.trim().toLowerCase() as TemplateVarToken;
    if (!(key in values)) return whole;
    const v = values[key];
    return v ? v : whole;
  });
}

/**
 * Quick scanner used by hint UIs — returns which known tokens appear inside
 * the given template HTML. Unresolved (still-bracketed) at preview time.
 */
export function findTokensInTemplate(html: string): TemplateVarToken[] {
  if (!html) return [];
  const found = new Set<TemplateVarToken>();
  const known = new Set<string>(TEMPLATE_VAR_TOKENS);
  const re = /\{\{\s*([a-zA-Z_]+)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const key = m[1].trim().toLowerCase();
    if (known.has(key)) found.add(key as TemplateVarToken);
  }
  return [...found];
}
