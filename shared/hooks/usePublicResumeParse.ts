"use client";

import { useCallback, useRef, useState } from "react";
import { isAxiosError } from "axios";
import {
  parsePublicResume,
  parsePublicResumeStream,
  type PublicResumeParseStreamEvent,
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

/** Human label per streamed field, used by the live narration line. */
const PARSE_FIELD_LABEL: Record<string, string> = {
  fullName: "name",
  email: "email",
  phoneNumber: "phone number",
  countryCode: "country",
};

/** What the parse says it is doing when it reaches each stage. */
const PARSE_STAGE_LABEL: Record<string, string> = {
  extracting: "Reading your resume…",
  reading: "Looking for your details…",
  experiences: "Reading your work experience…",
  qualifications: "Reading your education…",
  socialLinks: "Looking for your links…",
};

/** How each streamed entry is announced. */
const PARSE_ITEM_VERB: Record<string, string> = {
  experiences: "Added experience",
  qualifications: "Added education",
  socialLinks: "Added link",
};

/**
 * Turn one stream event into the line shown while parsing, so the wait narrates what is actually
 * happening ("Filling in your name…") instead of sitting on one static sentence.
 * Returns null for events that should leave the current line alone.
 */
export function describeParseEvent(event: PublicResumeParseStreamEvent): string | null {
  switch (event.type) {
    case "stage":
      return PARSE_STAGE_LABEL[event.stage] ?? null;
    case "field": {
      const label = PARSE_FIELD_LABEL[event.field];
      return label ? `Found your ${label} — filling it in…` : null;
    }
    case "skill":
      return `Adding skill: ${event.name}`;
    case "item":
      return `${PARSE_ITEM_VERB[event.section]}: ${event.label}`;
    default:
      return null;
  }
}

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
  /**
   * Asked before a different resume overwrites details parsed from a previous one. Resolve false
   * to keep what is already on the form. Omitted means replace without asking (the old behaviour).
   * Injected rather than called here so this hook stays free of UI.
   */
  confirmReplaceDetails?: () => Promise<boolean>;
};

export function usePublicResumeParse(jobId: string, options?: UsePublicResumeParseOptions) {
  // AI by default: uploading a resume is the path that fills the form for the candidate, so it is
  // the one to offer first. "Continue manually" stays one click away.
  const [entryMode, setEntryMode] = useState<PublicApplyEntryMode>("ai");
  const [parseStatus, setParseStatus] = useState<PublicResumeParseUiStatus>("idle");
  const [parseMessage, setParseMessage] = useState<string | null>(null);
  const [suggestedSkills, setSuggestedSkills] = useState<PublicResumeParseSkill[]>([]);
  const [suggestedExperiences, setSuggestedExperiences] = useState<PublicApplyExperience[]>([]);
  const [suggestedQualifications, setSuggestedQualifications] = useState<PublicApplyQualification[]>([]);
  const [suggestedSocialLinks, setSuggestedSocialLinks] = useState<PublicApplySocialLink[]>([]);
  const [parseResultStatus, setParseResultStatus] = useState<PublicResumeParseStatus | null>(null);
  /**
   * Which contact fields this parse actually filled, so each input can say so beside its label.
   * A banner reading "we prefilled some fields" leaves the user to diff the whole form from memory.
   */
  const [prefilledFields, setPrefilledFields] = useState<Set<string>>(() => new Set());
  /** What the parse is doing right now, narrated from the stream events. */
  const [parseActivity, setParseActivity] = useState<string | null>(null);
  /**
   * Skill names as the model writes them, shown as chips while parsing. A preview only —
   * `suggestedSkills` from the final result is what gets submitted.
   */
  const [streamingSkills, setStreamingSkills] = useState<string[]>([]);

  const lastParsedKeyRef = useRef<string | null>(null);
  const parseGenerationRef = useRef(0);
  const editedFieldsRef = useRef<Set<string>>(new Set());
  const pendingFileRef = useRef<File | null>(null);
  /**
   * Whether a previous parse left details the user could have edited. Held in a ref so `runParse`
   * can read it without taking the suggestion arrays as dependencies.
   */
  const hasParsedDetailsRef = useRef(false);

  const markFieldEdited = useCallback((field: string) => {
    editedFieldsRef.current.add(field);
    // Once the user touches a field it is theirs, so drop the "from resume" marker.
    setPrefilledFields((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }, []);

  /**
   * Write one streamed field straight into the form, so an input fills the moment the model
   * finishes writing it rather than all of them landing together at the end.
   *
   * Uses the same guards as {@link applyPrefill}: never touch a field the user has typed in, and
   * never overwrite one that already has a value. `editedFieldsRef` is a ref, so a field the user
   * starts editing mid-parse is respected immediately even though `targets` was captured earlier.
   */
  const applyStreamedField = useCallback(
    (field: string, value: string, targets: PublicResumePrefillTargets) => {
      if (editedFieldsRef.current.has(field)) return;

      if (field === "fullName") {
        if (targets.fullName.trim()) return;
        targets.setFullName(value);
      } else if (field === "email") {
        if (targets.email.trim()) return;
        targets.setEmail(value);
      } else if (field === "phoneNumber") {
        if (targets.phoneNumber.trim()) return;
        targets.setPhoneNumber(value);
      } else if (field === "countryCode") {
        targets.setCountryCode(value);
        // The country dropdown is a supporting control, not a field the badge should claim.
        return;
      } else {
        return;
      }

      setPrefilledFields((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));
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
      targets: PublicResumePrefillTargets
    ) => {
      const edited = editedFieldsRef.current;
      const filled = new Set<string>();
      if (!edited.has("fullName") && !targets.fullName.trim() && fields.fullName) {
        targets.setFullName(fields.fullName);
        filled.add("fullName");
      }
      if (!edited.has("email") && !targets.email.trim() && fields.email) {
        targets.setEmail(fields.email);
        filled.add("email");
      }
      if (!edited.has("phoneNumber") && !targets.phoneNumber.trim() && fields.phoneNumber) {
        const normalized = parseStoredPhone(fields.phoneNumber, fields.countryCode ?? targets.countryCode);
        targets.setPhoneNumber(normalized.digits);
        filled.add("phoneNumber");
        if (!edited.has("countryCode")) {
          targets.setCountryCode(normalized.countryCode);
        }
      } else if (!edited.has("countryCode") && fields.countryCode) {
        targets.setCountryCode(fields.countryCode);
      }
      setPrefilledFields(filled);
      setSuggestedSkills(fields.skills || []);
      setSuggestedExperiences(fields.experiences || []);
      setSuggestedQualifications(fields.qualifications || []);
      setSuggestedSocialLinks(fields.socialLinks || []);
      hasParsedDetailsRef.current = Boolean(
        fields.skills?.length ||
          fields.experiences?.length ||
          fields.qualifications?.length ||
          fields.socialLinks?.length
      );
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

      // Swapping in a different resume replaces the parsed skills, experience, qualifications and
      // social links wholesale — including anything the user edited — so confirm first. A retry
      // (force) or a first parse has nothing to lose and never asks.
      const replacesExistingDetails =
        !force && lastParsedKeyRef.current !== null && lastParsedKeyRef.current !== key && hasParsedDetailsRef.current;
      if (replacesExistingDetails && options?.confirmReplaceDetails) {
        const proceed = await options.confirmReplaceDetails();
        if (!proceed) return;
        // The user may have picked another file while the prompt was open.
        if (fileDedupeKey(pendingFileRef.current || file) !== key) return;
      }

      const generation = ++parseGenerationRef.current;
      const captchaConfigured = getPublicCaptchaConfig().widgetConfigured;
      setParseStatus("parsing");
      setStreamingSkills([]);
      setParseMessage(null);
      setParseResultStatus(null);

      try {
        const result = await parsePublicResumeStream(jobId, file, (event) => {
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
          setPrefilledFields(new Set());
          setParseActivity(null);
          setStreamingSkills([]);
          hasParsedDetailsRef.current = false;
          return;
        }

        applyPrefill(result.fields, targets);
        setParseActivity(null);
        setStreamingSkills([]);
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
        setPrefilledFields(new Set());
        setParseActivity(null);
        setStreamingSkills([]);
        hasParsedDetailsRef.current = false;
      } finally {
        if (captchaConfigured) {
          options?.onCaptchaTokenConsumed?.();
        }
      }
    },
    [applyPrefill, applyStreamedField, jobId, options]
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
    // Back to the default, so reopening the form offers the AI path again.
    setEntryMode("ai");
    setParseStatus("idle");
    setParseMessage(null);
    setSuggestedSkills([]);
    setSuggestedExperiences([]);
    setSuggestedQualifications([]);
    setSuggestedSocialLinks([]);
    setPrefilledFields(new Set());
    setParseActivity(null);
    setStreamingSkills([]);
    hasParsedDetailsRef.current = false;
    setParseResultStatus(null);
    lastParsedKeyRef.current = null;
    pendingFileRef.current = null;
    editedFieldsRef.current = new Set();
  }, []);

  const changeEntryMode = useCallback((mode: PublicApplyEntryMode) => {
    // Deliberately keeps the parsed suggestions when switching to manual. Discarding them here
    // destroyed the user's resume data with no warning and no undo, and it was never needed:
    // getSubmitSkills / getSubmitProfileArrays already return empty unless entryMode === "ai",
    // so nothing parsed can leak into a manual submission. Switching back restores the review panel.
    setEntryMode(mode);
  }, []);

  const getSubmitSkills = useCallback((): PublicResumeParseSkill[] => {
    if (entryMode !== "ai") return [];
    return suggestedSkills;
  }, [entryMode, suggestedSkills]);

  const getSubmitProfileArrays = useCallback(() => {
    if (entryMode !== "ai") {
      return { experiences: [], qualifications: [], socialLinks: [] };
    }
    return {
      experiences: sanitizeExperiencesForSubmit(suggestedExperiences),
      qualifications: sanitizeQualificationsForSubmit(suggestedQualifications),
      socialLinks: sanitizeSocialLinksForSubmit(suggestedSocialLinks),
    };
  }, [entryMode, suggestedExperiences, suggestedQualifications, suggestedSocialLinks]);

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
    prefilledFields,
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
