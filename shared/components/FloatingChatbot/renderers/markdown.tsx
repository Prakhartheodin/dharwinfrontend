"use client";

// Markdown components mapping. Used when an agent reply has no Block[]
// envelope — falls back to parsing prose with ReactMarkdown. Tables reuse
// the same RecordCard + FieldRow + Pagination primitives as the block
// renderer, so output is visually identical.

import { useState, type ReactNode } from "react";
import type { Components } from "react-markdown";
import { FieldRow, Pagination, RecordCard, TABLE_PAGE_SIZE, TYPE } from "../ui";

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

// ─── MarkdownTable — renders <table> as vertical record cards ─────────────

export function MarkdownTable({ node }: { node: HastNode | undefined }) {
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
    <div className="my-2 space-y-2 min-w-0 max-w-full">
      {showPagination && (
        <div className="flex items-center justify-between gap-2 px-1 pb-0.5">
          <span className={TYPE.meta}>
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
          <RecordCard key={absoluteIndex} index={absoluteIndex}>
            {cells.map((cell, ci) => {
              const label = headers[ci] || `Field ${ci + 1}`;
              const valueText = hastText(cell).trim();
              if (!valueText) return null;
              const cellChildren = (cell as { children?: HastNode[] }).children ?? [];
              return (
                <FieldRow key={ci} label={label}>
                  {cellChildren.map((c, i) => renderHast(c, i))}
                </FieldRow>
              );
            })}
          </RecordCard>
        );
      })}

      {showPagination && (
        <Pagination page={safePage} pageCount={pageCount} onPick={setPage} />
      )}
    </div>
  );
}

// ─── CodeBlock — fenced code with macOS-window chrome ─────────────────────

function CodeBlock({ children, className }: { children?: ReactNode; className?: string }) {
  const lang = (className?.match(/language-(\w+)/)?.[1] || "code").toLowerCase();
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
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 text-[12px] leading-relaxed text-slate-100">
        <code className="font-mono">{children}</code>
      </pre>
    </div>
  );
}

// ─── Markdown components map ──────────────────────────────────────────────

export const mdComponents: Components = {
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
      <p className={TYPE.heading1}>{children}</p>
      <div className="mt-1 h-px w-12 bg-gradient-to-r from-primary via-primary/60 to-transparent" />
    </div>
  ),
  h2: ({ children }) => (
    <p className={`mb-1 mt-2.5 first:mt-0 ${TYPE.heading2}`}>{children}</p>
  ),
  h3: ({ children }) => (
    <p className={`mb-1 mt-2 first:mt-0 ${TYPE.heading3}`}>{children}</p>
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
