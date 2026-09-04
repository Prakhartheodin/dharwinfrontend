"use client";

import React, { useId, useState } from "react";
import { buildPaginationItems, getPaginationRange } from "@/shared/lib/pagination-items";

export type ListPaginationProps = {
  page: number;
  totalPages: number;
  totalResults: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  ariaLabel?: string;
  gotoInputId?: string;
  className?: string;
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
  ariaLabel = "Page navigation",
  gotoInputId,
  className,
}: ListPaginationProps) {
  const autoId = useId();
  const inputId = gotoInputId ?? `${autoId}-goto-page`;
  const hintId = `${inputId}-hint`;
  const [gotoPageInput, setGotoPageInput] = useState("");
  const { start, end } = getPaginationRange(totalResults, page, pageSize);
  const safeTotalPages = Math.max(0, totalPages);
  const atStart = page <= 1;
  const atEnd = page >= safeTotalPages || safeTotalPages === 0;

  return (
    <div className={`flex flex-wrap items-center gap-4 ${className ?? ""}`}>
      <div>
        Showing {start} to {end} of {totalResults} entries{" "}
        <i className="bi bi-arrow-right ms-2 font-semibold" />
      </div>
      <div className="ms-auto flex flex-wrap items-center gap-x-4 gap-y-2">
        <nav aria-label={ariaLabel} className="pagination-style-4">
          <ul className="ti-pagination mb-0">
            <li className={`page-item ${atStart ? "disabled" : ""}`}>
              <button
                type="button"
                className="page-link px-3 py-[0.375rem]"
                onClick={() => onPageChange(page - 1)}
                disabled={atStart}
              >
                Prev
              </button>
            </li>
            {buildPaginationItems(page - 1, safeTotalPages).map((item, idx) =>
              item.type === "ellipsis" ? (
                <li key={`ellipsis-${idx}`} className="page-item disabled" aria-hidden="true">
                  <span className="page-link px-3 py-[0.375rem]">…</span>
                </li>
              ) : (
                <li
                  key={item.page}
                  className={`page-item ${page === item.page + 1 ? "active" : ""}`}
                >
                  <button
                    type="button"
                    className="page-link px-3 py-[0.375rem]"
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
                className="page-link px-3 py-[0.375rem] text-primary"
                onClick={() => onPageChange(page + 1)}
                disabled={atEnd}
              >
                Next
              </button>
            </li>
          </ul>
        </nav>

        {safeTotalPages > 1 && (
          <form
            className="flex items-center gap-2"
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
              className="ti-form-control form-control-sm !w-[4.5rem] !py-[0.375rem]"
            />
            <span id={hintId} className="sr-only">
              Enter a page number between 1 and {safeTotalPages}
            </span>
            <button type="submit" className="ti-btn ti-btn-primary ti-btn-sm !mb-0 !py-[0.375rem]">
              Go
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
