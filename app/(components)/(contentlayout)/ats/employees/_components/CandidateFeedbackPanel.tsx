"use client";

import React from "react";
import { getCandidateRecruiterFeedback, mapCandidateToDisplay } from "@/shared/lib/api/employees";

type CandidateDisplay = ReturnType<typeof mapCandidateToDisplay>;

/** Text buttons must not use `ti-btn-sm` — theme sets it to 1.75rem icon-only squares. */
const TEXT_BTN =
  "ti-btn !mb-0 !h-auto !w-auto !min-h-[2.5rem] !px-4 whitespace-nowrap inline-flex items-center justify-center gap-1.5";

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Rating ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <i
          key={n}
          className={`text-base ${n <= rating ? "ri-star-fill text-amber-500" : "ri-star-line text-gray-300 dark:text-white/25"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

function FeedbackActionButton({
  hasFeedback,
  onClick,
  className = "",
}: {
  hasFeedback: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={`${TEXT_BTN} ti-btn-warning ${className}`}
      onClick={onClick}
    >
      <i className={`${hasFeedback ? "ri-edit-line" : "ri-add-line"} text-base`} aria-hidden />
      <span>{hasFeedback ? "Update feedback" : "Add feedback"}</span>
    </button>
  );
}

function SectionCard({
  icon,
  iconClassName,
  title,
  description,
  action,
  children,
}: {
  icon: string;
  iconClassName: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white dark:border-defaultborder/10 dark:bg-black/20">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${iconClassName}`}
            aria-hidden
          >
            <i className={`${icon} text-lg`} />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="mb-0 text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
            {description ? (
              <p className="mb-0 mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-gray-400">{description}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
      </div>
      <div className="px-4 py-4 sm:px-5">{children}</div>
    </section>
  );
}

export default function CandidateFeedbackPanel({
  candidate,
  onOpenNotes,
  onOpenFeedback,
}: {
  candidate: CandidateDisplay | null;
  onOpenNotes: () => void;
  onOpenFeedback: () => void;
}) {
  if (!candidate) return null;

  const { feedback, rating, notes } = getCandidateRecruiterFeedback(candidate);
  const hasFeedback = feedback.length > 0;
  const noteCount = notes.length;

  return (
    <div className="space-y-4">
      <SectionCard
        icon="ri-feedback-line"
        iconClassName="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        title="Recruiter feedback"
        description={
          hasFeedback
            ? "Latest rating and comments from your team."
            : "Add a rating and short summary for this employee."
        }
        action={
          hasFeedback ? (
            <FeedbackActionButton hasFeedback onClick={onOpenFeedback} className="w-full sm:w-auto" />
          ) : null
        }
      >
        {hasFeedback ? (
          <article className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-4 dark:border-amber-500/15 dark:bg-amber-500/5">
            {rating != null && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <RatingStars rating={rating} />
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                  {rating}/5
                </span>
              </div>
            )}
            <p className="mb-0 whitespace-pre-wrap text-sm leading-relaxed text-gray-800 dark:text-gray-200">
              {feedback}
            </p>
          </article>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/70 px-4 py-5 text-center dark:border-defaultborder/15 dark:bg-black/10">
            <i className="ri-feedback-line mb-2 text-2xl text-gray-400 dark:text-gray-500" aria-hidden />
            <p className="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">No feedback yet</p>
            <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
              Capture performance notes or interview impressions here.
            </p>
            <FeedbackActionButton hasFeedback={false} onClick={onOpenFeedback} className="mx-auto" />
          </div>
        )}
      </SectionCard>

      <SectionCard
        icon="ri-file-text-line"
        iconClassName="bg-primary/10 text-primary"
        title="Notes"
        description={
          noteCount > 0
            ? `${noteCount} note${noteCount === 1 ? "" : "s"} saved on this employee.`
            : "Row actions and the notes panel keep a full history."
        }
        action={
          noteCount > 0 ? (
            <span className="inline-flex w-full items-center justify-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary sm:w-auto sm:justify-start">
              {noteCount} saved
            </span>
          ) : null
        }
      >
        {noteCount > 0 ? (
          <ul className="mb-4 max-h-52 space-y-2 overflow-y-auto">
            {notes.map((note, idx) => {
              const author =
                typeof note.addedBy === "object" && note.addedBy?.name
                  ? note.addedBy.name
                  : "Recruiter";
              return (
                <li
                  key={`${note.addedAt ?? idx}-${idx}`}
                  className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 dark:border-defaultborder/10 dark:bg-black/30"
                >
                  <p className="mb-1 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">{note.note}</p>
                  <p className="mb-0 text-xs text-gray-500 dark:text-gray-400">
                    {author}
                    {note.addedAt ? ` · ${new Date(note.addedAt).toLocaleString()}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Use the notes panel to add, review, and manage employee notes.
          </p>
        )}

        <button
          type="button"
          className={`${TEXT_BTN} ti-btn-primary w-full sm:w-auto`}
          onClick={onOpenNotes}
        >
          <i className="ri-external-link-line text-base" aria-hidden />
          <span>Open notes panel</span>
        </button>
      </SectionCard>
    </div>
  );
}
