"use client";

import React, { useState } from "react";
import {
  INTERVIEW_NOTICE_VERSION,
  submitPublicMeetingConsent,
  type SubmitInterviewConsentPayload,
} from "@/shared/lib/api/meetings";

export type InterviewJoinConsentVariant = "candidate" | "interviewer" | "guest";

export interface InterviewJoinConsentPanelProps {
  roomName: string;
  liveKitToken: string;
  variant: InterviewJoinConsentVariant;
  onComplete: () => void;
  onCancel?: () => void;
}

export default function InterviewJoinConsentPanel({
  roomName,
  liveKitToken,
  variant,
  onComplete,
  onCancel,
}: InterviewJoinConsentPanelProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const payload: SubmitInterviewConsentPayload = {
      noticeVersion: INTERVIEW_NOTICE_VERSION,
      recording: true,
      transcription: true,
      aiEvaluation: variant === "candidate",
    };
    try {
      await submitPublicMeetingConsent(roomName, liveKitToken, payload);
      onComplete();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Could not continue. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interview-consent-title"
    >
      <div className="w-full max-w-sm rounded-xl bg-white dark:bg-bodybg shadow-xl p-6 space-y-5">
        <h2 id="interview-consent-title" className="text-base sm:text-lg font-semibold text-center leading-snug">
          This meeting may be recorded
        </h2>

        {error && (
          <p className="text-sm text-danger text-center" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 justify-center sm:justify-end pt-1">
          {onCancel && (
            <button
              type="button"
              className="ti-btn ti-btn-light min-h-[2.75rem] min-w-[5.5rem]"
              onClick={onCancel}
              disabled={submitting}
            >
              Leave
            </button>
          )}
          <button
            type="button"
            className="ti-btn ti-btn-primary min-h-[2.75rem] min-w-[5.5rem]"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? "Continuing…" : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}
