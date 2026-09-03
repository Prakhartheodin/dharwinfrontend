"use client";

import Link from "next/link";
import {
  formatDisplayDate,
  type SelectedApplicationItem,
} from "@/shared/lib/ats/candidateSelection";
import ApplicationStatusBadge from "./ApplicationStatusBadge";

export default function CongratulationsBanner({ items }: { items: SelectedApplicationItem[] }) {
  if (items.length === 0) return null;

  return (
    <section
      className="mb-6 rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-500/15 dark:via-emerald-500/5 p-5 sm:p-6 shadow-sm overflow-hidden"
      aria-label="Interview selection congratulations"
      data-testid="congratulations-banner"
    >
      <div className="flex flex-col gap-4 min-w-0">
        <div className="min-w-0">
          <p className="text-lg sm:text-xl font-semibold text-emerald-800 dark:text-emerald-300">
            Congratulations! 🎉
          </p>
          <h2 className="text-base sm:text-lg font-semibold text-defaulttextcolor dark:text-white mt-1">
            You&apos;ve Been Selected!
          </h2>
          <p className="text-sm text-defaulttextcolor/70 dark:text-white/60 mt-2 max-w-2xl">
            Great news! You&apos;ve been selected for the position{items.length === 1 ? "" : "s"} below.
          </p>
        </div>

        <ul className="flex flex-col gap-3 min-w-0" data-testid="congratulations-selected-list">
          {items.map((item) => {
            const dateLabel = formatDisplayDate(item.relevantDate);
            return (
              <li
                key={item.applicationId}
                className="rounded-xl border border-emerald-500/20 bg-white/80 dark:bg-bodybg/80 px-4 py-3 min-w-0"
                data-testid="congratulations-selected-item"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-defaulttextcolor dark:text-white truncate">
                      {item.jobId ? (
                        <Link
                          href={`/ats/browse-jobs/${item.jobId}`}
                          className="hover:text-primary transition-colors"
                        >
                          {item.jobTitle}
                        </Link>
                      ) : (
                        item.jobTitle
                      )}
                    </p>
                    <p className="text-sm text-defaulttextcolor/70 dark:text-white/60 truncate">
                      {item.company}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <ApplicationStatusBadge label={item.selectionStatus} />
                    {dateLabel && (
                      <span className="text-xs text-defaulttextcolor/50 dark:text-white/45 whitespace-nowrap">
                        {dateLabel}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
