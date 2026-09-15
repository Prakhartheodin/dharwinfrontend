"use client";

import React, { useState } from "react";
import {
  INTERVIEW_NOTICE_VERSION,
  submitPublicMeetingConsent,
  type SubmitInterviewConsentPayload,
} from "@/shared/lib/api/meetings";

const NOTICE_BODY =
  "This interview may be recorded and transcribed for hiring decisions. Optional AI tools may analyse the conversation to produce summaries and suggestions. Outputs are advisory and reviewed by people. Contact your recruiter to withdraw consent or request deletion.";

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
  const [recording, setRecording] = useState(variant === "candidate");
  const [transcription, setTranscription] = useState(true);
  const [aiEvaluation, setAiEvaluation] = useState(variant === "candidate");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const payload: SubmitInterviewConsentPayload = {
      noticeVersion: INTERVIEW_NOTICE_VERSION,
      recording,
      transcription,
      aiEvaluation: variant === "interviewer" ? false : aiEvaluation,
    };
    try {
      await submitPublicMeetingConsent(roomName, liveKitToken, payload);
      onComplete();
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Could not save your choices. Try again.");
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
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-bodybg shadow-xl p-6 space-y-4">
        <h2 id="interview-consent-title" className="text-lg font-semibold">
          Interview notices
        </h2>
        <p className="text-sm text-defaulttextcolor/80 leading-relaxed">{NOTICE_BODY}</p>
        <p className="text-xs text-defaulttextcolor/50">Notice version: {INTERVIEW_NOTICE_VERSION}</p>

        <div className="space-y-3">
          <label className="flex items-start gap-3 min-h-[2.75rem] cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 form-check-input"
              checked={recording}
              onChange={(e) => setRecording(e.target.checked)}
              disabled={variant === "interviewer"}
            />
            <span className="text-sm">Recording of audio and video</span>
          </label>
          <label className="flex items-start gap-3 min-h-[2.75rem] cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 form-check-input"
              checked={transcription}
              onChange={(e) => setTranscription(e.target.checked)}
            />
            <span className="text-sm">Speech-to-text transcription</span>
          </label>
          {variant !== "interviewer" && (
            <label className="flex items-start gap-3 min-h-[2.75rem] cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 form-check-input"
                checked={aiEvaluation}
                onChange={(e) => setAiEvaluation(e.target.checked)}
              />
              <span className="text-sm">AI-assisted summary and evaluation (optional)</span>
            </label>
          )}
        </div>

        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2 justify-end pt-2">
          {onCancel && (
            <button type="button" className="ti-btn ti-btn-light min-h-[2.75rem]" onClick={onCancel} disabled={submitting}>
              Leave
            </button>
          )}
          <button
            type="button"
            className="ti-btn ti-btn-primary min-h-[2.75rem]"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Continue to meeting"}
          </button>
        </div>
      </div>
    </div>
  );
}
