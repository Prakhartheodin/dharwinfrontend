"use client";

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import {
  addCandidateDocumentVersion,
  getMyCandidate,
  getCandidateListItemId,
  getDocumentVersionDownloadUrl,
  listCandidateDocumentVersions,
  uploadDocument,
  type CandidateDocumentVersion,
  type DocumentVersionSlot,
} from "@/shared/lib/api/employees";
import { browseApplyToJob, type BrowseApplyOptions } from "@/shared/lib/api/jobs";
import { PublicApplyResumeUploadField } from "@/shared/components/ats/PublicApplyResumeSection";
import { isPublicResumeFile, PUBLIC_RESUME_FORMAT_MESSAGE } from "@/shared/lib/publicApplyResume";
import { canSubmitBrowseJobApplyResume } from "@/shared/lib/applyResumePickerSubmit";
import { pdfViewerSrc, resolveDocumentPreviewMode } from "@/shared/lib/documentVersionPreview";

export type ApplyResumePickerOverlayProps = {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  referralRef?: string | null;
  onSuccess?: () => void;
};

type SelectionMode = "version" | "upload";

type InlinePreviewState = {
  url: string;
  title: string;
  revokeOnClose?: boolean;
};

/**
 * Per-slot picker state. The resume and the cover letter run the same machine — saved versions, or
 * a staged file that must be saved as a version before it can be submitted. The only difference is
 * that the cover letter may resolve to "nothing selected".
 */
type SlotState = {
  versions: CandidateDocumentVersion[];
  currentVersion: number | null;
  selectionMode: SelectionMode;
  selectedVersion: number | null;
  file: File | null;
  uploading: boolean;
  uploadError: string | null;
};

const EMPTY_SLOT: SlotState = {
  versions: [],
  currentVersion: null,
  selectionMode: "version",
  selectedVersion: null,
  file: null,
  uploading: false,
  uploadError: null,
};

/** Label stamped on the generic upload, and the `type`/`label` the version row is created with. */
const SLOT_UPLOAD_LABEL: Record<DocumentVersionSlot, string> = {
  resume: "CV/Resume",
  "cover-letter": "Cover Letter",
};
const SLOT_DOC_TYPE: Record<DocumentVersionSlot, string> = {
  resume: "CV/Resume",
  "cover-letter": "Other",
};
/** Lowercase noun for sentences ("Upload resume", "Upload cover letter"). */
const SLOT_NOUN: Record<DocumentVersionSlot, string> = {
  resume: "resume",
  "cover-letter": "cover letter",
};
const SLOT_FIELD_LABEL: Record<DocumentVersionSlot, string> = {
  resume: "Resume",
  "cover-letter": "Cover letter",
};

function getSlotUploadErrorMessage(error: unknown, slot: DocumentVersionSlot): string {
  if (isAxiosError(error) && error.response?.data) {
    const data = error.response.data as { message?: string };
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
    if (error.response.status === 401) {
      return "Your session has expired. Sign in again and retry.";
    }
    if (error.response.status === 403) {
      return `You do not have permission to save this ${SLOT_NOUN[slot]}.`;
    }
    if (error.response.status === 413) {
      return "That file is too large. Try a smaller PDF, DOC, or DOCX.";
    }
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "Upload failed. Check the file and try again.";
}

function formatVersionDate(value?: string): string {
  if (!value) return "Upload date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Upload date unavailable";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function versionLabel(v: CandidateDocumentVersion): string {
  return v.originalName || v.label || `Version ${v.version}`;
}

function getApplyErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data) {
    const data = error.response.data as { message?: string };
    if (typeof data.message === "string" && data.message.trim()) {
      const msg = data.message.trim();
      if (/must be a valid mongo id/i.test(msg)) {
        return "We couldn't load your saved resumes. Upload a new file to continue.";
      }
      return msg;
    }
    if (error.response.status === 404) {
      return "No candidate profile is linked to your account yet. Upload a resume to apply.";
    }
  }
  if (error instanceof Error && error.message.trim()) {
    const msg = error.message.trim();
    if (/valid candidate profile is required/i.test(msg)) {
      return "We couldn't load your saved resumes. Upload a new file to continue.";
    }
    return msg;
  }
  return "Failed to submit application. Please try again.";
}

export function ApplyResumePickerOverlay({
  open,
  onClose,
  jobId,
  jobTitle,
  referralRef,
  onSuccess,
}: ApplyResumePickerOverlayProps) {
  const titleId = useId();
  const coverPanelId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resumeSlot, setResumeSlot] = useState<SlotState>(EMPTY_SLOT);
  const [coverSlot, setCoverSlot] = useState<SlotState>(EMPTY_SLOT);
  const [coverOpen, setCoverOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [inlinePreview, setInlinePreview] = useState<InlinePreviewState | null>(null);
  const [previewLoadingKey, setPreviewLoadingKey] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const busy = submitting || resumeSlot.uploading || coverSlot.uploading;

  const slotSetter = useCallback(
    (slot: DocumentVersionSlot) => (slot === "resume" ? setResumeSlot : setCoverSlot),
    []
  );
  const slotInputRef = useCallback(
    (slot: DocumentVersionSlot) => (slot === "resume" ? resumeInputRef : coverInputRef),
    []
  );

  const closeInlinePreview = useCallback(() => {
    setInlinePreview((prev) => {
      if (prev?.revokeOnClose && prev.url.startsWith("blob:")) {
        URL.revokeObjectURL(prev.url);
      }
      return null;
    });
  }, []);

  const openResolvedPreview = useCallback(
    (url: string, fileName: string, mimeType: string, revokeOnClose = false) => {
      const mode = resolveDocumentPreviewMode(fileName, mimeType);
      if (mode === "inline-pdf") {
        setInlinePreview({ url, title: fileName, revokeOnClose });
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      if (revokeOnClose && url.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    },
    []
  );

  const loadDocumentVersions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let candidate;
      try {
        candidate = await getMyCandidate();
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          setCandidateId(null);
          setResumeSlot({ ...EMPTY_SLOT, selectionMode: "upload" });
          setCoverSlot({ ...EMPTY_SLOT, selectionMode: "upload" });
          return;
        }
        throw err;
      }

      const resolvedCandidateId = getCandidateListItemId(candidate);
      if (!resolvedCandidateId) {
        setCandidateId(null);
        setResumeSlot({ ...EMPTY_SLOT, selectionMode: "upload" });
        setCoverSlot({ ...EMPTY_SLOT, selectionMode: "upload" });
        setLoadError("We couldn't load saved resume versions. You can still upload a new resume below.");
        return;
      }

      setCandidateId(resolvedCandidateId);
      // A cover-letter failure must not take the resume down with it — an applicant who has never
      // saved one still needs to be able to apply.
      const [resumeData, coverData] = await Promise.all([
        listCandidateDocumentVersions(resolvedCandidateId, "resume"),
        listCandidateDocumentVersions(resolvedCandidateId, "cover-letter").catch(() => null),
      ]);

      setResumeSlot({
        ...EMPTY_SLOT,
        versions: resumeData.versions ?? [],
        currentVersion: resumeData.currentVersion,
        selectedVersion: resumeData.currentVersion ?? resumeData.versions?.[0]?.version ?? null,
        selectionMode: resumeData.versions?.length ? "version" : "upload",
      });
      // Deliberately starts at "none": a cover letter saved months ago must not ride along on an
      // application the candidate never chose to attach it to.
      setCoverSlot({
        ...EMPTY_SLOT,
        versions: coverData?.versions ?? [],
        currentVersion: coverData?.currentVersion ?? null,
        selectedVersion: null,
      });
    } catch (err) {
      setCandidateId(null);
      setLoadError(getApplyErrorMessage(err));
      setResumeSlot({ ...EMPTY_SLOT, selectionMode: "upload" });
      setCoverSlot({ ...EMPTY_SLOT, selectionMode: "upload" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setPreviewError(null);
    setCoverOpen(false);
    closeInlinePreview();
    void loadDocumentVersions();
  }, [open, loadDocumentVersions, closeInlinePreview]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || busy) return;
      e.preventDefault();
      if (inlinePreview) {
        closeInlinePreview();
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [open, onClose, busy, inlinePreview, closeInlinePreview]);

  const handlePreviewVersion = async (
    slot: DocumentVersionSlot,
    version: CandidateDocumentVersion,
    displayLabel: string,
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!candidateId) {
      setPreviewError("We couldn't load your profile. Upload a resume or try again later.");
      return;
    }
    setPreviewError(null);
    setPreviewLoadingKey(`${slot}:${version.version}`);
    try {
      const data = await getDocumentVersionDownloadUrl(candidateId, slot, version.version);
      const fileName = data.fileName || version.originalName || displayLabel;
      openResolvedPreview(data.url, fileName, data.mimeType || version.mimeType || "");
    } catch (err) {
      setPreviewError(getApplyErrorMessage(err));
    } finally {
      setPreviewLoadingKey(null);
    }
  };

  const handlePreviewStagedFile = (file: File, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setPreviewError(null);
    const url = URL.createObjectURL(file);
    openResolvedPreview(url, file.name, file.type, true);
  };

  const handleFileSelected = (slot: DocumentVersionSlot, file: File) => {
    if (!isPublicResumeFile(file)) {
      setFormError(`${SLOT_FIELD_LABEL[slot]}: ${PUBLIC_RESUME_FORMAT_MESSAGE}`);
      slotSetter(slot)((prev) => ({ ...prev, file: null }));
      return;
    }
    setFormError(null);
    slotSetter(slot)((prev) => ({
      ...prev,
      file,
      uploadError: null,
      selectionMode: "upload",
      selectedVersion: null,
    }));
  };

  const handleSelectVersion = (slot: DocumentVersionSlot, version: number | null) => {
    setFormError(null);
    slotSetter(slot)((prev) => ({
      ...prev,
      selectionMode: "version",
      selectedVersion: version,
      file: null,
      uploadError: null,
    }));
    const input = slotInputRef(slot).current;
    if (input) input.value = "";
  };

  const handleUploadSlotFile = async (slot: DocumentVersionSlot) => {
    const setSlot = slotSetter(slot);
    const state = slot === "resume" ? resumeSlot : coverSlot;
    if (!state.file || busy) return;
    if (!candidateId) {
      setSlot((prev) => ({
        ...prev,
        uploadError: `No candidate profile is linked yet. Submit your application to upload this ${SLOT_NOUN[slot]}.`,
      }));
      return;
    }
    const file = state.file;
    setSlot((prev) => ({ ...prev, uploading: true, uploadError: null }));
    setFormError(null);
    try {
      const uploaded = await uploadDocument(file, SLOT_UPLOAD_LABEL[slot]);
      const result = await addCandidateDocumentVersion(candidateId, slot, {
        type: SLOT_DOC_TYPE[slot],
        label: SLOT_UPLOAD_LABEL[slot],
        documentUrl: uploaded.url,
        key: uploaded.key,
        originalName: uploaded.originalName,
        size: uploaded.size,
        mimeType: uploaded.mimeType,
      });
      const data = await listCandidateDocumentVersions(candidateId, slot);
      const newVersion = result.version?.version ?? data.currentVersion ?? null;
      setSlot({
        versions: data.versions ?? [],
        currentVersion: data.currentVersion,
        selectionMode: "version",
        selectedVersion: newVersion,
        file: null,
        uploading: false,
        uploadError: null,
      });
      const input = slotInputRef(slot).current;
      if (input) input.value = "";
    } catch (err) {
      setSlot((prev) => ({ ...prev, uploading: false, uploadError: getSlotUploadErrorMessage(err, slot) }));
    }
  };

  const canSubmit =
    canSubmitBrowseJobApplyResume({
      selectionMode: resumeSlot.selectionMode,
      selectedVersion: resumeSlot.selectedVersion,
      versions: resumeSlot.versions,
      resumeFile: resumeSlot.file,
      candidateId,
      uploadingResume: resumeSlot.uploading,
    }) &&
    // Same rule as the resume: a staged file on a profile that already exists must be saved as a
    // version first, otherwise it would be silently dropped on submit.
    !coverSlot.uploading &&
    !(coverSlot.file && candidateId);

  const uploadRequired = !loading && resumeSlot.versions.length === 0;

  const coverSummary = useMemo(() => {
    if (coverSlot.file) return `Selected file: ${coverSlot.file.name}`;
    if (coverSlot.selectedVersion == null) return null;
    const match = coverSlot.versions.find((v) => v.version === coverSlot.selectedVersion);
    return match ? `Attached: ${versionLabel(match)}` : null;
  }, [coverSlot.file, coverSlot.selectedVersion, coverSlot.versions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const options: BrowseApplyOptions = { ref: referralRef ?? undefined };

      if (resumeSlot.selectionMode === "upload" && resumeSlot.file && !candidateId) {
        options.resumeFile = resumeSlot.file;
      } else if (resumeSlot.selectedVersion != null) {
        options.resumeVersion = resumeSlot.selectedVersion;
      } else {
        setFormError("Choose a resume version or upload a file to continue.");
        return;
      }

      if (coverSlot.file && !candidateId) {
        options.coverLetterFile = coverSlot.file;
      } else if (coverSlot.selectedVersion != null) {
        options.coverLetterVersion = coverSlot.selectedVersion;
      }

      await browseApplyToJob(jobId, options);
      onSuccess?.();
      onClose();
    } catch (err) {
      setFormError(getApplyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const renderVersionList = (
    slot: DocumentVersionSlot,
    state: SlotState,
    options: { legend: string; includeNone: boolean }
  ) => (
    <fieldset>
      <legend className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {options.legend}
      </legend>
      <div className="space-y-2" role="radiogroup" aria-label={`${SLOT_FIELD_LABEL[slot]} version`}>
        {options.includeNone ? (
          <label
            className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition ${
              state.selectionMode === "version" && state.selectedVersion == null
                ? "border-primary bg-primary/5 ring-2 ring-primary/30 dark:bg-primary/10"
                : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
            }`}
          >
            <input
              type="radio"
              name={`${slot}-version`}
              className="h-4 w-4 shrink-0 accent-primary"
              checked={state.selectionMode === "version" && state.selectedVersion == null}
              onChange={() => handleSelectVersion(slot, null)}
              disabled={busy}
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Don&apos;t include a cover letter
            </span>
          </label>
        ) : null}

        {state.versions.map((v) => {
          const checked = state.selectionMode === "version" && state.selectedVersion === v.version;
          const label = versionLabel(v);
          const previewBusy = previewLoadingKey === `${slot}:${v.version}`;
          return (
            <div
              key={v.version}
              className={`flex min-h-[44px] items-stretch gap-2 rounded-lg border transition ${
                checked
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30 dark:bg-primary/10"
                  : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
              }`}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 px-4 py-3">
                <input
                  type="radio"
                  name={`${slot}-version`}
                  className="mt-1 h-4 w-4 shrink-0 accent-primary"
                  checked={checked}
                  onChange={() => handleSelectVersion(slot, v.version)}
                  disabled={busy}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-gray-900 dark:text-white">{label}</span>
                  <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                    Version {v.version}
                    {v.version === state.currentVersion ? " · Current" : ""}
                    {" · "}
                    {formatVersionDate(v.createdAt)}
                  </span>
                </span>
              </label>
              <button
                type="button"
                className="my-2 mr-2 flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-primary transition hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-primary/10"
                onClick={(e) => void handlePreviewVersion(slot, v, label, e)}
                disabled={busy || previewBusy || !candidateId}
                aria-label={`Preview ${label}`}
              >
                {previewBusy ? "Opening…" : "View"}
              </button>
            </div>
          );
        })}
      </div>
    </fieldset>
  );

  const renderUploadCard = (
    slot: DocumentVersionSlot,
    state: SlotState,
    options: { heading: string; inputId: string; required: boolean; optionalHint?: string }
  ) => (
    <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600">
      <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">{options.heading}</p>
      <PublicApplyResumeUploadField
        resume={state.file}
        resumeInputRef={slotInputRef(slot)}
        onResumeSelected={(file) => handleFileSelected(slot, file)}
        inputId={options.inputId}
        label={SLOT_FIELD_LABEL[slot]}
        required={options.required}
        invalid={Boolean(state.uploadError)}
        {...(options.optionalHint ? { optionalHint: options.optionalHint } : {})}
      />

      {state.uploadError ? (
        <div
          role="alert"
          className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
        >
          {state.uploadError}
        </div>
      ) : null}

      {state.file ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-primary transition hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-primary/10"
            onClick={(e) => handlePreviewStagedFile(state.file as File, e)}
            disabled={busy}
            aria-label={`Preview ${state.file.name}`}
          >
            Preview selected file
          </button>
          {candidateId ? (
            <button
              type="button"
              className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => void handleUploadSlotFile(slot)}
              disabled={busy}
            >
              {state.uploading ? "Uploading…" : `Upload ${SLOT_NOUN[slot]}`}
            </button>
          ) : (
            <p className="text-sm text-stone-600 dark:text-stone-400 sm:flex sm:flex-1 sm:items-center">
              This file will be uploaded when you submit your application.
            </p>
          )}
        </div>
      ) : null}
      {state.file && candidateId ? (
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
          Save the file as a version before submitting so it appears under Saved versions.
        </p>
      ) : null}
    </div>
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl dark:bg-gray-800"
      >
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 id={titleId} className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            Choose resume · {jobTitle}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => !busy && onClose()}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:text-gray-200"
            aria-label="Close"
            disabled={busy}
          >
            ×
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-6" noValidate>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Select which resume recruiters should receive with this application. You can pick a saved version or upload a
            new file, and optionally attach a cover letter.
          </p>

          {formError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
            >
              {formError}
            </div>
          ) : null}

          {loadError ? (
            <div
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-100"
            >
              {loadError} You can still upload a new resume below.
            </div>
          ) : null}

          {previewError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
            >
              {previewError}
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-gray-600 dark:text-gray-400" role="status" aria-live="polite">
              Loading your saved documents…
            </p>
          ) : resumeSlot.versions.length > 0 ? (
            renderVersionList("resume", resumeSlot, { legend: "Saved versions", includeNone: false })
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No saved resume yet. Upload a file below to apply.
            </p>
          )}

          {renderUploadCard("resume", resumeSlot, {
            heading: "Upload a new resume",
            inputId: "apply-resume-picker-upload",
            required: uploadRequired,
            optionalHint: candidateId
              ? resumeSlot.versions.length > 0
                ? `Choose a file, then use Upload resume to save it before applying. ${PUBLIC_RESUME_FORMAT_MESSAGE}`
                : `Choose a file, then use Upload resume to save it to your profile. ${PUBLIC_RESUME_FORMAT_MESSAGE}`
              : resumeSlot.versions.length > 0
                ? `Optional when a saved version is selected above. ${PUBLIC_RESUME_FORMAT_MESSAGE}`
                : undefined,
          })}

          <div className="rounded-lg border border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setCoverOpen((prev) => !prev)}
              aria-expanded={coverOpen}
              aria-controls={coverPanelId}
              className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:bg-gray-700/50"
            >
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900 dark:text-white">
                  Add a cover letter{" "}
                  <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
                </span>
                {coverSummary ? (
                  <span className="mt-0.5 block truncate text-xs text-primary" title={coverSummary}>
                    {coverSummary}
                  </span>
                ) : null}
              </span>
              <i
                className={`ri-arrow-down-s-line shrink-0 text-xl text-gray-400 transition-transform motion-reduce:transition-none ${
                  coverOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              />
            </button>

            {coverOpen ? (
              <div id={coverPanelId} className="space-y-4 border-t border-gray-200 p-4 dark:border-gray-700">
                {loading ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400" role="status" aria-live="polite">
                    Loading your cover letters…
                  </p>
                ) : coverSlot.versions.length > 0 ? (
                  renderVersionList("cover-letter", coverSlot, {
                    legend: "Saved cover letters",
                    includeNone: true,
                  })
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No saved cover letter yet. Upload one below to attach it.
                  </p>
                )}

                {renderUploadCard("cover-letter", coverSlot, {
                  heading: "Upload a new cover letter",
                  inputId: "apply-cover-letter-picker-upload",
                  required: false,
                  optionalHint: candidateId
                    ? `Choose a file, then use Upload cover letter to save it before applying. ${PUBLIC_RESUME_FORMAT_MESSAGE}`
                    : `Optional. ${PUBLIC_RESUME_FORMAT_MESSAGE}`,
                })}
              </div>
            ) : null}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => !busy && onClose()}
              className="flex-1 rounded-lg border border-gray-300 px-6 py-3 text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-primary px-6 py-3 text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy || !canSubmit}
            >
              {submitting ? "Submitting…" : "Submit application"}
            </button>
          </div>
        </form>

        {inlinePreview ? (
          <div
            className="absolute inset-0 z-30 flex flex-col bg-white dark:bg-gray-800"
            role="dialog"
            aria-modal="true"
            aria-label={`Preview ${inlinePreview.title}`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <p className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white" title={inlinePreview.title}>
                {inlinePreview.title}
              </p>
              <button
                type="button"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-gray-500 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:text-gray-200"
                onClick={closeInlinePreview}
                aria-label="Close preview"
              >
                ×
              </button>
            </div>
            <iframe
              src={pdfViewerSrc(inlinePreview.url)}
              title={inlinePreview.title}
              className="min-h-0 flex-1 w-full border-0 bg-gray-100 dark:bg-gray-900"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
