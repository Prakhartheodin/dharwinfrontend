"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { useTaskPagination } from "../hooks/useTaskPagination";
import { PAGE_LIMIT } from "../lib/constants";
import styles from "../../../kanban-board.module.css";

/**
 * Board-wide offset pagination bar (P1.5 §5.5).
 *
 * Mirrors the visual idiom of `/apps/projects/project-list` so the task board
 * pager belongs to the same PM-system visual family: rounded-full chrome,
 * mono tabular numbers, prev/next text buttons, condensed mobile layout.
 *
 * Keyboard: `[` previous page, `]` next page (P1.5 §5.5). Ignored when focus
 * is inside a text input / textarea / contentEditable element.
 */
export function PaginationBar(): React.JSX.Element | null {
  const { page, total, totalPages, isFetchingPage, goTo, next, prev } =
    useTaskPagination();
  const liveRef = useRef<HTMLSpanElement | null>(null);

  // Announce page changes for assistive tech (P1.5 §9 a11y).
  useEffect(() => {
    if (!liveRef.current) return;
    if (totalPages <= 1) return;
    liveRef.current.textContent = `Page ${page} of ${totalPages}`;
  }, [page, totalPages]);

  // Keyboard shortcuts: `[` prev / `]` next.
  useEffect(() => {
    function handler(e: KeyboardEvent): void {
      if (e.key !== "[" && e.key !== "]") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      if (e.key === "[") prev("keyboard");
      else next("keyboard");
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev]);

  const pages = useMemo<Array<number | "ellipsis">>(() => {
    if (totalPages <= 1) return [];
    return Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
      .reduce<Array<number | "ellipsis">>((acc, n, idx, arr) => {
        const prevN = arr[idx - 1];
        if (typeof prevN === "number" && n - prevN > 1) acc.push("ellipsis");
        acc.push(n);
        return acc;
      }, []);
  }, [page, totalPages]);

  if (totalPages <= 1) {
    return (
      <span ref={liveRef} className="sr-only" aria-live="polite" aria-atomic="true">
        {total > 0 ? `Showing ${total} task${total === 1 ? "" : "s"}.` : ""}
      </span>
    );
  }

  const showingFrom = Math.min(total, (page - 1) * PAGE_LIMIT + 1);
  const showingTo = Math.min(total, page * PAGE_LIMIT);

  return (
    <nav aria-label="Board pages" className={styles.kbPagerBar}>
      <span ref={liveRef} className="sr-only" aria-live="polite" aria-atomic="true" />

      <div className="flex min-w-0 items-center gap-3 overflow-hidden">
        <span className={styles.kbPagerKicker}>
          <span aria-hidden>Board</span>
          <span className="text-slate-300 dark:text-slate-600" aria-hidden>
            /
          </span>
          <span className="text-slate-700 tabular-nums dark:text-slate-200">
            Page {String(page).padStart(2, "0")}
          </span>
          <span className="text-slate-300 dark:text-slate-600" aria-hidden>
            of
          </span>
          <span className="text-slate-700 tabular-nums dark:text-slate-200">
            {String(totalPages).padStart(2, "0")}
          </span>
        </span>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 md:inline">
          {showingFrom}&ndash;{showingTo} of {total}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => prev("button")}
          disabled={page <= 1 || isFetchingPage}
          aria-label="Previous page"
          className="inline-flex h-7 items-center gap-1 border border-slate-300 bg-white px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-slate-700 dark:border-white/15 dark:bg-bodybg2 dark:text-slate-200 dark:hover:border-white dark:hover:bg-white dark:hover:text-slate-900"
        >
          <span aria-hidden>&larr;</span>
          <span>Prev</span>
        </button>

        <div className="hidden items-center gap-0.5 sm:flex">
          {pages.map((n, i) =>
            n === "ellipsis" ? (
              <span
                key={`dots-${i}`}
                className="px-1 font-mono text-xs text-slate-400"
                aria-hidden
              >
                ...
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => goTo(n, "button")}
                aria-current={n === page ? "page" : undefined}
                aria-label={`Go to page ${n}`}
                disabled={isFetchingPage && n !== page}
                className={
                  "min-w-[1.75rem] px-1.5 py-1 font-mono text-[11px] font-semibold tabular-nums transition " +
                  (n === page
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-500 hover:bg-slate-200/70 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-white/10")
                }
              >
                {String(n).padStart(2, "0")}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={() => next("button")}
          disabled={page >= totalPages || isFetchingPage}
          aria-label="Next page"
          className="inline-flex h-7 items-center gap-1 border border-slate-300 bg-white px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:border-slate-900 hover:bg-slate-900 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-white disabled:hover:text-slate-700 dark:border-white/15 dark:bg-bodybg2 dark:text-slate-200 dark:hover:border-white dark:hover:bg-white dark:hover:text-slate-900"
        >
          <span>Next</span>
          <span aria-hidden>&rarr;</span>
        </button>
      </div>
    </nav>
  );
}
