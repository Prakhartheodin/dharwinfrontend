"use client";

import React from "react";

function ShimmerBar({ className }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-slate-200/80 ring-1 ring-slate-900/[0.04] dark:bg-white/[0.09] dark:ring-white/[0.06] ${className ?? ""}`}
    >
      <div
        className="absolute inset-y-0 w-3/5 bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20 animate-external-jobs-shimmer"
        aria-hidden
      />
    </div>
  );
}

type TableLoaderProps = {
  title: string;
  hint?: string;
};

/** Full-height loader for the external jobs table area (search / saved initial fetch). */
export function ExternalJobsTableLoader({ title, hint }: TableLoaderProps) {
  return (
    <div
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-14 sm:py-16"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-[0.22]"
        style={{
          backgroundImage: `radial-gradient(ellipse 85% 55% at 50% -5%, rgb(var(--primary) / 0.16), transparent 58%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.2] dark:opacity-[0.08]"
        style={{
          backgroundImage: `linear-gradient(105deg, transparent 0%, rgb(var(--primary) / 0.04) 45%, transparent 70%)`,
        }}
        aria-hidden
      />

      <div className="relative z-[1] flex flex-col items-center">
        <div className="relative flex h-[4.75rem] w-[4.75rem] items-center justify-center">
          <span
            className="absolute inset-[-3px] rounded-full border-2 border-dashed border-primary/30 motion-safe:animate-external-jobs-orbit dark:border-primary/40"
            aria-hidden
          />
          <span
            className="absolute inset-1 rounded-full border border-primary/20 motion-safe:animate-spin-slow dark:border-primary/25"
            aria-hidden
          />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-[0_10px_36px_-14px_rgb(var(--primary)/0.5)] ring-1 ring-slate-900/[0.06] dark:bg-bodybg dark:shadow-[0_12px_40px_-12px_rgb(var(--primary)/0.35)] dark:ring-white/10">
            <i className="ri-radar-line text-[1.65rem] text-primary motion-safe:animate-pulse" aria-hidden />
          </span>
        </div>

        <p className="font-Montserrat mt-8 text-center text-[0.65rem] font-bold uppercase tracking-[0.28em] text-textmuted dark:text-white/42">
          {title}
        </p>
        {hint ? (
          <p className="mt-2 max-w-sm text-center text-sm leading-relaxed text-textmuted/95 dark:text-white/48">
            {hint}
          </p>
        ) : null}

        <div className="mt-10 w-full max-w-lg space-y-2.5" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-defaultborder/45 bg-white/65 px-3 py-3 dark:border-white/[0.07] dark:bg-white/[0.035]"
            >
              <ShimmerBar className="h-3.5 flex-1 max-w-[46%]" />
              <ShimmerBar className="h-3.5 w-[24%]" />
              <ShimmerBar className="h-3.5 w-[12%] max-sm:hidden" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Compact spinner for primary buttons (search, load more). */
export function ExternalJobsButtonSpinner({ className }: { className?: string }) {
  return (
    <span className={`relative inline-flex h-[1.05rem] w-[1.05rem] shrink-0 ${className ?? ""}`} aria-hidden>
      <span className="absolute inset-0 rounded-full border-2 border-current/20 border-t-current motion-safe:animate-spin" />
    </span>
  );
}
