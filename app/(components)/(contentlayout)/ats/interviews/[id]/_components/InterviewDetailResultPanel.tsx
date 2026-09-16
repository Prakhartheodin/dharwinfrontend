"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  internalTransferEmployee,
  updateMeeting,
  type InterviewScorecard,
  type Meeting,
  type RubricCriterionId,
  type UpdateMeetingPayload,
} from "@/shared/lib/api/meetings";
import { useConfirm } from "@/shared/components/ui/useConfirm";
import { linkageActions, parseInterviewLinkageError } from "../../_components/interviewLinkage";
import type { InterviewLinkageTarget } from "../../_components/InterviewLinkageModal";

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

function scoredByLabel(scorecard?: InterviewScorecard): string | null {
  const by = scorecard?.scoredBy;
  if (!by) return null;
  if (typeof by === "string") return by;
  return by.name || by.email || null;
}

export default function InterviewDetailResultPanel({
  meeting,
  meetingId,
  onSaved,
  onRequestLink,
}: {
  meeting: Meeting;
  meetingId: string;
  onSaved: () => void | Promise<void>;
  onRequestLink: (reason: NonNullable<InterviewLinkageTarget["reason"]>) => void;
}) {
  const { confirm, confirmDialog } = useConfirm();
  const recordId = String(meeting.id ?? meeting._id ?? meetingId);

  const [selected, setSelected] = useState<"pending" | "selected" | "rejected">(
    meeting.interviewResult || "pending"
  );
  const [ratings, setRatings] = useState<RubricRatingMap>(() => scorecardToRatingMap(meeting.interviewScorecard));
  const [comment, setComment] = useState(meeting.interviewScorecard?.comment || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(meeting.interviewResult || "pending");
    setRatings(scorecardToRatingMap(meeting.interviewScorecard));
    setComment(meeting.interviewScorecard?.comment || "");
  }, [meeting]);

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

  const promptLinkInterview = useCallback(
    async (reason: NonNullable<InterviewLinkageTarget["reason"]>) => {
      const canLink = linkageActions({
        candidateId: meeting.candidateId,
        jobPosition: meeting.jobPosition,
        applicationId: meeting.applicationId,
      }).canLink;
      const title =
        reason === "result" ? "Result saved — application not updated" : "Interview is not linked to an application";
      const message =
        reason === "placement"
          ? "Offer and placement needs this interview linked to the candidate's job application."
          : reason === "transfer"
            ? "Internal transfer needs this interview linked to the candidate's job application."
            : "This interview is not linked to a job application, so the application's stage was not changed.";
      const go = await confirm({
        title,
        message: canLink ? `${message} Link an existing application or create one for this interview.` : message,
        confirmLabel: canLink ? "Link application" : "Close",
        cancelLabel: "Not now",
        hideCancel: !canLink,
      });
      if (go && canLink) onRequestLink(reason);
    },
    [confirm, meeting.applicationId, meeting.candidateId, meeting.jobPosition, onRequestLink]
  );

  const doInternalTransfer = useCallback(async () => {
    if (!recordId) return;
    try {
      await internalTransferEmployee(recordId);
      await onSaved();
      await confirm({
        title: "Employee transferred",
        message: (
          <>
            <strong>{meeting.candidate?.name || "The employee"}</strong> has been moved into the interviewed role.
            Their employee record was updated. No new offer or placement was created.
          </>
        ),
        confirmLabel: "Done",
        tone: "success",
        hideCancel: true,
      });
    } catch (err: unknown) {
      if (parseInterviewLinkageError(err)?.errorCode === "interview_not_linked") {
        await promptLinkInterview("transfer");
        return;
      }
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Could not transfer the employee. Please try again.";
      await confirm({
        title: "Transfer failed",
        message: msg,
        confirmLabel: "Close",
        tone: "danger",
        hideCancel: true,
      });
    }
  }, [confirm, meeting.candidate?.name, onSaved, promptLinkInterview, recordId]);

  const handleSave = async () => {
    if (!recordId || busy) return;
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
      const updated = await updateMeeting(recordId, payload);
      await onSaved();

      if (selected === "selected" && updated.moveToPreboardingError) {
        const errMsg = updated.moveToPreboardingError;
        if (updated.moveToPreboardingErrorCode === "interview_not_linked") {
          await promptLinkInterview("placement");
        } else if (/internal transfer/i.test(errMsg)) {
          const go = await confirm({
            title: "Candidate is already an employee",
            message: (
              <>
                Internal moves do not create a new offer or placement. Transfer{" "}
                <strong>{meeting.candidate?.name || "them"}</strong> into the interviewed role instead.
              </>
            ),
            confirmLabel: "Transfer employee",
            cancelLabel: "Not now",
          });
          if (go) await doInternalTransfer();
        } else if (updated.moveToPreboardingErrorCode === "JOB_VACANCIES_FILLED") {
          await confirm({
            title: "All vacancies are filled",
            message: `${errMsg} The interview result was saved — raise the vacancy count on the job, then save this result again.`,
            confirmLabel: "Got it",
            hideCancel: true,
          });
        } else {
          await confirm({
            title: "Marked selected — next step needs attention",
            message: errMsg,
            confirmLabel: "Got it",
            tone: "danger",
            hideCancel: true,
          });
        }
      } else if (updated.linkageWarning === "interview_not_linked") {
        await promptLinkInterview("result");
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Could not update the interview result.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const ended = meeting.status === "ended" || meeting.status === "completed";

  return (
    <>
      {confirmDialog}
      <div className="space-y-6">
      {!ended && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          The interview is still in progress. You can save a provisional result, or wait until the session has ended.
        </p>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-defaulttextcolor dark:text-white">Outcome</p>
        <div className="flex flex-col gap-2 sm:max-w-md">
          {(["pending", "selected", "rejected"] as const).map((value) => (
            <label
              key={value}
              className={`flex min-h-[2.75rem] cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                selected === value
                  ? "border-primary bg-primary/5 dark:bg-primary/10"
                  : "border-defaultborder hover:bg-gray-50 dark:border-defaultborder/10 dark:hover:bg-black/20"
              }`}
            >
              <input
                type="radio"
                name="detailInterviewResult"
                value={value}
                checked={selected === value}
                onChange={() => setSelected(value)}
                className="ti-form-radio"
              />
              <span className="font-medium capitalize text-defaulttextcolor dark:text-white">
                {value === "pending" ? "Pending" : value === "selected" ? "Selected" : "Rejected"}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="border-t border-defaultborder pt-5 dark:border-defaultborder/10">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-defaulttextcolor dark:text-white">Scorecard</p>
            <p className="text-xs text-textmuted dark:text-white/60">
              Rate 1 to 5. Click a rating again to clear it. Optional.
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
            <div key={criterion.id} className="flex flex-wrap items-center justify-between gap-3 py-1.5">
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
                      className={`h-9 w-9 rounded-md border text-xs font-medium transition-colors ${
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-defaultborder text-defaulttextcolor/70 hover:bg-gray-50 dark:border-defaultborder/10 dark:text-white/60 dark:hover:bg-black/20"
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <label
            htmlFor="detail-interview-scorecard-comment"
            className="form-label mb-1.5 block text-sm font-medium text-defaulttextcolor dark:text-white"
          >
            Notes
          </label>
          <textarea
            id="detail-interview-scorecard-comment"
            rows={4}
            maxLength={2000}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What stood out, concerns, follow-up questions..."
            className="form-control h-28 w-full resize-none !rounded-md text-sm"
          />
        </div>

        {scoredByLabel(meeting.interviewScorecard) && (
          <p className="mt-2 text-xs text-defaulttextcolor/60 dark:text-white/60">
            Last scored by {scoredByLabel(meeting.interviewScorecard)}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2 border-t border-defaultborder pt-4 dark:border-defaultborder/10">
        <button
          type="button"
          className="ti-btn ti-btn-primary min-h-[2.75rem] !px-5 !py-2 !text-sm"
          onClick={() => void handleSave()}
          disabled={busy || !recordId}
        >
          {busy ? "Saving…" : "Save result"}
        </button>
      </div>
    </div>
    </>
  );
}
