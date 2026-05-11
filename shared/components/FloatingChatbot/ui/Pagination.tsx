"use client";
import { TYPE } from "./tokens";

interface PaginationProps {
  page: number;
  pageCount: number;
  onPick: (page: number) => void;
}

// Unified prev/next + windowed page-dot pagination. Replaces both
// StructuredResponse Pagination and ChatMessage PageDots.
export function Pagination({ page, pageCount, onPick }: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-2 pt-1">
      <NavBtn
        label="Previous page"
        disabled={page === 0}
        onClick={() => onPick(Math.max(0, page - 1))}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Prev
      </NavBtn>

      <PageDots count={pageCount} active={page} onPick={onPick} />

      <NavBtn
        label="Next page"
        disabled={page === pageCount - 1}
        onClick={() => onPick(Math.min(pageCount - 1, page + 1))}
      >
        Next
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </NavBtn>
    </div>
  );
}

function NavBtn({
  label, disabled, onClick, children,
}: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-600 transition-all hover:border-primary/40 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200/80 disabled:hover:text-slate-600 dark:border-slate-700/60 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:border-primary/40"
    >
      {children}
    </button>
  );
}

function PageDots({ count, active, onPick }: { count: number; active: number; onPick: (p: number) => void }) {
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
          <span key={`e-${i}`} className={`px-1 ${TYPE.meta} text-slate-400 dark:text-slate-600`}>·</span>
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
