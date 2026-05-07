"use client";

// uat.dharwin.frontend/shared/components/FloatingChatbot/StructuredResponse/index.tsx
//
// Block-driven renderer. Branches on Block.type and produces premium
// enterprise-grade UI primitives. Real <table> on sm+ when ≤5 columns,
// stacked card fallback on narrow viewports — both rendered, CSS hides
// one to avoid runtime measurement.

import { useState, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type {
  Block,
  TableBlock,
  KVBlock,
  BadgeRowBlock,
  GroupBlock,
  FallbackBlock,
  ActionsBlock,
  TextBlock,
  HeadingBlock,
  CalloutBlock,
  CardsBlock,
  Tone,
  Column,
  CellValue,
  Row,
} from "@/shared/types/chatResponse";

// ── Tokens ──────────────────────────────────────────────────────────────

const TONE_CHIP: Record<Tone, string> = {
  neutral: "border-slate-200/80 bg-slate-100/70 text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200",
  info:    "border-sky-200/70 bg-sky-50/80 text-sky-700 dark:border-sky-800/50 dark:bg-sky-900/30 dark:text-sky-200",
  success: "border-emerald-200/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-200",
  warn:    "border-amber-200/70 bg-amber-50/80 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-200",
  danger:  "border-rose-200/70 bg-rose-50/80 text-rose-700 dark:border-rose-800/50 dark:bg-rose-900/30 dark:text-rose-200",
};

const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-slate-400",
  info:    "bg-sky-500",
  success: "bg-emerald-500",
  warn:    "bg-amber-500",
  danger:  "bg-rose-500",
};

// ── Helpers ─────────────────────────────────────────────────────────────

function cellText(v: CellValue): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return String(v.v ?? "—");
  return String(v);
}

function cellTone(v: CellValue): Tone | null {
  if (v && typeof v === "object" && "tone" in v && v.tone) return v.tone;
  return null;
}

function alignClass(col: Column): string {
  if (col.align === "right") return "text-right";
  if (col.align === "center") return "text-center";
  if (col.format === "number" || col.format === "currency") return "text-right";
  return "text-left";
}

function formatClass(col: Column): string {
  if (col.format === "number" || col.format === "currency") return "tabular-nums";
  if (col.format === "mono" || col.format === "date") return "font-mono text-[11.5px]";
  return "";
}

// ── Public API ──────────────────────────────────────────────────────────

export function StructuredResponse({ blocks }: { blocks: Block[] }) {
  if (!blocks?.length) return null;
  return (
    <div className="space-y-2.5">
      {blocks.map((b, i) => <BlockRenderer key={i} block={b} />)}
    </div>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  switch (block.type) {
    case "text":      return <TextBlockView block={block} />;
    case "heading":   return <HeadingBlockView block={block} />;
    case "callout":   return <CalloutBlockView block={block} />;
    case "kv":        return <KVBlockView block={block} />;
    case "badge_row": return <BadgeRowView block={block} />;
    case "table":     return <TableBlockView block={block} />;
    case "cards":     return <CardsBlockView block={block} />;
    case "group":     return <GroupBlockView block={block} />;
    case "fallback":  return <FallbackBlockView block={block} />;
    case "actions":   return <ActionsBlockView block={block} />;
    default:          return null;
  }
}

// ── Text / Heading / Callout ────────────────────────────────────────────

function TextBlockView({ block }: { block: TextBlock }) {
  return (
    <div className="text-[13px] leading-[1.65] text-slate-800 dark:text-slate-100 [&>p:last-child]:mb-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.md}</ReactMarkdown>
    </div>
  );
}

function HeadingBlockView({ block }: { block: HeadingBlock }) {
  const cls =
    block.level === 1 ? "text-[14px] font-semibold tracking-tight" :
    block.level === 2 ? "text-[13px] font-semibold" :
                        "font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary/80";
  return <p className={`${cls} text-slate-900 dark:text-slate-50`}>{block.text}</p>;
}

function CalloutBlockView({ block }: { block: CalloutBlock }) {
  return (
    <div className={`flex gap-2 rounded-lg border px-3 py-2 text-[12.5px] ${TONE_CHIP[block.tone]}`}>
      <span className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${TONE_DOT[block.tone]}`} />
      <div className="min-w-0 flex-1 [&>p]:mb-0">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.md}</ReactMarkdown>
      </div>
    </div>
  );
}

// ── KV ──────────────────────────────────────────────────────────────────

function KVBlockView({ block }: { block: KVBlock }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white px-3 py-2.5 dark:border-slate-700/60 dark:bg-slate-800/60">
      {block.title && (
        <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-primary/75">
          {block.title}
        </p>
      )}
      <div className="space-y-1">
        {block.pairs.map((p, i) => (
          <div key={i} className="flex flex-col gap-0.5 text-[12.5px] sm:flex-row sm:items-baseline sm:gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 sm:min-w-[7.5rem]">
              {p.label}
            </span>
            <span className={`min-w-0 flex-1 break-words tabular-nums text-slate-800 dark:text-slate-100 ${p.tone ? "font-medium" : ""}`}>
              {p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BadgeRow ────────────────────────────────────────────────────────────

function BadgeRowView({ block }: { block: BadgeRowBlock }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {block.chips.map((chip, i) => (
        <span
          key={i}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CHIP[chip.tone]}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[chip.tone]}`} />
          <span>{chip.label}</span>
          {typeof chip.count === "number" && (
            <span className="rounded-md bg-white/60 px-1 font-mono text-[10px] tabular-nums dark:bg-slate-900/40">
              {chip.count}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

// ── Table ───────────────────────────────────────────────────────────────

const TABLE_PAGE_SIZE = 10;

function TableBlockView({ block }: { block: TableBlock }) {
  const [page, setPage] = useState(0);
  const total = block.rows.length;
  const pageCount = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * TABLE_PAGE_SIZE;
  const end = Math.min(start + TABLE_PAGE_SIZE, total);
  const slice = block.rows.slice(start, end);
  const showPagination = total > TABLE_PAGE_SIZE;

  // Real <table> on sm+ when ≤5 columns; stacked cards on narrow or wide.
  const compactSafe = block.columns.length <= 5;

  return (
    <div className="space-y-2">
      {block.title && (
        <div className="flex items-center justify-between gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary/75">{block.title}</p>
          {showPagination && (
            <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <span className="text-primary/80">{start + 1}</span>
              <span className="mx-0.5 opacity-50">–</span>
              <span className="text-primary/80">{end}</span>
              <span className="mx-1 opacity-50">of</span>
              <span className="text-slate-700 dark:text-slate-200">{total}</span>
            </span>
          )}
        </div>
      )}

      {compactSafe && <RealTable columns={block.columns} rows={slice} startIndex={start} />}
      <CardStack
        columns={block.columns}
        rows={slice}
        startIndex={start}
        hiddenOnDesktop={compactSafe}
      />

      {showPagination && (
        <Pagination page={safePage} pageCount={pageCount} onPick={setPage} />
      )}
    </div>
  );
}

function RealTable({ columns, rows, startIndex }: { columns: Column[]; rows: Row[]; startIndex: number }) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-slate-200/70 bg-white shadow-[0_2px_10px_-6px_rgba(15,23,42,.08)] sm:block dark:border-slate-700/60 dark:bg-slate-800/60">
      <table className="min-w-full text-[12px]">
        <thead className="border-b border-slate-200/80 bg-slate-50/60 dark:border-slate-700/60 dark:bg-slate-900/40">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`whitespace-nowrap px-3 py-2 font-mono text-[9.5px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400 ${alignClass(col)}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={startIndex + ri}
              className="border-b border-slate-200/40 last:border-b-0 odd:bg-white even:bg-slate-50/40 hover:bg-primary/[0.04] dark:odd:bg-transparent dark:even:bg-slate-900/30"
            >
              {columns.map((col) => {
                const v = row[col.key];
                const tone = cellTone(v);
                const text = cellText(v);
                return (
                  <td
                    key={col.key}
                    className={`px-3 py-2 leading-snug text-slate-800 dark:text-slate-100 ${alignClass(col)} ${formatClass(col)}`}
                  >
                    {col.format === "badge" ? (
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CHIP[tone || "neutral"]}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone || "neutral"]}`} />
                        {text}
                      </span>
                    ) : (
                      text
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardStack({
  columns, rows, startIndex, hiddenOnDesktop,
}: { columns: Column[]; rows: Row[]; startIndex: number; hiddenOnDesktop: boolean }) {
  return (
    <div className={`space-y-2 ${hiddenOnDesktop ? "sm:hidden" : ""}`}>
      {rows.map((row, ri) => {
        const absoluteIndex = startIndex + ri;
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
              {columns.map((col) => {
                const v = row[col.key];
                const text = cellText(v);
                if (text === "—") return null;
                const tone = cellTone(v);
                return (
                  <div
                    key={col.key}
                    className="flex flex-col border-b border-slate-200/60 pb-1 leading-snug last:border-b-0 last:pb-0 dark:border-slate-700/40 sm:flex-row sm:items-baseline sm:gap-3"
                  >
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 sm:min-w-[6rem] sm:max-w-[40%]">
                      {col.label}
                    </span>
                    <span className="min-w-0 flex-1 break-words text-slate-800 dark:text-slate-100">
                      {col.format === "badge" ? (
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CHIP[tone || "neutral"]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone || "neutral"]}`} />
                          {text}
                        </span>
                      ) : (
                        text
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Pagination({ page, pageCount, onPick }: { page: number; pageCount: number; onPick: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <button
        type="button"
        onClick={() => onPick(Math.max(0, page - 1))}
        disabled={page === 0}
        className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600 transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300"
        aria-label="Previous page"
      >
        Prev
      </button>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
        Page <span className="text-primary/80">{page + 1}</span>
        <span className="mx-1 opacity-50">/</span>
        <span className="text-slate-700 dark:text-slate-200">{pageCount}</span>
      </span>
      <button
        type="button"
        onClick={() => onPick(Math.min(pageCount - 1, page + 1))}
        disabled={page === pageCount - 1}
        className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600 transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300"
        aria-label="Next page"
      >
        Next
      </button>
    </div>
  );
}

// ── Cards ───────────────────────────────────────────────────────────────

function CardsBlockView({ block }: { block: CardsBlock }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {block.items.map((item, i) => (
        <div key={i} className="rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-[12px] dark:border-slate-700/60 dark:bg-slate-800/60">
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-slate-700 dark:text-slate-200">
            {JSON.stringify(item, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

// ── Group ───────────────────────────────────────────────────────────────

function GroupBlockView({ block }: { block: GroupBlock }) {
  const [open, setOpen] = useState(block.defaultOpen ?? true);
  const isCollapsible = !!block.collapsible;

  const inner: ReactNode = (
    <div className="space-y-2">
      {block.blocks.map((b, i) => <BlockRenderer key={i} block={b} />)}
    </div>
  );

  if (!isCollapsible) {
    return (
      <div className="space-y-2">
        {block.title && (
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary/80">
            {block.title}
          </p>
        )}
        {inner}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/70 dark:border-slate-700/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2"
        aria-expanded={open}
      >
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary/80">
          {block.title}
        </span>
        <span className="text-slate-500">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="border-t border-slate-200/60 px-3 py-2 dark:border-slate-700/50">{inner}</div>}
    </div>
  );
}

// ── Fallback ────────────────────────────────────────────────────────────

function FallbackBlockView({ block }: { block: FallbackBlock }) {
  return (
    <div className="overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/70 to-white px-3.5 py-3 dark:border-amber-900/40 dark:from-amber-900/15 dark:to-slate-800/40">
      <div className="flex items-start gap-2">
        <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.4}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="text-[13px] leading-snug text-slate-900 dark:text-slate-50 [&>p]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.title}</ReactMarkdown>
          </div>

          {block.reasons.length > 0 && (
            <div className="space-y-1">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                Why this might be
              </p>
              <ul className="ml-4 list-disc space-y-0.5 text-[12px] text-slate-700 marker:text-amber-500 dark:text-slate-300">
                {block.reasons.map((r, i) => (
                  <li key={i} className="[&>p]:mb-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{r}</ReactMarkdown>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {block.suggestions.length > 0 && (
            <div className="space-y-1">
              <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-primary/75">
                Try next
              </p>
              <ul className="ml-4 list-disc space-y-0.5 text-[12px] text-slate-700 marker:text-primary/70 dark:text-slate-300">
                {block.suggestions.map((s, i) => (
                  <li key={i} className="[&>p]:mb-0">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{s}</ReactMarkdown>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Actions ─────────────────────────────────────────────────────────────

function ActionsBlockView({ block }: { block: ActionsBlock }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {block.buttons.map((btn, i) => (
        <button
          key={i}
          type="button"
          data-intent={btn.intent}
          data-payload={btn.payload}
          className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/[0.06] px-3 py-1 text-[11.5px] font-medium text-primary transition-all hover:border-primary/60 hover:bg-primary/10"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}

export default StructuredResponse;
