"use client";

type BadgeStyle = { bg: string; text: string; border: string };

/**
 * The congratulations banner's pill is the reference: `bg-{hue}-500/10`, `text-{hue}-700`
 * (`{hue}-400` in dark) and `border-{hue}-500/20`. Every status reuses that recipe with its own
 * hue so the banner and the application cards render the same chip for the same application.
 *
 * Keyed on the badge's leading label, not the lifecycle stage, so any surface holding a
 * candidate-facing label can style it without also carrying the stage.
 *
 * `leading-5` is explicit because this project replaces `theme.fontSize` with bare strings, so
 * `text-sm` emits a font-size with NO paired line-height; without it the pill's height depends on
 * whatever line-height it inherits.
 *
 * Never add `max-w-full` here: app/globals.scss applies `padding: 0 !important` to every
 * non-form-control element carrying that class, which silently strips the pill's padding.
 */
const BADGE_STYLE: Record<string, BadgeStyle> = {
  Applied: { bg: "bg-slate-500/10", text: "text-slate-700 dark:text-slate-400", border: "border-slate-500/20" },
  Screening: { bg: "bg-sky-500/10", text: "text-sky-700 dark:text-sky-400", border: "border-sky-500/20" },
  Shortlisted: { bg: "bg-cyan-500/10", text: "text-cyan-700 dark:text-cyan-400", border: "border-cyan-500/20" },
  Interview: { bg: "bg-violet-500/10", text: "text-violet-700 dark:text-violet-400", border: "border-violet-500/20" },
  Offer: { bg: "bg-emerald-500/10", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-500/20" },
  "Pre-boarding": { bg: "bg-teal-500/10", text: "text-teal-700 dark:text-teal-400", border: "border-teal-500/20" },
  Onboarding: { bg: "bg-indigo-500/10", text: "text-indigo-700 dark:text-indigo-400", border: "border-indigo-500/20" },
  /** Terminal success — same hue as Offer, carried a shade heavier. */
  Hired: { bg: "bg-emerald-600/15", text: "text-emerald-800 dark:text-emerald-300 font-semibold", border: "border-emerald-500/30" },
  Deferred: { bg: "bg-slate-500/10", text: "text-slate-700 dark:text-slate-400", border: "border-slate-500/20" },
  Rejected: { bg: "bg-rose-500/10", text: "text-rose-700 dark:text-rose-400", border: "border-rose-500/20" },
};

/** Raw application statuses that reach the badge when no Offer/Placement exists yet. */
const LABEL_ALIASES: Record<string, string> = { Offered: "Offer" };

/** Compound labels arrive as "Outcome · Stage" (e.g. "Rejected · Onboarding"). */
export function splitBadgeLabel(label: string): [string, string | null] {
  const i = label.indexOf(" \u00b7 ");
  return i === -1 ? [label, null] : [label.slice(0, i), label.slice(i + 3)];
}

export function badgeStyleForLabel(label: string): BadgeStyle {
  const head = splitBadgeLabel(label)[0];
  return BADGE_STYLE[LABEL_ALIASES[head] ?? head] ?? BADGE_STYLE.Applied;
}

export default function ApplicationStatusBadge({
  label,
  testId,
}: {
  label: string;
  testId?: string;
}) {
  const style = badgeStyleForLabel(label);

  return (
    <span
      data-testid={testId}
      title={label}
      className={`inline-flex w-fit items-center whitespace-nowrap px-4 py-2 rounded-lg text-sm leading-5 font-semibold border ${style.bg} ${style.text} ${style.border}`}
    >
      {label}
    </span>
  );
}
