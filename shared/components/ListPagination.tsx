"use client";

import React, { useId, useState } from "react";
import { buildPaginationItems, getPaginationRange } from "@/shared/lib/pagination-items";

export const DEFAULT_LIST_PAGE_SIZE = 100;
export const DEFAULT_LIST_PAGE_SIZE_OPTIONS: readonly number[] = [10, 25, 50, 100];

export type ListPaginationProps = {
  page: number;
  totalPages: number;
  totalResults: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** When set, shows a rows-per-page control (server- or client-side lists). */
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: readonly number[];
  ariaLabel?: string;
  gotoInputId?: string;
  pageSizeSelectId?: string;
  className?: string;
  /** 44px min touch targets on pager controls (mobile-friendly lists). */
  touchFriendly?: boolean;
  /** When true, hide page controls when totalPages <= 1 (summary row still visible). */
  hideWhenSinglePage?: boolean;
  /** Rows-per-page selector. Default true. */
  showPageSize?: boolean;
  /** "Showing X to Y of Z entries" text. Default true. */
  showSummary?: boolean;
  /** Prev/Next, page numbers, and go-to-page. Default true. */
  showPager?: boolean;
  /** Summary left / controls right on one row (e.g. table footers). */
  layout?: "default" | "footer-split";
  summaryClassName?: string;
  /** Trailing arrow after summary. Default true. */
  showSummaryIcon?: boolean;
  /** Use an en dash between range values (presentation only). */
  useEnDashInSummary?: boolean;
  /** Do not highlight Next with primary text color. */
  neutralNavButtons?: boolean;
  /** h-8 controls for pager + go-to form. */
  compactControls?: boolean;
  pagerGroupClassName?: string;
};

/**
 * Students / Jobs list pager: “Showing X to Y of Z”, page numbers with ellipsis, and Go to page.
 */
export default function ListPagination({
  page,
  totalPages,
  totalResults,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_LIST_PAGE_SIZE_OPTIONS,
  ariaLabel = "Page navigation",
  gotoInputId,
  pageSizeSelectId,
  className,
  touchFriendly = false,
  hideWhenSinglePage = false,
  showPageSize = true,
  showSummary = true,
  showPager = true,
  layout = "default",
  summaryClassName,
  showSummaryIcon = true,
  useEnDashInSummary = false,
  neutralNavButtons = false,
  compactControls = false,
  pagerGroupClassName,
}: ListPaginationProps) {
  const isFooterSplit = layout === "footer-split";
  const pageLinkClass = compactControls
    ? "!inline-flex !h-8 !min-h-8 !items-center !justify-center !px-2.5 sm:!px-3 !py-0"
    : "px-3 py-[0.375rem]";
  const touchClass = touchFriendly
    ? "[&_.page-link]:!min-h-11 [&_.page-link]:!min-w-11 [&_.page-link]:!inline-flex [&_.page-link]:!items-center [&_.page-link]:!justify-center [&_.ti-btn]:!min-h-11 [&_input.ti-form-control]:!min-h-11"
    : "";
  const autoId = useId();
  const inputId = gotoInputId ?? `${autoId}-goto-page`;
  const rowsSelectId = pageSizeSelectId ?? `${autoId}-page-size`;
  const hintId = `${inputId}-hint`;
  const [gotoPageInput, setGotoPageInput] = useState("");
  const { start, end } = getPaginationRange(totalResults, page, pageSize);
  const safeTotalPages = Math.max(0, totalPages);
  const atStart = page <= 1;
  const atEnd = page >= safeTotalPages || safeTotalPages === 0;
  const showPagerControls = showPager && (!hideWhenSinglePage || safeTotalPages > 1);
  const showPageSizeControl = showPageSize && onPageSizeChange;
  const disabledNavClass = (disabled: boolean) =>
    disabled ? "opacity-50 cursor-not-allowed" : "";

  if (!showPageSizeControl && !showSummary && !showPagerControls) {
    return null;
  }

  const rangeSeparator = useEnDashInSummary ? "\u2013" : "to";

  return (
    <div
      className={`flex flex-wrap items-center ${isFooterSplit ? "w-full min-w-0 justify-between gap-x-4 gap-y-2" : "gap-4"} ${touchClass} ${className ?? ""}`}
    >
      {showPageSizeControl ? (
        <select
          id={rowsSelectId}
          className="form-control select-show-page-size !w-auto !h-8 !py-1 !text-[0.75rem] !rounded-lg"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label={ariaLabel}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              Show {size}
            </option>
          ))}
        </select>
      ) : null}
      {showSummary ? (
        <div
          className={`list-pagination__summary shrink-0 ${isFooterSplit ? "text-[0.8125rem] text-[#8c9097] dark:text-white/60" : ""} ${summaryClassName ?? ""}`}
        >
          Showing {start} {rangeSeparator} {end} of {totalResults} entries
          {showSummaryIcon ? <i className="bi bi-arrow-right ms-2 font-semibold" aria-hidden="true" /> : null}
        </div>
      ) : null}
      {showPagerControls ? (
      <div
        className={`list-pagination__pager-group flex flex-wrap items-center gap-x-3 gap-y-2 ${isFooterSplit ? "justify-end" : "ms-auto"} ${pagerGroupClassName ?? ""}`}
      >
        <nav aria-label={ariaLabel} className="pagination-style-4">
          <ul className="ti-pagination mb-0">
            <li className={`page-item ${atStart ? "disabled" : ""}`}>
              <button
                type="button"
                className={`page-link ${pageLinkClass} ${disabledNavClass(atStart)}`}
                onClick={() => onPageChange(page - 1)}
                disabled={atStart}
                aria-disabled={atStart}
                aria-label="Previous page"
              >
                Prev
              </button>
            </li>
            {buildPaginationItems(page - 1, safeTotalPages).map((item, idx) =>
              item.type === "ellipsis" ? (
                <li key={`ellipsis-${idx}`} className="page-item disabled" aria-hidden="true">
                  <span className={`page-link ${pageLinkClass}`}>…</span>
                </li>
              ) : (
                <li
                  key={item.page}
                  className={`page-item ${page === item.page + 1 ? "active" : ""}`}
                >
                  <button
                    type="button"
                    className={`page-link ${pageLinkClass}`}
                    onClick={() => onPageChange(item.page + 1)}
                    aria-current={page === item.page + 1 ? "page" : undefined}
                    aria-label={`Go to page ${item.page + 1}`}
                  >
                    {item.page + 1}
                  </button>
                </li>
              )
            )}
            <li className={`page-item ${atEnd ? "disabled" : ""}`}>
              <button
                type="button"
                className={`page-link ${pageLinkClass} ${neutralNavButtons ? "" : "text-primary"} ${disabledNavClass(atEnd)}`}
                onClick={() => onPageChange(page + 1)}
                disabled={atEnd}
                aria-disabled={atEnd}
                aria-label="Next page"
              >
                Next
              </button>
            </li>
          </ul>
        </nav>

        {safeTotalPages > 1 && (
          <form
            className={`list-pagination__goto flex shrink-0 items-center gap-2 min-w-0 ${compactControls ? "[&_.ti-btn]:!h-8 [&_.ti-btn]:!shrink-0 [&_.ti-btn]:!px-3 [&_.ti-btn]:!py-0 [&_.ti-btn]:!leading-none [&_input]:!shrink-0" : ""}`}
            onSubmit={(e) => {
              e.preventDefault();
              const raw = gotoPageInput.trim();
              if (!raw) return;
              const parsed = Number(raw);
              if (!Number.isFinite(parsed)) return;
              onPageChange(Math.min(Math.max(Math.trunc(parsed), 1), safeTotalPages));
              setGotoPageInput("");
            }}
          >
            <label htmlFor={inputId} className="whitespace-nowrap text-[0.8125rem] text-[#8c9097] dark:text-white/60">
              Go to page
            </label>
            <input
              id={inputId}
              type="number"
              inputMode="numeric"
              min={1}
              max={safeTotalPages}
              value={gotoPageInput}
              onChange={(e) => setGotoPageInput(e.currentTarget.value)}
              placeholder={String(page)}
              aria-describedby={hintId}
              className={`ti-form-control form-control-sm ${compactControls ? "!min-w-[2.75rem] !w-[3.25rem] !max-w-[3.5rem] !h-8 !py-0 !px-1" : "!w-[4.5rem] !py-[0.375rem]"}`}
            />
            <span id={hintId} className="sr-only">
              Enter a page number between 1 and {safeTotalPages}
            </span>
            <button
              type="submit"
              className={`ti-btn ti-btn-primary ti-btn-sm !mb-0 ${compactControls ? "!h-8 !py-0" : "!py-[0.375rem]"}`}
            >
              Go
            </button>
          </form>
        )}
      </div>
      ) : null}
    </div>
  );
}
