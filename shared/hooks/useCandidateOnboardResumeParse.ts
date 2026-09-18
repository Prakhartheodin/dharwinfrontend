"use client";

import { useCallback, useRef, useState } from "react";
import { isAxiosError } from "axios";
import {
  parsePublicResumeStream,
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
// Same narration copy as the job apply form — one place to reword it.
import { describeParseEvent } from "@/shared/hooks/usePublicResumeParse";

export type CandidateOnboardParseUiStatus = "idle" | "parsing" | "prefill_ready" | "parse_failed";
export type CandidateOnboardEntryMode = "manual" | "ai";

export type CandidateOnboardPrefillTargets = {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setEmail: (value: string) => void;
  setPhoneNumber: (value: string) => void;
  setCountryCode: (value: string) => void;
};

function splitFullName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

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

type Options = { onCaptchaTokenConsumed?: () => void };

export function useCandidateOnboardResumeParse(options?: Options) {
  // AI by default: uploading a resume is the path that fills the form, so offer it first.
  const [entryMode, setEntryMode] = useState<CandidateOnboardEntryMode>("ai");
  const [parseStatus, setParseStatus] = useState<CandidateOnboardParseUiStatus>("idle");
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  /** What the parse is doing right now, narrated from the stream events. */
  const [parseActivity, setParseActivity] = useState<string | null>(null);
  /** Skill names as the model writes them, shown as chips while parsing. */
  const [streamingSkills, setStreamingSkills] = useState<string[]>([]);
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

  /**
   * Write one streamed field straight into the form, so an input fills the moment the model
   * finishes writing it rather than all of them landing together at the end. Uses the same guards
   * as applyPrefill: never touch a field the user typed in, never overwrite one that has a value.
   */
  const applyStreamedField = useCallback(
    (field: string, value: string, targets: CandidateOnboardPrefillTargets) => {
      const edited = editedFieldsRef.current;
      if (field === "fullName") {
        // This form has separate first/last inputs, so the streamed name is split the same way
        // applyPrefill splits it — each half guarded independently.
        const { first, last } = splitFullName(value);
        if (!edited.has("firstName") && !targets.firstName.trim() && first) {
          targets.setFirstName(first);
        }
        if (!edited.has("lastName") && !targets.lastName.trim() && last) {
          targets.setLastName(last);
        }
        return;
      }
      if (edited.has(field)) return;
      if (field === "email") {
        if (targets.email.trim()) return;
        targets.setEmail(value);
      } else if (field === "phoneNumber") {
        if (targets.phoneNumber.trim()) return;
        targets.setPhoneNumber(value);
      } else if (field === "countryCode") {
        targets.setCountryCode(value);
      }
    },
    []
  );

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
      targets: CandidateOnboardPrefillTargets
    ) => {
      const edited = editedFieldsRef.current;
      if (fields.fullName) {
        const { first, last } = splitFullName(fields.fullName);
        if (!edited.has("firstName") && !targets.firstName.trim() && first) {
          targets.setFirstName(first);
        }
        if (!edited.has("lastName") && !targets.lastName.trim() && last) {
          targets.setLastName(last);
        }
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
    async (file: File, targets: CandidateOnboardPrefillTargets, force = false) => {
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
      setStreamingSkills([]);
      setParseMessage(null);
      setParseResultStatus(null);

      try {
        const result = await parsePublicResumeStream(null, file, (event) => {
          // A superseded parse must not keep narrating over the one the user is waiting on.
          if (generation !== parseGenerationRef.current) return;
          const line = describeParseEvent(event);
          if (line) setParseActivity(line);
          if (event.type === "field") {
            applyStreamedField(event.field, event.value, targets);
          }
          if (event.type === "skill") {
            setStreamingSkills((prev) =>
              prev.some((name) => name.toLowerCase() === event.name.toLowerCase())
                ? prev
                : [...prev, event.name]
            );
          }
        });
        if (generation !== parseGenerationRef.current) return;
        if (fileDedupeKey(pendingFileRef.current || file) !== key) return;

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
          setParseActivity(null);
          setStreamingSkills([]);
          return;
        }

        setParseActivity(null);
        setStreamingSkills([]);
        applyPrefill(result.fields, targets);
        setParseStatus("prefill_ready");
        setParseMessage(
          result.status === "partial" && result.warnings?.length
            ? result.warnings.join(" ")
            : "We prefilled some fields from your resume. Please review before submitting."
        );
      } catch (err) {
        if (generation !== parseGenerationRef.current) return;
        setParseStatus("parse_failed");
        setParseMessage(isCaptchaApiError(err) ? CAPTCHA_RETRY_MESSAGE : extractParseErrorMessage(err));
        setSuggestedSkills([]);
        setSuggestedExperiences([]);
        setSuggestedQualifications([]);
        setSuggestedSocialLinks([]);
        setParseActivity(null);
        setStreamingSkills([]);
      } finally {
        if (captchaConfigured) {
          options?.onCaptchaTokenConsumed?.();
        }
      }
    },
    [applyPrefill, applyStreamedField, options]
  );

  const retryParse = useCallback(
    (targets: CandidateOnboardPrefillTargets) => {
      const file = pendingFileRef.current;
      if (!file) return;
      lastParsedKeyRef.current = null;
      void runParse(file, targets, true);
    },
    [runParse]
  );

  const resetParseState = useCallback(() => {
    parseGenerationRef.current += 1;
    // Back to the default, so reopening the form offers the AI path again.
    setEntryMode("ai");
    setParseStatus("idle");
    setParseMessage(null);
    setSuggestedSkills([]);
    setSuggestedExperiences([]);
    setSuggestedQualifications([]);
    setSuggestedSocialLinks([]);
    setParseActivity(null);
    setStreamingSkills([]);
    setParseResultStatus(null);
    lastParsedKeyRef.current = null;
    pendingFileRef.current = null;
    editedFieldsRef.current = new Set();
  }, []);

  const changeEntryMode = useCallback((mode: CandidateOnboardEntryMode) => {
    setEntryMode(mode);
    if (mode === "manual") {
      // Only the in-flight parse chrome is dropped. The parsed suggestions are deliberately kept:
      // discarding them destroyed the user's resume data with no warning and no undo, and it was
      // never needed — getSubmitSkills / getSubmitProfileArrays already return empty unless
      // entryMode === "ai", so nothing parsed can leak into a manual submission.
      setParseActivity(null);
      setStreamingSkills([]);
    }
  }, []);

  const getSubmitSkills = useCallback((): PublicResumeParseSkill[] => {
    if (entryMode !== "ai") return [];
    return suggestedSkills;
  }, [entryMode, suggestedSkills]);

  const getSubmitProfileArrays = useCallback(
    () => {
      if (entryMode !== "ai") {
        return { experiences: [], qualifications: [], socialLinks: [] };
      }
      return {
        experiences: suggestedExperiences,
        qualifications: suggestedQualifications,
        socialLinks: suggestedSocialLinks,
      };
    },
    [entryMode, suggestedExperiences, suggestedQualifications, suggestedSocialLinks]
  );

  return {
    entryMode,
    setEntryMode: changeEntryMode,
    parseStatus,
    parseMessage,
    suggestedSkills,
    setSuggestedSkills,
    suggestedExperiences,
    setSuggestedExperiences,
    suggestedQualifications,
    setSuggestedQualifications,
    suggestedSocialLinks,
    setSuggestedSocialLinks,
    parseResultStatus,
    parseActivity,
    streamingSkills,
    markFieldEdited,
    runParse,
    retryParse,
    resetParseState,
    getSubmitSkills,
    getSubmitProfileArrays,
  };
}
