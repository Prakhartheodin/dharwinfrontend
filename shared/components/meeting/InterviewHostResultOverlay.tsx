"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  updateMeeting,
  type InterviewScorecard,
  type Meeting,
  type RubricCriterionId,
  type UpdateMeetingPayload,
} from "@/shared/lib/api/meetings";

/**
 * Interview rubric (PRD 5.4). Ids MUST match backend src/constants/interviewRubric.js.
 */
const RUBRIC_CRITERIA: ReadonlyArray<{ id: RubricCriterionId; label: string }> = [
  { id: "technical", label: "Technical Skills" },
  { id: "communication", label: "Communication" },
  { id: "problemSolving", label: "Problem Solving" },
  { id: "cultureFit", label: "Culture Fit" },
  { id: "experience", label: "Relevant Experience" },
];

const RUBRIC_SCALE = [1, 2, 3, 4, 5] as const;

type RubricRatingMap = Partial<Record<RubricCriterionId, number>>;

function scorecardToRatingMap(scorecard?: InterviewScorecard): RubricRatingMap {
  const map: RubricRatingMap = {};
  for (const r of scorecard?.ratings || []) {
    if (r?.criterion) map[r.criterion] = r.rating;
  }
  return map;
}

function rubricAverage(ratings: RubricRatingMap): number | null {
  const values = RUBRIC_CRITERIA.map((c) => ratings[c.id]).filter((v): v is number => typeof v === "number");
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function meetingRecordId(meeting: Meeting): string {
  return String(meeting.id ?? meeting._id ?? meeting.meetingId ?? "");
}

export interface InterviewHostResultOverlayProps {
  meeting: Meeting;
  /** Called after save or when the host skips without saving. */
  onDone: () => void;
  variant?: "default" | "obsidian";
}

export default function InterviewHostResultOverlay({
  meeting,
  onDone,
  variant = "default",
}: InterviewHostResultOverlayProps) {
  const meetingId = meetingRecordId(meeting);
  const position = meeting.title || meeting.jobPosition || "Interview";
  const candidateName = meeting.candidate?.name || "Candidate";

  const [selected, setSelected] = useState<"pending" | "selected" | "rejected">(
    meeting.interviewResult || "pending"
  );
  const [ratings, setRatings] = useState<RubricRatingMap>(() => scorecardToRatingMap(meeting.interviewScorecard));
  const [comment, setComment] = useState(meeting.interviewScorecard?.comment || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setRubricRating = useCallback((criterion: RubricCriterionId, rating: number) => {
    setRatings((prev) => {
      const next = { ...prev };
      if (next[criterion] === rating) delete next[criterion];
      else next[criterion] = rating;
      return next;
    });
  }, []);

  const avg = useMemo(() => rubricAverage(ratings), [ratings]);
  const scoredCount = Object.keys(ratings).length;

  const handleSave = async () => {
    if (!meetingId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const ratingRows = RUBRIC_CRITERIA.filter((c) => typeof ratings[c.id] === "number").map((c) => ({
        criterion: c.id,
        rating: ratings[c.id] as number,
      }));
      const trimmedComment = comment.trim();
      const hadScorecard =
        Boolean(meeting.interviewScorecard?.ratings?.length) || Boolean(meeting.interviewScorecard?.comment);
      const payload: UpdateMeetingPayload = { interviewResult: selected };
      if (ratingRows.length || trimmedComment || hadScorecard) {
        payload.interviewScorecard = { ratings: ratingRows, comment: trimmedComment };
      }
      await updateMeeting(meetingId, payload);
      onDone();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Could not save the interview result.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const isObsidian = variant === "obsidian";

  const shellClass = isObsidian
    ? "fixed inset-0 z-[200] flex items-center justify-center bg-[#0f1012]/95 p-4"
    : "fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4";

  /** Obsidian meeting UI is always dark; scope `dark:` tokens without relying on `html.dark`. */
  const cardClass = isObsidian
    ? "dark w-full max-w-lg rounded-xl border border-white/15 bg-[#16181c] text-gray-100 shadow-2xl"
    : "w-full max-w-lg rounded-xl border border-defaultborder bg-white shadow-xl dark:border-defaultborder/10 dark:bg-bodybg";

  const headerDividerClass = isObsidian
    ? "border-b border-white/10 px-5 py-4"
    : "border-b border-defaultborder px-5 py-4 dark:border-defaultborder/10";

  const sectionDividerClass = isObsidian
    ? "border-t border-white/10 pt-4"
    : "border-t border-defaultborder pt-4 dark:border-defaultborder/10";

  const footerClass = isObsidian
    ? "flex justify-end gap-2 border-t border-white/10 px-5 py-3"
    : "flex justify-end gap-2 border-t border-defaultborder px-5 py-3 dark:border-defaultborder/10";

  const outcomeOptionClass = (active: boolean) => {
    const base =
      "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-primary/40";
    if (active) {
      return `${base} border-primary bg-primary/10 dark:border-primary dark:bg-primary/20`;
    }
    return `${base} border-defaultborder hover:bg-gray-50 dark:border-white/15 dark:hover:bg-white/5`;
  };

  const ratingButtonClass = (active: boolean) => {
    const base =
      "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#16181c]";
    if (active) {
      return `${base} border-primary bg-primary text-white`;
    }
    return `${base} border-defaultborder text-defaulttextcolor/80 hover:bg-gray-50 dark:border-white/15 dark:text-white/85 dark:hover:bg-white/10`;
  };

  const notesFieldClass = isObsidian
    ? "form-control h-24 w-full resize-none !rounded-md border border-white/15 !bg-[#1a1d22] text-sm !text-white placeholder:!text-white/45 focus:!border-primary/60 focus:!ring-2 focus:!ring-primary/30"
    : "form-control h-24 w-full resize-none !rounded-md text-sm dark:bg-bodybg dark:text-white dark:placeholder:text-white/40";

  const skipButtonClass = isObsidian
    ? "ti-btn min-h-11 !px-4 !py-2 !text-sm font-medium !text-white border border-white/20 !bg-white/10 hover:!bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    : "ti-btn ti-btn-light min-h-11 !px-4 !py-2 !text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  const saveButtonClass = isObsidian
    ? "ti-btn ti-btn-primary min-h-11 !px-4 !py-2 !text-sm !text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#16181c]"
    : "ti-btn ti-btn-primary min-h-11 !px-4 !py-2 !text-sm !text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <div className={shellClass} role="dialog" aria-modal="true" aria-labelledby="host-interview-result-title">
      <div className={cardClass}>
        <div className={headerDividerClass}>
          <h2 id="host-interview-result-title" className="text-lg font-semibold text-defaulttextcolor dark:text-white">
            Set interview result
          </h2>
          <p className="mt-1 text-sm text-textmuted dark:text-white/70">
            {position} · {candidateName}
          </p>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-4">
          <div>
            <p className="mb-2 text-sm font-medium text-defaulttextcolor dark:text-white">Outcome</p>
            <div className="flex flex-col gap-2">
              {(["pending", "selected", "rejected"] as const).map((value) => (
                <label key={value} className={outcomeOptionClass(selected === value)}>
                  <input
                    type="radio"
                    name="hostInterviewResult"
                    value={value}
                    checked={selected === value}
                    onChange={() => setSelected(value)}
                    className="ti-form-radio shrink-0"
                  />
                  <span className="font-medium capitalize text-defaulttextcolor dark:text-white">
                    {value === "pending" ? "Pending" : value === "selected" ? "Selected" : "Rejected"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className={sectionDividerClass}>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-defaulttextcolor dark:text-white">Scorecard</p>
                <p className="text-xs text-textmuted dark:text-white/70">
                  Rate 1–5. Click a rating again to clear it. Optional.
                </p>
              </div>
              {avg !== null && (
                <div className="text-end">
                  <p className="text-lg font-semibold leading-none text-primary">
                    {avg.toFixed(1)}
                    <span className="text-xs font-normal text-textmuted dark:text-white/60"> / 5</span>
                  </p>
                  <p className="mt-1 text-[0.65rem] text-textmuted dark:text-white/60">
                    {scoredCount} of {RUBRIC_CRITERIA.length} scored
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {RUBRIC_CRITERIA.map((criterion) => (
                <div key={criterion.id} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="text-sm text-defaulttextcolor dark:text-white/90">{criterion.label}</span>
                  <div className="flex flex-shrink-0 items-center gap-1" role="group" aria-label={criterion.label}>
                    {RUBRIC_SCALE.map((value) => {
                      const active = ratings[criterion.id] === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={active}
                          aria-label={`${criterion.label}: ${value} of 5`}
                          onClick={() => setRubricRating(criterion.id, value)}
                          className={ratingButtonClass(active)}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <label
                htmlFor="host-interview-scorecard-comment"
                className="form-label mb-1.5 block text-sm font-medium text-defaulttextcolor dark:text-white"
              >
                Notes
              </label>
              <textarea
                id="host-interview-scorecard-comment"
                rows={3}
                maxLength={2000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What stood out, concerns, follow-up questions..."
                className={notesFieldClass}
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <div className={footerClass}>
          <button type="button" className={skipButtonClass} onClick={onDone} disabled={busy}>
            Skip for now
          </button>
          <button
            type="button"
            className={saveButtonClass}
            onClick={() => void handleSave()}
            disabled={busy || !meetingId}
          >
            {busy ? "Saving…" : "Save result"}
          </button>
        </div>
      </div>
    </div>
  );
}
