"use client";

// Block-driven renderer. Dispatches on Block.type and renders via shared
// UI primitives (../ui). Each block branch is a few lines — the heavy
// layout lives in the primitives, never duplicated here.

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
import {
  Callout,
  Chip,
  CONTAINMENT,
  EmptyState,
  FieldRow,
  KV,
  Pagination,
  RecordCard,
  TABLE_PAGE_SIZE,
  TYPE,
  WRAP_ANYWHERE,
} from "../ui";

// ── Helpers ─────────────────────────────────────────────────────────────

function cellText(v: CellValue): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return String(v.v ?? "—");
  return String(v);
}

// IST-safe date display for cells annotated with `format: "date"`. Mongo
// dates often arrive as UTC ISO strings; `new Date(iso).toLocaleDateString()`
// in an IST viewer can shift the visible day back by one (issue 8). Bare
// YYYY-MM-DD → treat as local-day; ISO timestamps → display in Asia/Kolkata.
function formatDateCell(raw: string): string {
  if (!raw || raw === "—") return raw || "—";
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  const d = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    : new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: ymd ? undefined : "Asia/Kolkata",
  });
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

export function StructuredResponse({ blocks, compact = false }: { blocks: Block[]; compact?: boolean }) {
  if (!blocks?.length) return null;
  return (
    <div className={`space-y-2.5 ${CONTAINMENT} ${WRAP_ANYWHERE}`}>
      {blocks.map((b, i) => <BlockRenderer key={i} block={b} compact={compact} />)}
    </div>
  );
}

function BlockRenderer({ block, compact }: { block: Block; compact: boolean }) {
  switch (block.type) {
    case "text":      return <TextBlockView block={block} />;
    case "heading":   return <HeadingBlockView block={block} />;
    case "callout":   return <CalloutBlockView block={block} />;
    case "kv":        return <KVBlockView block={block} />;
    case "badge_row": return <BadgeRowView block={block} />;
    case "table":     return <TableBlockView block={block} compact={compact} />;
    case "cards":     return <CardsBlockView block={block} compact={compact} />;
    case "group":     return <GroupBlockView block={block} compact={compact} />;
    case "fallback":  return <FallbackBlockView block={block} />;
    case "actions":   return <ActionsBlockView block={block} />;
    default:          return null;
  }
}

// ── Text / Heading / Callout ────────────────────────────────────────────

function TextBlockView({ block }: { block: TextBlock }) {
  return (
    <div className={`${CONTAINMENT} text-[13px] leading-[1.65] text-slate-800 dark:text-slate-100 [&>p:last-child]:mb-0 [&_*]:max-w-full [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_img]:max-w-full [&_p]:break-words ${WRAP_ANYWHERE}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.md}</ReactMarkdown>
    </div>
  );
}

function HeadingBlockView({ block }: { block: HeadingBlock }) {
  const cls =
    block.level === 1 ? TYPE.heading1 :
    block.level === 2 ? TYPE.heading2 :
                        TYPE.heading3;
  return <p className={cls}>{block.text}</p>;
}

function CalloutBlockView({ block }: { block: CalloutBlock }) {
  return <Callout tone={block.tone} md={block.md} />;
}

// ── KV / BadgeRow ───────────────────────────────────────────────────────

function KVBlockView({ block }: { block: KVBlock }) {
  return <KV title={block.title} pairs={block.pairs} />;
}

function BadgeRowView({ block }: { block: BadgeRowBlock }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {block.chips.map((chip, i) => (
        <Chip key={i} tone={chip.tone} label={chip.label} count={chip.count} />
      ))}
    </div>
  );
}

// ── Table ───────────────────────────────────────────────────────────────

function TableBlockView({ block, compact = false }: { block: TableBlock; compact?: boolean }) {
  const [page, setPage] = useState(0);
  const total = block.rows.length;

  if (total === 0) {
    return <EmptyState noun={block.title || "records"} />;
  }

  const pageCount = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * TABLE_PAGE_SIZE;
  const end = Math.min(start + TABLE_PAGE_SIZE, total);
  const slice = block.rows.slice(start, end);
  const showPagination = total > TABLE_PAGE_SIZE;

  const compactSafe = !compact && block.columns.length <= 3;

  return (
    <div className={`space-y-2 ${CONTAINMENT}`}>
      {block.title && (
        <div className="flex items-center justify-between gap-2">
          <p className={TYPE.title}>{block.title}</p>
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
    <div className={`hidden overflow-x-auto rounded-xl border border-slate-200/70 bg-white shadow-[0_2px_10px_-6px_rgba(15,23,42,.08)] sm:block dark:border-slate-700/60 dark:bg-slate-800/60 ${CONTAINMENT}`}>
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
                const raw = cellText(v);
                const text = col.format === "date" ? formatDateCell(raw) : raw;
                return (
                  <td
                    key={col.key}
                    className={`px-3 py-2 leading-snug text-slate-800 dark:text-slate-100 ${alignClass(col)} ${formatClass(col)}`}
                  >
                    {col.format === "badge" ? (
                      <Chip tone={tone || "neutral"} label={text} />
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
    <div className={`space-y-2 ${CONTAINMENT} ${hiddenOnDesktop ? "sm:hidden" : ""}`}>
      {rows.map((row, ri) => {
        const absoluteIndex = startIndex + ri;
        return (
          <RecordCard key={absoluteIndex} index={absoluteIndex}>
            {columns.map((col) => {
              const v = row[col.key];
              const raw = cellText(v);
              if (raw === "—") return null;
              const text = col.format === "date" ? formatDateCell(raw) : raw;
              const tone = cellTone(v);
              return (
                <FieldRow key={col.key} label={col.label}>
                  {col.format === "badge" ? (
                    <Chip tone={tone || "neutral"} label={text} />
                  ) : (
                    text
                  )}
                </FieldRow>
              );
            })}
          </RecordCard>
        );
      })}
    </div>
  );
}

// ── Cards ───────────────────────────────────────────────────────────────

function CardsBlockView({ block, compact = false }: { block: CardsBlock; compact?: boolean }) {
  if (!block.items?.length) {
    return <EmptyState noun={(block as { layout?: string }).layout || "records"} />;
  }
  const formatKey = (k: string) =>
    k.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <div className={`grid gap-2 ${CONTAINMENT} ${compact ? "grid-cols-1" : "sm:grid-cols-2"}`}>
      {block.items.map((item, i) => {
        const entries = Object.entries(item as Record<string, unknown>).filter(
          ([, v]) => v !== null && v !== undefined && v !== ""
        );
        return (
          <RecordCard key={i} index={i}>
            {entries.map(([k, v]) => (
              <FieldRow key={k} label={formatKey(k)}>
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </FieldRow>
            ))}
          </RecordCard>
        );
      })}
    </div>
  );
}

// ── Group ───────────────────────────────────────────────────────────────

function GroupBlockView({ block, compact = false }: { block: GroupBlock; compact?: boolean }) {
  const [open, setOpen] = useState(block.defaultOpen ?? true);
  const isCollapsible = !!block.collapsible;

  const inner: ReactNode = (
    <div className="space-y-2">
      {block.blocks.map((b, i) => <BlockRenderer key={i} block={b} compact={compact} />)}
    </div>
  );

  if (!isCollapsible) {
    return (
      <div className={`space-y-2 ${CONTAINMENT}`}>
        {block.title && <p className={`${TYPE.heading3} text-primary/80`}>{block.title}</p>}
        {inner}
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200/70 dark:border-slate-700/60 ${CONTAINMENT}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2"
        aria-expanded={open}
      >
        <span className={`${TYPE.heading3} text-primary/80`}>{block.title}</span>
        <span className="text-slate-500">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="border-t border-slate-200/60 px-3 py-2 dark:border-slate-700/50">{inner}</div>}
    </div>
  );
}

// ── Fallback ────────────────────────────────────────────────────────────

function FallbackBlockView({ block }: { block: FallbackBlock }) {
  return (
    <div className={`overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/70 to-white px-3.5 py-3 ${CONTAINMENT} ${WRAP_ANYWHERE} dark:border-amber-900/40 dark:from-amber-900/15 dark:to-slate-800/40`}>
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
              <p className={TYPE.title}>Try next</p>
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
