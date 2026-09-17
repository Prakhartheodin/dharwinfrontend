"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  internalTransferEmployee,
  updateMeeting,
  type Meeting,
  type UpdateMeetingPayload,
} from "@/shared/lib/api/meetings";
import { moveApplicationToOffer } from "@/shared/lib/api/jobApplications";
import { useConfirm } from "@/shared/components/ui/useConfirm";
import { useFeaturePermissions } from "@/shared/hooks/use-feature-permissions";
import RubricEvaluationForm from "@/shared/components/interview/RubricEvaluationForm";
import { linkageActions, parseInterviewLinkageError } from "../../_components/interviewLinkage";
import type { InterviewLinkageTarget } from "../../_components/InterviewLinkageModal";

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
  const { canCreate: canMoveToOffer } = useFeaturePermissions("ats.offers");
  const recordId = String(meeting.id ?? meeting._id ?? meetingId);

  const [selected, setSelected] = useState<"pending" | "selected" | "rejected">(
    meeting.interviewResult || "pending"
  );
  const [busy, setBusy] = useState(false);
  const [movingToOffer, setMovingToOffer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSelected(meeting.interviewResult || "pending");
  }, [meeting]);

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

  const handleMoveToOffer = async () => {
    if (movingToOffer) return;
    if (!meeting.applicationId) {
      await promptLinkInterview("placement");
      return;
    }
    const ok = await confirm({
      title: "Move to Offer?",
      message: (
        <>
          Create a draft offer for <strong>{meeting.candidate?.name || "this candidate"}</strong> and move
          the application to Offer stage. You complete the offer in Offers and placement.
        </>
      ),
      confirmLabel: "Move to Offer",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    setMovingToOffer(true);
    try {
      const result = await moveApplicationToOffer(String(meeting.applicationId));
      await onSaved();
      await confirm({
        title: result.moved ? "Moved to Offer" : "Already at Offer",
        message: result.message,
        confirmLabel: "Done",
        tone: result.moved ? "success" : undefined,
        hideCancel: true,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err as Error)?.message ||
        "Could not move this application to Offer.";
      if (/internal transfer/i.test(msg)) {
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
        return;
      }
      await confirm({
        title: "Could not move to Offer",
        message: msg,
        confirmLabel: "Close",
        tone: "danger",
        hideCancel: true,
      });
    } finally {
      setMovingToOffer(false);
    }
  };

  const handleSave = async () => {
    if (!recordId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const payload: UpdateMeetingPayload = { interviewResult: selected };
      const updated = await updateMeeting(recordId, payload);
      await onSaved();

      if (updated.linkageWarning === "interview_not_linked") {
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

        {recordId && (
          <div className="border-t border-defaultborder pt-5 dark:border-defaultborder/10">
            <RubricEvaluationForm meetingId={recordId} />
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-danger/25 bg-danger/10 p-3 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-defaultborder pt-4 dark:border-defaultborder/10">
          {canMoveToOffer && meeting.interviewResult === "selected" && (
            <button
              type="button"
              className="ti-btn ti-btn-success min-h-[2.75rem] !px-5 !py-2 !text-sm"
              onClick={() => void handleMoveToOffer()}
              disabled={movingToOffer}
            >
              {movingToOffer ? "Moving…" : "Move to Offer"}
            </button>
          )}
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
