"use client";

interface StaleDataBannerProps {
  loading: boolean;
  onRefresh: () => void;
}

export function StaleDataBanner({ loading, onRefresh }: StaleDataBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-200/90 bg-amber-50/95 px-4 py-3.5 shadow-sm sm:flex-row sm:items-center sm:gap-4 dark:border-amber-800/70 dark:bg-amber-950/35"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-100"
          aria-hidden
        >
          <i className="ri-loop-left-line text-lg" />
        </span>
        <p className="text-sm font-medium leading-snug text-amber-950 dark:text-amber-50">
          New referral data may be available.{" "}
          <span className="text-amber-800/90 dark:text-amber-100/90 font-normal">
            Refresh the list to see the latest counts and rows.
          </span>
        </p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex w-full shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-amber-800/20 bg-white px-4 py-2.5 text-sm font-semibold text-amber-950 shadow-sm transition-colors hover:bg-amber-100/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 disabled:pointer-events-none disabled:opacity-50 dark:border-amber-600/35 dark:bg-amber-950/50 dark:text-amber-50 dark:hover:bg-amber-900/55 dark:focus-visible:ring-amber-400 dark:focus-visible:ring-offset-amber-950/50 sm:w-auto sm:self-center sm:py-2"
      >
        <i className="ri-refresh-line text-base shrink-0" aria-hidden />
        Refresh now
      </button>
    </div>
  );
}
