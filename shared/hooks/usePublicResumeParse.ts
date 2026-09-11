"use client";

import { useCallback, useRef, useState } from "react";
import { isAxiosError } from "axios";
import {
  parsePublicResume,
  type PublicApplyExperience,
  type PublicApplyQualification,
  type PublicApplySocialLink,
  type PublicResumeParseSkill,
  type PublicResumeParseStatus,
} from "@/shared/lib/api/jobs";
import {
  CAPTCHA_RETRY_MESSAGE,
  getCaptchaSubmitBlockReason,
  getPublicCaptchaConfig,
  isCaptchaApiError,
} from "@/shared/lib/publicApplyCaptcha";
import { parseStoredPhone } from "@/shared/lib/phoneCountries";
import { isPublicResumeFile, PUBLIC_RESUME_FORMAT_MESSAGE } from "@/shared/lib/publicApplyResume";

export type PublicResumeParseUiStatus = "idle" | "parsing" | "prefill_ready" | "parse_failed";
export type PublicApplyEntryMode = "manual" | "ai";

export type PublicResumePrefillTargets = {
  fullName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  setFullName: (value: string) => void;
  setEmail: (value: string) => void;
  setPhoneNumber: (value: string) => void;
  setCountryCode: (value: string) => void;
};

function fileDedupeKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function extractParseErrorMessage(err: unknown): string {
  if (isAxiosError(err) && err.response?.data) {
    const data = err.response.data as { message?: string };
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }
  if (err instanceof Error && err.message.trim()) {
    return err.message;
  }
  return "Could not parse your resume. You can still fill in the form manually.";
}

function sanitizeExperiencesForSubmit(rows: PublicApplyExperience[]): PublicApplyExperience[] {
  return rows
    .map((row) => ({
      company: row.company.trim(),
      role: row.role.trim(),
      startDate: row.startDate || null,
      endDate: row.currentlyWorking ? null : row.endDate || null,
      currentlyWorking: Boolean(row.currentlyWorking),
      description: row.description?.trim() || null,
    }))
    .filter((row) => row.company && row.role);
}

function sanitizeQualificationsForSubmit(rows: PublicApplyQualification[]): PublicApplyQualification[] {
  return rows
    .map((row) => ({
      degree: row.degree.trim(),
      institute: row.institute.trim(),
      location: row.location?.trim() || null,
      startYear: row.startYear ?? null,
      endYear: row.endYear ?? null,
      description: row.description?.trim() || null,
    }))
    .filter((row) => row.degree && row.institute);
}

function sanitizeSocialLinksForSubmit(rows: PublicApplySocialLink[]): PublicApplySocialLink[] {
  return rows
    .map((row) => ({
      platform: row.platform.trim(),
      url: row.url.trim(),
    }))
    .filter((row) => row.platform && row.url);
}

type UsePublicResumeParseOptions = {
  onCaptchaTokenConsumed?: () => void;
};

export function usePublicResumeParse(jobId: string, options?: UsePublicResumeParseOptions) {
  const [entryMode, setEntryMode] = useState<PublicApplyEntryMode>("manual");
  const [parseStatus, setParseStatus] = useState<PublicResumeParseUiStatus>("idle");
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [suggestedSkills, setSuggestedSkills] = useState<PublicResumeParseSkill[]>([]);
  const [suggestedExperiences, setSuggestedExperiences] = useState<PublicApplyExperience[]>([]);
  const [suggestedQualifications, setSuggestedQualifications] = useState<PublicApplyQualification[]>([]);
  const [suggestedSocialLinks, setSuggestedSocialLinks] = useState<PublicApplySocialLink[]>([]);
  const [parseResultStatus, setParseResultStatus] = useState<PublicResumeParseStatus | null>(null);

  const lastParsedKeyRef = useRef<string | null>(null);
  const parseGenerationRef = useRef(0);
  const editedFieldsRef = useRef<Set<string>>(new Set());
  const pendingFileRef = useRef<File | null>(null);

  const markFieldEdited = useCallback((field: string) => {
    editedFieldsRef.current.add(field);
  }, []);

  const applyPrefill = useCallback(
    (
      fields: {
        fullName: string | null;
        email: string | null;
        phoneNumber: string | null;
        countryCode: string | null;
        skills: PublicResumeParseSkill[];
        experiences: PublicApplyExperience[];
        qualifications: PublicApplyQualification[];
        socialLinks: PublicApplySocialLink[];
      },
      targets: PublicResumePrefillTargets
    ) => {
      const edited = editedFieldsRef.current;
      if (!edited.has("fullName") && !targets.fullName.trim() && fields.fullName) {
        targets.setFullName(fields.fullName);
      }
      if (!edited.has("email") && !targets.email.trim() && fields.email) {
        targets.setEmail(fields.email);
      }
      if (!edited.has("phoneNumber") && !targets.phoneNumber.trim() && fields.phoneNumber) {
        const normalized = parseStoredPhone(fields.phoneNumber, fields.countryCode ?? targets.countryCode);
        targets.setPhoneNumber(normalized.digits);
        if (!edited.has("countryCode")) {
          targets.setCountryCode(normalized.countryCode);
        }
      } else if (!edited.has("countryCode") && fields.countryCode) {
        targets.setCountryCode(fields.countryCode);
      }
      setSuggestedSkills(fields.skills || []);
      setSuggestedExperiences(fields.experiences || []);
      setSuggestedQualifications(fields.qualifications || []);
      setSuggestedSocialLinks(fields.socialLinks || []);
    },
    []
  );

  const runParse = useCallback(
    async (file: File, targets: PublicResumePrefillTargets, force = false) => {
      if (!isPublicResumeFile(file)) {
        setParseStatus("parse_failed");
        setParseMessage(PUBLIC_RESUME_FORMAT_MESSAGE);
        return;
      }

      const captchaBlock = getCaptchaSubmitBlockReason();
      if (captchaBlock) {
        setParseStatus("parse_failed");
        setParseMessage(captchaBlock);
        return;
      }

      const key = fileDedupeKey(file);
      pendingFileRef.current = file;
      if (!force && lastParsedKeyRef.current === key) {
        return;
      }

      const generation = ++parseGenerationRef.current;
      const captchaConfigured = getPublicCaptchaConfig().widgetConfigured;
      setParseStatus("parsing");
      setParseMessage(null);
      setParseResultStatus(null);

      try {
        const result = await parsePublicResume(jobId, file);
        if (generation !== parseGenerationRef.current) {
          return;
        }
        if (fileDedupeKey(pendingFileRef.current || file) !== key) {
          return;
        }

        lastParsedKeyRef.current = key;
        setParseResultStatus(result.status);

        if (result.status === "failed") {
          setParseStatus("parse_failed");
          setParseMessage(
            result.warnings?.filter(Boolean).join(" ") ||
              "Could not read your resume. Fill in the form manually."
          );
          setSuggestedSkills([]);
          setSuggestedExperiences([]);
          setSuggestedQualifications([]);
          setSuggestedSocialLinks([]);
          return;
        }

        applyPrefill(result.fields, targets);
        setParseStatus("prefill_ready");
        if (result.status === "partial" && result.warnings?.length) {
          setParseMessage(result.warnings.join(" "));
        } else {
          setParseMessage("We prefilled some fields from your resume. Please review before submitting.");
        }
      } catch (err) {
        if (generation !== parseGenerationRef.current) {
          return;
        }
        setParseStatus("parse_failed");
        setParseMessage(isCaptchaApiError(err) ? CAPTCHA_RETRY_MESSAGE : extractParseErrorMessage(err));
        setSuggestedSkills([]);
        setSuggestedExperiences([]);
        setSuggestedQualifications([]);
        setSuggestedSocialLinks([]);
      } finally {
        if (captchaConfigured) {
          options?.onCaptchaTokenConsumed?.();
        }
      }
    },
    [applyPrefill, jobId, options]
  );

  const retryParse = useCallback(
    (targets: PublicResumePrefillTargets) => {
      const file = pendingFileRef.current;
      if (!file) return;
      lastParsedKeyRef.current = null;
      void runParse(file, targets, true);
    },
    [runParse]
  );

  const resetParseState = useCallback(() => {
    parseGenerationRef.current += 1;
    setEntryMode("manual");
    setParseStatus("idle");
    setParseMessage(null);
    setSuggestedSkills([]);
    setSuggestedExperiences([]);
    setSuggestedQualifications([]);
    setSuggestedSocialLinks([]);
    setParseResultStatus(null);
    lastParsedKeyRef.current = null;
    pendingFileRef.current = null;
    editedFieldsRef.current = new Set();
  }, []);

  const changeEntryMode = useCallback((mode: PublicApplyEntryMode) => {
    setEntryMode(mode);
    if (mode === "manual") {
      setSuggestedSkills([]);
    }
  }, []);

  const getSubmitSkills = useCallback((): PublicResumeParseSkill[] => {
    if (entryMode !== "ai") return [];
    return suggestedSkills;
  }, [entryMode, suggestedSkills]);

  const getSubmitProfileArrays = useCallback(() => ({
    experiences: sanitizeExperiencesForSubmit(suggestedExperiences),
    qualifications: sanitizeQualificationsForSubmit(suggestedQualifications),
    socialLinks: sanitizeSocialLinksForSubmit(suggestedSocialLinks),
  }), [suggestedExperiences, suggestedQualifications, suggestedSocialLinks]);

  return {
    entryMode,
    setEntryMode: changeEntryMode,
    parseStatus,
    parseMessage,
    suggestedSkills,
    suggestedExperiences,
    setSuggestedExperiences,
    suggestedQualifications,
    setSuggestedQualifications,
    suggestedSocialLinks,
    setSuggestedSocialLinks,
    parseResultStatus,
    markFieldEdited,
    runParse,
    retryParse,
    resetParseState,
    getSubmitSkills,
    getSubmitProfileArrays,
  };
}
