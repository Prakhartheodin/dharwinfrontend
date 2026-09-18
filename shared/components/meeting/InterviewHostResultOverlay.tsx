"use client";

import React, { useRef, useState } from "react";
import { updateMeeting, type Meeting, type UpdateMeetingPayload } from "@/shared/lib/api/meetings";
import RubricEvaluationForm from "@/shared/components/interview/RubricEvaluationForm";

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveEvaluationRef = useRef<(() => Promise<boolean>) | null>(null);

  /**
   * Saves the scorecard first, then the outcome.
   *
   * The scorecard goes first because it is the irreversible one: the server locks an
   * evaluation on submit, while the outcome can be changed afterwards. If the scorecard
   * cannot be saved we stop here rather than record the outcome and close — closing is
   * what used to discard the host's ratings without a word.
   */
  const handleSave = async () => {
    if (!meetingId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const evaluationSettled = await saveEvaluationRef.current?.();
      if (evaluationSettled === false) return;
      const payload: UpdateMeetingPayload = { interviewResult: selected };
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

          {meetingId && (
            <div className={sectionDividerClass}>
              <RubricEvaluationForm
                meetingId={meetingId}
                variant={isObsidian ? "obsidian" : "default"}
                hideSaveButton
                saveRef={saveEvaluationRef}
              />
            </div>
          )}

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
