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

const ENTRY_MODE_OPTIONS: { mode: PublicApplyEntryMode; label: string }[] = [
  { mode: "ai", label: "Fill with AI from resume" },
  { mode: "manual", label: "Continue manually" },
];

type PublicApplyResumeSectionProps = {
  entryMode: PublicApplyEntryMode;
  onEntryModeChange: (mode: PublicApplyEntryMode) => void;
  resume: File | null;
  /** From `useRef<HTMLInputElement>(null)`. No `| null` on the type argument: @types/react 18
   *  compares RefObject by variance, so RefObject<HTMLInputElement | null> is not a LegacyRef. */
  resumeInputRef: React.RefObject<HTMLInputElement>;
  onResumeSelected: (file: File) => void;
  parseStatus: PublicResumeParseUiStatus;
  parseMessage: string | null;
  /** Live narration while parsing, from the stream events. */
  parseActivity?: string | null;
  /** Skill names streamed so far, shown as chips while parsing. */
  streamingSkills?: string[];
  /**
   * Id for the resume input this section renders in AI mode. Callers that also render a
   * manual-mode upload should pass the same id, so focusing the invalid resume field finds it
   * whichever mode is active (the two are never on screen together).
   */
  resumeInputId?: string;
  /** Marks the resume control as failing validation. */
  resumeInvalid?: boolean;
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
  /** From `useRef<HTMLInputElement>(null)`. No `| null` on the type argument: @types/react 18
   *  compares RefObject by variance, so RefObject<HTMLInputElement | null> is not a LegacyRef. */
  resumeInputRef: React.RefObject<HTMLInputElement>;
  onResumeSelected: (file: File) => void;
  inputId?: string;
  /** When false, omit native `required` (e.g. saved-version picker validates in JS). */
  required?: boolean;
  /** Overrides default label helper when upload is optional alongside another resume source. */
  optionalHint?: string;
  /** Marks the control as failing validation (red outline + aria-invalid). */
  invalid?: boolean;
  /** Field label. Defaults to "Resume"; the cover-letter slot accepts the same formats. */
  label?: string;
};

export function PublicApplyResumeUploadField({
  resume,
  resumeInputRef,
  onResumeSelected,
  inputId = "public-apply-resume",
  required = true,
  optionalHint,
  invalid = false,
  label = "Resume",
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

  const hintId = `${inputId}-hint`;

  return (
    <div>
      {/* The format constraint lives in the hint below — it used to be stated in both places. */}
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </label>
      <p id={hintId} className="mb-1.5 text-xs text-slate-600 dark:text-gray-400">
        {optionalHint ?? `${PUBLIC_RESUME_FORMAT_MESSAGE} Maximum 10MB.`}
      </p>
      {/*
        The native file control renders as browser chrome and matches nothing else in the form, so
        it is visually hidden and driven by the label below. It remains a real focusable input, which
        keeps keyboard access, `required` and native form validation intact.
      */}
      <input
        id={inputId}
        ref={resumeInputRef}
        type="file"
        accept={PUBLIC_RESUME_ACCEPT}
        onChange={handleFileChange}
        className="peer sr-only"
        aria-describedby={hintId}
        aria-invalid={invalid || undefined}
        required={required}
      />
      <label
        htmlFor={inputId}
        className={`flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-sm transition peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 ${
          invalid
            ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/30"
            : "border-gray-300 hover:border-primary hover:bg-primary/5 dark:border-gray-600 dark:hover:border-primary"
        }`}
      >
        <i className="ri-upload-2-line text-lg text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          {resume ? (
            <>
              <span className="block truncate font-medium text-gray-800 dark:text-gray-100">{resume.name}</span>
              <span className="block text-xs text-slate-600 dark:text-gray-400">
                {(resume.size / 1024).toFixed(0)} KB · Choose a different file
              </span>
            </>
          ) : (
            <span className="text-slate-600 dark:text-gray-300">Choose a file</span>
          )}
        </span>
      </label>
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
  parseActivity,
  streamingSkills,
  resumeInputId,
  resumeInvalid = false,
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
        {/*
          Selected state must not rest on hue alone, so the active option also gains a check icon
          and a filled background. ARIA state stays on aria-checked for assistive tech.
        */}
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-labelledby="public-apply-entry-mode-label"
        >
          {ENTRY_MODE_OPTIONS.map(({ mode, label }) => {
            const selected = entryMode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={selected}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  selected
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                }`}
                onClick={() => onEntryModeChange(mode)}
              >
                <i
                  className={selected ? "ri-check-line text-base" : "ri-checkbox-blank-circle-line text-base opacity-50"}
                  aria-hidden
                />
                {label}
              </button>
            );
          })}
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
          {...(resumeInputId ? { inputId: resumeInputId } : {})}
          invalid={resumeInvalid}
        />
      ) : null}

      {entryMode === "ai" ? (
        <PublicResumeParseFeedback
          parseStatus={parseStatus}
          parseMessage={parseMessage}
          activity={parseActivity}
          streamingSkills={streamingSkills}
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
