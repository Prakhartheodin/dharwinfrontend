"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { useState, type ReactNode } from "react";
import type { Block } from "@/shared/types/chatResponse";
import StructuredResponse from "./StructuredResponse";

interface Props {
  role: "user" | "assistant";
  content: string;
  fullscreen?: boolean;
  blocks?: Block[];
}

type HastNode =
  | { type: "text"; value: string }
  | { type: "element"; tagName: string; children?: HastNode[]; properties?: Record<string, unknown> }
  | { type: string; children?: HastNode[]; value?: string; tagName?: string };

function hastText(node: HastNode | undefined | null): string {
  if (!node) return "";
  if (node.type === "text" && typeof (node as { value?: string }).value === "string") {
    return (node as { value: string }).value;
  }
  const children = (node as { children?: HastNode[] }).children;
  if (Array.isArray(children)) return children.map(hastText).join("");
  return "";
}

function findHast(node: HastNode | undefined, tag: string, out: HastNode[] = []): HastNode[] {
  if (!node) return out;
  const tagName = (node as { tagName?: string }).tagName;
  if (node.type === "element" && tagName === tag) out.push(node);
  const children = (node as { children?: HastNode[] }).children;
  if (Array.isArray(children)) for (const c of children) findHast(c, tag, out);
  return out;
}

function renderHast(node: HastNode | undefined, key?: number): ReactNode {
  if (!node) return null;
  if (node.type === "text") return (node as { value: string }).value;
  const children = (node as { children?: HastNode[] }).children ?? [];
  const rendered = children.map((c, i) => renderHast(c, i));
  const tagName = (node as { tagName?: string }).tagName;
  switch (tagName) {
    case "strong":
    case "b":
      return <strong key={key} className="font-semibold">{rendered}</strong>;
    case "em":
    case "i":
      return <em key={key} className="italic">{rendered}</em>;
    case "code":
      return <code key={key} className="rounded bg-primary/10 dark:bg-primary/20 px-1 text-[0.92em] font-mono text-primary dark:text-purple-300">{rendered}</code>;
    case "a": {
      const href = ((node as { properties?: { href?: string } }).properties?.href) ?? "#";
      return (
        <a key={key} href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
          {rendered}
        </a>
      );
    }
    case "br":
      return <br key={key} />;
    default:
      return <span key={key}>{rendered}</span>;
  }
}

function CopyButton({ text, compact = false }: { text: string; compact?: boolean }) {
  const [done, setDone] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      title={done ? "Copied" : "Copy"}
      aria-label={done ? "Copied" : "Copy"}
      className={[
        "inline-flex items-center gap-1 rounded-md font-mono text-[10px] uppercase tracking-[0.14em]",
        "border transition-all",
        compact
          ? "px-1.5 py-0.5 border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:border-primary/40 hover:text-primary"
          : "px-1.5 py-0.5 border-slate-700/50 text-slate-400 hover:text-cyan-300 hover:border-cyan-400/40",
      ].join(" ")}
    >
      {done ? (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v10a2 2 0 002 2h7M16 17V5a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h2" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

const TABLE_PAGE_SIZE = 10;

function MarkdownTable({ node }: { node: HastNode | undefined }) {
  const [page, setPage] = useState(0);
  const headerCells = findHast(node, "th");
  const headers = headerCells.map((th) => hastText(th).trim());
  const dataRows = findHast(node, "tr").filter((tr) => findHast(tr, "td").length > 0);
  if (!dataRows.length) return null;

  const total = dataRows.length;
  const pageCount = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * TABLE_PAGE_SIZE;
  const end = Math.min(start + TABLE_PAGE_SIZE, total);
  const slice = dataRows.slice(start, end);
  const showPagination = total > TABLE_PAGE_SIZE;

  return (
    <div className="my-2 space-y-2">
      {showPagination && (
        <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
          <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            <span className="text-primary/80">{start + 1}</span>
            <span className="mx-0.5 opacity-50">–</span>
            <span className="text-primary/80">{end}</span>
            <span className="mx-1 opacity-50">of</span>
            <span className="text-slate-700 dark:text-slate-200">{total}</span>
          </span>
        </div>
      )}

      {slice.map((row, ri) => {
        const cells = findHast(row, "td");
        const absoluteIndex = start + ri;
        return (
          <div
            key={absoluteIndex}
            className="relative overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/60 px-3 py-2.5 text-[12px] dark:border-slate-700/60 dark:from-slate-800/60 dark:to-slate-900/60"
          >
            <span className="absolute left-0 top-0 h-full w-[2.5px] bg-gradient-to-b from-primary via-primary/70 to-cyan-400/60" />
            <div className="mb-1.5 flex items-center gap-1.5 pl-1">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-primary/70">
                Record · {String(absoluteIndex + 1).padStart(2, "0")}
              </span>
            </div>
            <div className="space-y-1 pl-1">
              {cells.map((cell, ci) => {
                const label = headers[ci] || `Field ${ci + 1}`;
                const valueText = hastText(cell).trim();
                if (!valueText) return null;
                const cellChildren = (cell as { children?: HastNode[] }).children ?? [];
                return (
                  <div
                    key={ci}
                    className="flex flex-col border-b border-slate-200/60 pb-1 leading-snug last:border-b-0 last:pb-0 dark:border-slate-700/40 sm:flex-row sm:items-baseline sm:gap-3"
                  >
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 sm:min-w-[6rem] sm:max-w-[40%]">
                      {label}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-slate-800 dark:text-slate-100">
                      {cellChildren.map((c, i) => renderHast(c, i))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {showPagination && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600 transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200/80 disabled:hover:text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-primary/40"
            aria-label="Previous page"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Prev
          </button>

          <PageDots count={pageCount} active={safePage} onPick={setPage} />

          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={safePage === pageCount - 1}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600 transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200/80 disabled:hover:text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-primary/40"
            aria-label="Next page"
          >
            Next
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function PageDots({ count, active, onPick }: { count: number; active: number; onPick: (p: number) => void }) {
  // Compact: max 7 dot slots with windowing for large counts.
  const MAX_SLOTS = 7;
  let slots: (number | "…")[];
  if (count <= MAX_SLOTS) {
    slots = Array.from({ length: count }, (_, i) => i);
  } else if (active <= 2) {
    slots = [0, 1, 2, 3, "…", count - 2, count - 1];
  } else if (active >= count - 3) {
    slots = [0, 1, "…", count - 4, count - 3, count - 2, count - 1];
  } else {
    slots = [0, "…", active - 1, active, active + 1, "…", count - 1];
  }
  return (
    <div className="flex items-center gap-1">
      {slots.map((s, i) =>
        s === "…" ? (
          <span key={`e-${i}`} className="px-1 font-mono text-[10px] text-slate-400 dark:text-slate-600">
            ·
          </span>
        ) : (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            aria-label={`Page ${s + 1}`}
            aria-current={s === active}
            className={[
              "h-5 min-w-[1.25rem] rounded-md px-1.5 font-mono text-[10px] tracking-[0.04em] transition-all",
              s === active
                ? "bg-gradient-to-br from-primary to-purple-600 text-white shadow-[0_2px_8px_-3px_rgb(132_90_223_/_0.6)]"
                : "border border-slate-200/80 bg-white text-slate-500 hover:border-primary/40 hover:text-primary dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-400 dark:hover:border-primary/40",
            ].join(" ")}
          >
            {s + 1}
          </button>
        )
      )}
    </div>
  );
}

function CodeBlock({ children, className }: { children?: ReactNode; className?: string }) {
  const lang = (className?.match(/language-(\w+)/)?.[1] || "code").toLowerCase();
  const text = String(
    Array.isArray(children) ? children.join("") : children ?? ""
  ).replace(/\n$/, "");
  return (
    <div className="group/code my-2 overflow-hidden rounded-xl border border-slate-700/40 bg-[#0b0d12] shadow-[0_6px_22px_-12px_rgba(0,0,0,.55)]">
      <div className="flex items-center justify-between border-b border-slate-700/40 bg-slate-800/40 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">{lang}</span>
        </div>
        <CopyButton text={text} />
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 text-[12px] leading-relaxed text-slate-100">
        <code className="font-mono">{children}</code>
      </pre>
    </div>
  );
}

const mdComponents: Components = {
  p: ({ children }) => <p className="mb-2 leading-[1.65] last:mb-0">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-2 list-disc space-y-1 pl-5 marker:text-primary/70">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 list-decimal space-y-1 pl-5 marker:font-semibold marker:text-primary/80">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900 dark:text-slate-50">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-slate-600 dark:text-slate-300">{children}</em>,
  h1: ({ children }) => (
    <div className="mb-2 mt-3 first:mt-0">
      <p className="text-[14px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">{children}</p>
      <div className="mt-1 h-px w-12 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
    </div>
  ),
  h2: ({ children }) => (
    <p className="mb-1 mt-2.5 text-[13px] font-semibold text-slate-800 dark:text-slate-100 first:mt-0">{children}</p>
  ),
  h3: ({ children }) => (
    <p className="mb-1 mt-2 font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary/80 first:mt-0">{children}</p>
  ),
  hr: () => <div className="my-3 h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent dark:via-slate-700/70" />,
  blockquote: ({ children }) => (
    <div className="my-2 flex gap-2 rounded-lg border border-primary/25 bg-primary/[0.06] px-3 py-2 text-[12.5px] text-slate-700 dark:text-slate-200">
      <svg className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div className="min-w-0 flex-1 [&>p]:mb-0">{children}</div>
    </div>
  ),
  code: ({ children, className }) => {
    if (className) return <CodeBlock className={className}>{children}</CodeBlock>;
    return (
      <code className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[0.85em] text-primary dark:bg-primary/20 dark:text-purple-300">
        {children}
      </code>
    );
  },
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-baseline gap-0.5 text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:decoration-primary"
    >
      {children}
      <svg className="h-2.5 w-2.5 self-center opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h5v5M19 5L10 14M5 9v10h10" />
      </svg>
    </a>
  ),
  table: ({ node }) => <MarkdownTable node={node as unknown as HastNode | undefined} />,
  thead: () => null,
  tbody: () => null,
  tr: () => null,
  th: () => null,
  td: () => null,
};

export default function ChatMessage({ role, content, fullscreen = false, blocks }: Props) {
  const isUser = role === "user";
  const bubbleMax = fullscreen
    ? isUser
      ? "max-w-[88%] sm:max-w-[75%] md:max-w-[65%]"
      : "max-w-[96%] sm:max-w-[92%] md:max-w-[90%]"
    : "max-w-[90%] sm:max-w-[85%]";

  return (
    <div className={`group/msg mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="mr-2 flex-shrink-0">
          <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary via-purple-500 to-cyan-400 text-[10px] font-bold tracking-wider text-white shadow-[0_3px_12px_-3px_rgb(132_90_223_/_0.55)] ring-1 ring-white/25">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/25 to-transparent" />
            <span className="relative">D</span>
          </div>
        </div>
      )}

      <div className="flex min-w-0 max-w-full flex-col">
        <div className={`mb-1 flex items-center gap-2 px-1 ${isUser ? "justify-end" : ""}`}>
          <span
            className={`font-mono text-[9px] uppercase tracking-[0.22em] ${
              isUser ? "text-slate-400 dark:text-slate-500" : "text-primary/75"
            }`}
          >
            {isUser ? "You" : "Agent · Dharwin"}
          </span>
        </div>

        <div
          className={[
            bubbleMax,
            "relative min-w-0 px-3.5 py-2.5 text-[13px] leading-relaxed break-words",
            isUser
              ? "rounded-2xl rounded-tr-sm bg-gradient-to-br from-primary to-purple-600 text-white shadow-[0_5px_18px_-8px_rgb(132_90_223_/_0.6)] ring-1 ring-white/15 whitespace-pre-wrap"
              : "rounded-2xl rounded-tl-sm border border-slate-200/70 bg-white text-slate-900 shadow-[0_3px_14px_-6px_rgba(15,23,42,.08)] dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-100",
          ].join(" ")}
        >
          <div className="relative">
            {isUser ? (
              content
            ) : blocks && blocks.length > 0 ? (
              <StructuredResponse blocks={blocks} />
            ) : (
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                {content}
              </ReactMarkdown>
            )}
          </div>

          {!isUser && content && (
            <div className="mt-2 -mb-0.5 flex items-center justify-end opacity-0 transition-opacity duration-200 group-hover/msg:opacity-100">
              <CopyButton text={content} compact />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
