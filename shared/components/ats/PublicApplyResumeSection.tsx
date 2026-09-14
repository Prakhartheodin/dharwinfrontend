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
  onSkillsChange?: (skills: PublicResumeParseSkill[]) => void;
  onRetryParse: () => void;
  /** When false, optional profile editor is omitted (render via PublicApplyOptionalProfileDetails elsewhere). */
  showOptionalProfile?: boolean;
  /** When false, resume file input is omitted (e.g. manual onboard places upload later in the form). */
  showResumeUpload?: boolean;
};

type PublicApplyOptionalProfileDetailsProps = {
  entryMode: PublicApplyEntryMode;
  parseStatus: PublicResumeParseUiStatus;
  suggestedSkills: PublicResumeParseSkill[];
  suggestedExperiences: PublicApplyExperience[];
  suggestedQualifications: PublicApplyQualification[];
  suggestedSocialLinks: PublicApplySocialLink[];
  onExperiencesChange: (rows: PublicApplyExperience[]) => void;
  onQualificationsChange: (rows: PublicApplyQualification[]) => void;
  onSocialLinksChange: (rows: PublicApplySocialLink[]) => void;
  onSkillsChange?: (skills: PublicResumeParseSkill[]) => void;
};

export function PublicApplyOptionalProfileDetails({
  entryMode,
  parseStatus,
  suggestedSkills,
  suggestedExperiences,
  suggestedQualifications,
  suggestedSocialLinks,
  onExperiencesChange,
  onQualificationsChange,
  onSocialLinksChange,
  onSkillsChange,
}: PublicApplyOptionalProfileDetailsProps) {
  if (
    entryMode !== "manual" &&
    parseStatus !== "prefill_ready" &&
    parseStatus !== "parse_failed"
  ) {
    return null;
  }

  return (
    <PublicApplyAiProfileEditor
      skills={entryMode === "ai" ? suggestedSkills : []}
      experiences={suggestedExperiences}
      qualifications={suggestedQualifications}
      socialLinks={suggestedSocialLinks}
      onSkillsChange={entryMode === "ai" ? onSkillsChange : undefined}
      showSkillsEditor={entryMode === "ai" && parseStatus === "prefill_ready"}
      onExperiencesChange={onExperiencesChange}
      onQualificationsChange={onQualificationsChange}
      onSocialLinksChange={onSocialLinksChange}
      heading={
        entryMode === "ai" && parseStatus === "prefill_ready"
          ? "AI suggestions — review and edit before submitting"
          : "Optional profile details (experience, qualifications, links)"
      }
    />
  );
}

type PublicApplyResumeUploadFieldProps = {
  resume: File | null;
  resumeInputRef: React.RefObject<HTMLInputElement | null>;
  onResumeSelected: (file: File) => void;
  inputId?: string;
};

export function PublicApplyResumeUploadField({
  resume,
  resumeInputRef,
  onResumeSelected,
  inputId = "public-apply-resume",
}: PublicApplyResumeUploadFieldProps) {
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
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Resume <span className="text-red-500">*</span> (PDF or DOCX only, max 10MB)
      </label>
      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{PUBLIC_RESUME_FORMAT_MESSAGE}</p>
      <input
        id={inputId}
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
  );
}

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
  onSkillsChange,
  onRetryParse,
  showOptionalProfile = true,
  showResumeUpload = true,
}: PublicApplyResumeSectionProps) {

  return (
    <div className="space-y-3">
      <div>
        <p
          id="public-apply-entry-mode-label"
          className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          How would you like to fill your profile?
        </p>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-labelledby="public-apply-entry-mode-label"
        >
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
        {entryMode === "manual" ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Enter your details manually. Upload your resume below when you&apos;re ready — we won&apos;t parse it in
            this mode.
          </p>
        ) : null}
      </div>

      {showResumeUpload ? (
        <PublicApplyResumeUploadField
          resume={resume}
          resumeInputRef={resumeInputRef}
          onResumeSelected={onResumeSelected}
        />
      ) : null}

      {entryMode === "ai" ? (
        <PublicResumeParseFeedback
          parseStatus={parseStatus}
          parseMessage={parseMessage}
          suggestedSkills={suggestedSkills}
          onRetry={onRetryParse}
          showSkills={false}
        />
      ) : null}

      {showOptionalProfile ? (
        <PublicApplyOptionalProfileDetails
          entryMode={entryMode}
          parseStatus={parseStatus}
          suggestedSkills={suggestedSkills}
          suggestedExperiences={suggestedExperiences}
          suggestedQualifications={suggestedQualifications}
          suggestedSocialLinks={suggestedSocialLinks}
          onExperiencesChange={onExperiencesChange}
          onQualificationsChange={onQualificationsChange}
          onSocialLinksChange={onSocialLinksChange}
          onSkillsChange={onSkillsChange}
        />
      ) : null}
    </div>
  );
}
