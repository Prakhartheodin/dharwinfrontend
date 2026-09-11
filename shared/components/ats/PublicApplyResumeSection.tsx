"use client";

import React from "react";
import type {
  PublicApplyExperience,
  PublicApplyQualification,
  PublicApplySocialLink,
  PublicResumeParseSkill,
} from "@/shared/lib/api/jobs";
import type { PublicResumeParseUiStatus, PublicApplyEntryMode } from "@/shared/hooks/usePublicResumeParse";
import { PublicResumeParseFeedback } from "@/shared/components/ats/PublicResumeParseFeedback";
import { PublicApplyAiProfileEditor } from "@/shared/components/ats/PublicApplyAiProfileEditor";
import {
  isPublicResumeFile,
  PUBLIC_RESUME_ACCEPT,
  PUBLIC_RESUME_FORMAT_MESSAGE,
} from "@/shared/lib/publicApplyResume";

type PublicApplyResumeSectionProps = {
  entryMode: PublicApplyEntryMode;
  onEntryModeChange: (mode: PublicApplyEntryMode) => void;
  resume: File | null;
  resumeInputRef: React.RefObject<HTMLInputElement | null>;
  onResumeSelected: (file: File) => void;
  parseStatus: PublicResumeParseUiStatus;
  parseMessage: string | null;
  suggestedSkills: PublicResumeParseSkill[];
  suggestedExperiences: PublicApplyExperience[];
  suggestedQualifications: PublicApplyQualification[];
  suggestedSocialLinks: PublicApplySocialLink[];
  onExperiencesChange: (rows: PublicApplyExperience[]) => void;
  onQualificationsChange: (rows: PublicApplyQualification[]) => void;
  onSocialLinksChange: (rows: PublicApplySocialLink[]) => void;
  onRetryParse: () => void;
};

export function PublicApplyResumeSection({
  entryMode,
  onEntryModeChange,
  resume,
  resumeInputRef,
  onResumeSelected,
  parseStatus,
  parseMessage,
  suggestedSkills,
  suggestedExperiences,
  suggestedQualifications,
  suggestedSocialLinks,
  onExperiencesChange,
  onQualificationsChange,
  onSocialLinksChange,
  onRetryParse,
}: PublicApplyResumeSectionProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isPublicResumeFile(file)) {
      e.target.value = "";
      return;
    }
    onResumeSelected(file);
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          How would you like to fill your profile?
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Profile entry mode">
          <button
            type="button"
            role="radio"
            aria-checked={entryMode === "manual"}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              entryMode === "manual"
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
            onClick={() => onEntryModeChange("manual")}
          >
            Continue manually
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={entryMode === "ai"}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
              entryMode === "ai"
                ? "border-primary bg-primary/10 text-primary"
                : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
            onClick={() => onEntryModeChange("ai")}
          >
            Fill with AI from resume
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {entryMode === "ai"
            ? "Upload a PDF or DOCX resume and we will suggest contact details, skills, experience, qualifications, and links. You can edit everything before submitting."
            : "Enter your details manually. AI-detected skills are not submitted in manual mode. You can still add optional profile sections below."}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Resume <span className="text-red-500">*</span> (PDF or DOCX only, max 10MB)
        </label>
        <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{PUBLIC_RESUME_FORMAT_MESSAGE}</p>
        <input
          ref={resumeInputRef}
          type="file"
          accept={PUBLIC_RESUME_ACCEPT}
          onChange={handleFileChange}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          required
        />
        {resume ? (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {resume.name} ({(resume.size / 1024).toFixed(0)} KB)
          </p>
        ) : null}
      </div>

      {entryMode === "ai" ? (
        <PublicResumeParseFeedback
          parseStatus={parseStatus}
          parseMessage={parseMessage}
          suggestedSkills={suggestedSkills}
          onRetry={onRetryParse}
          showSkills={false}
        />
      ) : null}

      {entryMode === "manual" ||
      parseStatus === "prefill_ready" ||
      parseStatus === "parse_failed" ? (
        <PublicApplyAiProfileEditor
          skills={entryMode === "ai" ? suggestedSkills : []}
          experiences={suggestedExperiences}
          qualifications={suggestedQualifications}
          socialLinks={suggestedSocialLinks}
          onExperiencesChange={onExperiencesChange}
          onQualificationsChange={onQualificationsChange}
          onSocialLinksChange={onSocialLinksChange}
          heading={
            entryMode === "ai" && parseStatus === "prefill_ready"
              ? "AI suggestions — review and edit before submitting"
              : "Optional profile details (experience, qualifications, links)"
          }
        />
      ) : null}
    </div>
  );
}
