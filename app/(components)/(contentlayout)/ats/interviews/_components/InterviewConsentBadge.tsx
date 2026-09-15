"use client";

import React from "react";
import type { MeetingParticipantConsent } from "@/shared/lib/api/meetings";
import { candidateConsentBadge } from "./interviewConsent";

export function InterviewConsentBadge({
  consents,
  className = "",
}: {
  consents?: MeetingParticipantConsent[] | null;
  className?: string;
}) {
  const badge = candidateConsentBadge(consents);
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded border px-1.5 py-0.5 text-[0.65rem] font-medium ${badge.className} ${className}`.trim()}
      title={badge.title}
    >
      {badge.label}
    </span>
  );
}
