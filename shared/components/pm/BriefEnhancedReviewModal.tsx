"use client";

import React, { useCallback, useEffect, useState } from "react";

export type BriefFeedbackRating = "up" | "down";

export type BriefRegenerateInput = {
  refinementInstructions: string;
  feedbackRating: BriefFeedbackRating | null;
  feedbackComment: string;
};

type BriefEnhancedReviewModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  contextLines: string[];
  emptyEditorExplain: boolean;
  plainCurrent: string;
  plainSuggestion: string;
  busy: boolean;
  error?: string | null;
  onApply: () => void;
  onRegenerate: (input: BriefRegenerateInput) => Promise<void>;
};

export function BriefEnhancedReviewModal({
  open,
  onClose,
  title = "Review enhanced brief",
  contextLines,
  emptyEditorExplain,
  plainCurrent,
  plainSuggestion,
  busy,
  error = null,
  onApply,
  onRegenerate,
}: BriefEnhancedReviewModalProps) {
  const [refinement, setRefinement] = useState("");
  const [feedbackRating, setFeedbackRating] = useState<BriefFeedbackRating | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");

  useEffect(() => {
    if (!open) {
      setRefinement("");
      setFeedbackRating(null);
      setFeedbackComment("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || busy) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const handleRegenerate = useCallback(async () => {
    await onRegenerate({
      refinementInstructions: refinement.trim(),
      feedbackRating,
      feedbackComment: feedbackComment.trim(),
    });
  }, [onRegenerate, refinement, feedbackRating, feedbackComment]);

  if (!open) return null;

  const ctxBlock =
    contextLines.length > 0 ? (
      <p className="mb-2 text-start text-[0.72rem] leading-snug text-slate-500 dark:text-white/55">
        {contextLines.map((line, i) => (
          <React.Fragment key={i}>
            {i > 0 ? " · " : null}
            {line}
          </React.Fragment>
        ))}
      </p>
    ) : (
      <p className="mb-2 text-start text-[0.72rem] leading-snug text-slate-500 dark:text-white/55">
        No Overview fields filled yet — the model only sees an empty editor and will draft a generic starter brief.
      </p>
    );

  const oldPanel =
    plainCurrent.length > 0 ? (
      <span className="whitespace-pre-wrap break-words">{plainCurrent}</span>
    ) : (
      <span className="italic text-slate-400">(Empty editor — compare with context above.)</span>
    );

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pm-brief-review-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[1px] motion-reduce:backdrop-blur-none"
        aria-label="Close dialog"
        onClick={() => {
          if (!busy) onClose();
        }}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-[960px] flex-col overflow-hidden rounded-2xl border border-defaultborder/80 bg-bodybg shadow-2xl dark:border-white/10 motion-safe:animate-pm-panel-in motion-reduce:animate-none">
        <div className="flex items-start justify-between gap-3 border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/95 to-white px-4 py-3 dark:border-white/10 dark:from-white/[0.04] dark:to-transparent sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2 id="pm-brief-review-title" className="m-0 text-[1.05rem] font-semibold text-defaulttextcolor">
              {title}
            </h2>
            <div className="mt-1">{ctxBlock}</div>
          </div>
          <button
            type="button"
            className="ti-btn ti-btn-light !mb-0 shrink-0 rounded-xl !py-1.5 !px-2.5"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <i className="ri-close-line text-lg" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {emptyEditorExplain ? (
            <p className="mb-3 rounded-md border border-indigo-500/20 bg-indigo-500/[0.08] px-2.5 py-2 text-start text-[0.72rem] leading-snug text-indigo-900/90 dark:border-indigo-400/25 dark:bg-indigo-500/10 dark:text-indigo-100/90">
              The box is empty, so the server sends your <strong>Overview</strong> labels (above) plus empty HTML. The
              model is instructed to write an honest starter brief from that context — not to invent sponsors or
              dates.
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
            <div>
              <div className="mb-1 text-start text-[0.78rem] font-semibold text-slate-700 dark:text-white/85">
                Current brief
              </div>
              <div className="max-h-[min(40vh,320px)] overflow-auto rounded-xl border border-slate-200/90 bg-slate-50 px-3 py-2.5 text-start text-[0.8125rem] leading-relaxed text-defaulttextcolor dark:border-white/10 dark:bg-black/25">
                {oldPanel}
              </div>
            </div>
            <div>
              <div className="mb-1 text-start text-[0.78rem] font-semibold text-teal-800 dark:text-teal-300/95">
                AI suggestion
              </div>
              <div className="max-h-[min(40vh,320px)] overflow-auto rounded-xl border border-teal-500/35 bg-teal-500/[0.06] px-3 py-2.5 text-start text-[0.8125rem] leading-relaxed text-defaulttextcolor dark:border-teal-400/25 dark:bg-teal-950/25">
                <span className="whitespace-pre-wrap break-words">{plainSuggestion}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03] sm:px-4 sm:py-4">
            <div>
              <label htmlFor="pm-brief-refine" className="mb-1 block text-[0.78rem] font-semibold text-defaulttextcolor">
                Instructions for next version{" "}
                <span className="font-normal text-muted dark:text-white/45">(optional)</span>
              </label>
              <textarea
                id="pm-brief-refine"
                className="form-control min-h-[88px] resize-y text-[0.8125rem]"
                placeholder="e.g. Add a risks section, keep bullets short, emphasize integrations and RBAC…"
                value={refinement}
                onChange={(e) => setRefinement(e.target.value.slice(0, 4000))}
                disabled={busy}
                maxLength={4000}
              />
              <p className="mb-0 mt-1 text-end text-[0.65rem] text-muted dark:text-white/40">
                {refinement.length}/4000
              </p>
            </div>

            <div>
              <span className="mb-1.5 block text-[0.78rem] font-semibold text-defaulttextcolor">
                Quick feedback <span className="font-normal text-muted dark:text-white/45">(optional)</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[0.8125rem] font-medium transition-colors ${
                    feedbackRating === "up"
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200"
                      : "border-defaultborder/80 bg-white hover:border-emerald-500/35 dark:bg-black/20"
                  }`}
                  onClick={() => setFeedbackRating((r) => (r === "up" ? null : "up"))}
                  disabled={busy}
                  aria-pressed={feedbackRating === "up"}
                >
                  <i className="ri-thumb-up-line" aria-hidden />
                  Helpful
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[0.8125rem] font-medium transition-colors ${
                    feedbackRating === "down"
                      ? "border-rose-500/50 bg-rose-500/12 text-rose-800 dark:text-rose-200"
                      : "border-defaultborder/80 bg-white hover:border-rose-500/35 dark:bg-black/20"
                  }`}
                  onClick={() => setFeedbackRating((r) => (r === "down" ? null : "down"))}
                  disabled={busy}
                  aria-pressed={feedbackRating === "down"}
                >
                  <i className="ri-thumb-down-line" aria-hidden />
                  Needs work
                </button>
              </div>
              <label htmlFor="pm-brief-feedback-comment" className="sr-only">
                Optional feedback comment
              </label>
              <textarea
                id="pm-brief-feedback-comment"
                className="form-control mt-2 min-h-[64px] resize-y text-[0.8125rem]"
                placeholder="What felt off? (tone, missing sections, too generic…)"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value.slice(0, 800))}
                disabled={busy}
                maxLength={800}
              />
            </div>
          </div>

          {error ? (
            <p className="mt-3 rounded-lg border border-danger/25 bg-danger/10 px-3 py-2 text-[0.8125rem] text-danger" role="alert">
              {error}
            </p>
          ) : null}

          <p className="mt-3 text-start text-[0.7rem] text-muted dark:text-white/45">
            Preview is plain text (formatting may differ slightly in the editor after you apply).
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-defaultborder/60 bg-[rgb(var(--default-background))]/40 px-4 py-3 dark:border-white/10 dark:bg-white/[0.02] sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <button type="button" className="ti-btn ti-btn-light !mb-0 w-full sm:w-auto" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
            <button
              type="button"
              className="ti-btn ti-btn-outline-primary !mb-0 w-full sm:w-auto"
              onClick={() => void handleRegenerate()}
              disabled={busy}
            >
              {busy ? (
                <>
                  <i className="ri-loader-4-line me-1 inline-block animate-spin motion-reduce:animate-none" aria-hidden />
                  Regenerating…
                </>
              ) : (
                <>
                  <i className="ri-refresh-line me-1" aria-hidden />
                  Regenerate
                </>
              )}
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-primary !mb-0 w-full sm:w-auto"
              onClick={onApply}
              disabled={busy}
            >
              <i className="ri-check-line me-1" aria-hidden />
              Use AI version
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
