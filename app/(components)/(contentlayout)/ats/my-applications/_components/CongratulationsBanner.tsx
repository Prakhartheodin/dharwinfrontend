"use client";

import Link from "next/link";
import {
  formatDisplayDate,
  type SelectedApplicationItem,
} from "@/shared/lib/ats/candidateSelection";

function TrophyIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10" />
      <path d="M17 4v3a5 5 0 0 1-10 0V4" />
      <path d="M5 4H3v1a4 4 0 0 0 4 4" />
      <path d="M19 4h2v1a4 4 0 0 1-4 4" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export default function CongratulationsBanner({ items }: { items: SelectedApplicationItem[] }) {
  if (items.length === 0) return null;

  const pluralSuffix = items.length === 1 ? "" : "s";

  return (
    <section
      className="relative mb-6 overflow-hidden rounded-2xl border border-primary/30 shadow-lg shadow-primary/10 ring-1 ring-primary/10 dark:border-primary/40 dark:shadow-primary/20 dark:ring-primary/20"
      aria-label="Interview selection congratulations"
      data-testid="congratulations-banner"
    >
      {/* Dark purple hero gradient — intentional in both light and dark page themes */}
      <div
        className="absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(55% 100% at 0% 0%, rgba(139,92,246,0.45) 0%, rgba(139,92,246,0) 55%), radial-gradient(60% 110% at 100% 100%, rgba(99,102,241,0.35) 0%, rgba(99,102,241,0) 60%), linear-gradient(135deg, #3b1d6e 0%, #1e1035 45%, #120a22 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-violet-400/20 blur-3xl motion-safe:animate-pulse motion-reduce:animate-none"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-8 h-36 w-36 rounded-full bg-indigo-400/15 blur-3xl motion-safe:animate-pulse motion-reduce:animate-none motion-safe:[animation-delay:600ms]"
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:gap-8 lg:p-8 min-w-0">
        {/* Trophy visual */}
        <div className="flex shrink-0 justify-center lg:justify-start">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/25 via-amber-300/15 to-transparent ring-4 ring-white/15 backdrop-blur-sm sm:h-24 sm:w-24"
            aria-hidden
          >
            <TrophyIcon className="h-10 w-10 text-amber-300 sm:h-12 sm:w-12" />
          </div>
        </div>

        {/* Headline + body */}
        <div className="min-w-0 flex-1 text-center lg:text-left">
          <p className="text-lg font-semibold text-white/95 sm:text-xl">Congratulations!</p>
          <h2 className="mt-1 text-xl font-bold text-emerald-400 sm:text-2xl">You&apos;ve Been Selected!</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-white/70 sm:text-base lg:mx-0">
            Great news! You&apos;ve been selected for the position{pluralSuffix} listed here. Our team
            will reach out with your next steps soon — keep an eye on your inbox.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
            <span
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary via-violet-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/30"
              role="img"
              aria-label="Well Done! Keep Shining"
            >
              <TrophyIcon className="h-4 w-4 text-amber-200" />
              Well Done! Keep Shining
            </span>
          </div>
        </div>

        {/* Selected positions */}
        <aside className="min-w-0 shrink-0 lg:w-72 xl:w-80">
          <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-white/50 lg:text-left">
            Selected position{pluralSuffix}
          </h3>
          <ul
            className="flex flex-col gap-2.5 min-w-0"
            data-testid="congratulations-selected-list"
          >
            {items.map((item) => {
              const dateLabel = formatDisplayDate(item.relevantDate);
              return (
                <li
                  key={item.applicationId}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 backdrop-blur-sm min-w-0"
                  data-testid="congratulations-selected-item"
                >
                  <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">
                      {item.jobId ? (
                        <Link
                          href={`/ats/browse-jobs/${item.jobId}`}
                          className="hover:text-emerald-300 transition-colors"
                        >
                          {item.jobTitle}
                        </Link>
                      ) : (
                        item.jobTitle
                      )}
                    </p>
                    <p className="truncate text-sm text-white/60">{item.company}</p>
                    {dateLabel && (
                      <p className="mt-0.5 text-xs text-white/40">{dateLabel}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </section>
  );
}
