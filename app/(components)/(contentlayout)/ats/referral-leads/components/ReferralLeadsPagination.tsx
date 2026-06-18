"use client";

interface ReferralLeadsPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
}

/** Windowed page numbers around the current page (max ~5), with ellipses to first/last. */
function pageWindow(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p += 1) out.push(p);
  if (end < totalPages - 1) out.push("…");
  out.push(totalPages);
  return out;
}

export function ReferralLeadsPagination({
  page,
  totalPages,
  total,
  pageSize,
  disabled = false,
  onPageChange,
}: ReferralLeadsPaginationProps) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const go = (p: number) => {
    if (disabled) return;
    const next = Math.min(Math.max(p, 1), totalPages);
    if (next !== page) onPageChange(next);
  };

  return (
    <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Showing <span className="font-medium">{from}</span>–<span className="font-medium">{to}</span> of{" "}
        <span className="font-medium">{total}</span>
      </p>
      <nav aria-label="Referral leads pages">
        <ul className="ti-pagination mb-0 flex flex-wrap items-center gap-1">
          <li className={`page-item ${page <= 1 || disabled ? "disabled" : ""}`}>
            <button
              type="button"
              className="page-link px-3 py-[0.375rem]"
              onClick={() => go(page - 1)}
              disabled={page <= 1 || disabled}
            >
              Prev
            </button>
          </li>
          {pageWindow(page, totalPages).map((p, i) =>
            p === "…" ? (
              <li key={`gap-${i}`} className="page-item disabled">
                <span className="page-link px-3 py-[0.375rem]">…</span>
              </li>
            ) : (
              <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                <button
                  type="button"
                  className="page-link px-3 py-[0.375rem]"
                  aria-current={p === page ? "page" : undefined}
                  onClick={() => go(p)}
                  disabled={disabled}
                >
                  {p}
                </button>
              </li>
            )
          )}
          <li className={`page-item ${page >= totalPages || disabled ? "disabled" : ""}`}>
            <button
              type="button"
              className="page-link px-3 py-[0.375rem]"
              onClick={() => go(page + 1)}
              disabled={page >= totalPages || disabled}
            >
              Next
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
