"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { isAxiosError } from "axios";
import {
  addCandidateDocumentVersion,
  getMyCandidate,
  getCandidateListItemId,
  getDocumentVersionDownloadUrl,
  listCandidateDocumentVersions,
  uploadDocument,
  type CandidateDocumentVersion,
} from "@/shared/lib/api/employees";
import { browseApplyToJob } from "@/shared/lib/api/jobs";
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

const RESUME_UPLOAD_LABEL = "CV/Resume";

function getResumeUploadErrorMessage(error: unknown): string {
  if (isAxiosError(error) && error.response?.data) {
    const data = error.response.data as { message?: string };
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
    if (error.response.status === 401) {
      return "Your session has expired. Sign in again and retry.";
    }
    if (error.response.status === 403) {
      return "You do not have permission to save this resume.";
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [versions, setVersions] = useState<CandidateDocumentVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("version");
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [inlinePreview, setInlinePreview] = useState<InlinePreviewState | null>(null);
  const [previewLoadingVersion, setPreviewLoadingVersion] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

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

  const loadResumeVersions = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      let candidate;
      try {
        candidate = await getMyCandidate();
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          setCandidateId(null);
          setVersions([]);
          setCurrentVersion(null);
          setSelectedVersion(null);
          setSelectionMode("upload");
          return;
        }
        throw err;
      }

      const resolvedCandidateId = getCandidateListItemId(candidate);
      if (!resolvedCandidateId) {
        setCandidateId(null);
        setVersions([]);
        setCurrentVersion(null);
        setSelectedVersion(null);
        setSelectionMode("upload");
        setLoadError("We couldn't load saved resume versions. You can still upload a new resume below.");
        return;
      }

      setCandidateId(resolvedCandidateId);
      const data = await listCandidateDocumentVersions(resolvedCandidateId, "resume");
      setVersions(data.versions ?? []);
      setCurrentVersion(data.currentVersion);
      const initial = data.currentVersion ?? data.versions?.[0]?.version ?? null;
      setSelectedVersion(initial);
      setSelectionMode(data.versions?.length ? "version" : "upload");
    } catch (err) {
      setCandidateId(null);
      setLoadError(getApplyErrorMessage(err));
      setVersions([]);
      setCurrentVersion(null);
      setSelectedVersion(null);
      setSelectionMode("upload");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setUploadError(null);
    setPreviewError(null);
    setResumeFile(null);
    setUploadingResume(false);
    closeInlinePreview();
    void loadResumeVersions();
  }, [open, loadResumeVersions, closeInlinePreview]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || submitting || uploadingResume) return;
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
  }, [open, onClose, submitting, uploadingResume, inlinePreview, closeInlinePreview]);

  const handlePreviewVersion = async (
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
    setPreviewLoadingVersion(version.version);
    try {
      const data = await getDocumentVersionDownloadUrl(candidateId, "resume", version.version);
      const fileName = data.fileName || version.originalName || displayLabel;
      openResolvedPreview(data.url, fileName, data.mimeType || version.mimeType || "");
    } catch (err) {
      setPreviewError(getApplyErrorMessage(err));
    } finally {
      setPreviewLoadingVersion(null);
    }
  };

  const handlePreviewUpload = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!resumeFile) return;
    setPreviewError(null);
    const url = URL.createObjectURL(resumeFile);
    openResolvedPreview(url, resumeFile.name, resumeFile.type, true);
  };

  const handleResumeSelected = (file: File) => {
    if (!isPublicResumeFile(file)) {
      setFormError(PUBLIC_RESUME_FORMAT_MESSAGE);
      setResumeFile(null);
      return;
    }
    setFormError(null);
    setUploadError(null);
    setResumeFile(file);
    setSelectionMode("upload");
    setSelectedVersion(null);
  };

  const handleUploadResume = async () => {
    if (!resumeFile || uploadingResume || submitting) return;
    if (!candidateId) {
      setUploadError("No candidate profile is linked yet. Submit your application to upload this resume.");
      return;
    }
    setUploadingResume(true);
    setUploadError(null);
    setFormError(null);
    try {
      const uploaded = await uploadDocument(resumeFile, RESUME_UPLOAD_LABEL);
      const result = await addCandidateDocumentVersion(candidateId, "resume", {
        type: "CV/Resume",
        label: RESUME_UPLOAD_LABEL,
        documentUrl: uploaded.url,
        key: uploaded.key,
        originalName: uploaded.originalName,
        size: uploaded.size,
        mimeType: uploaded.mimeType,
      });
      const data = await listCandidateDocumentVersions(candidateId, "resume");
      setVersions(data.versions ?? []);
      setCurrentVersion(data.currentVersion);
      const newVersion = result.version?.version ?? data.currentVersion ?? null;
      setSelectedVersion(newVersion);
      setSelectionMode("version");
      setResumeFile(null);
      if (resumeInputRef.current) {
        resumeInputRef.current.value = "";
      }
    } catch (err) {
      setUploadError(getResumeUploadErrorMessage(err));
    } finally {
      setUploadingResume(false);
    }
  };

  const canSubmit = canSubmitBrowseJobApplyResume({
    selectionMode,
    selectedVersion,
    versions,
    resumeFile,
    candidateId,
    uploadingResume,
  });

  const uploadRequired = !loading && versions.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting || uploadingResume) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (selectionMode === "upload" && resumeFile && !candidateId) {
        await browseApplyToJob(jobId, {
          ref: referralRef ?? undefined,
          resumeFile,
        });
      } else if (selectedVersion != null) {
        await browseApplyToJob(jobId, {
          ref: referralRef ?? undefined,
          resumeVersion: selectedVersion,
        });
      } else {
        setFormError("Choose a resume version or upload a file to continue.");
        return;
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      setFormError(getApplyErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting && !uploadingResume) onClose();
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
            onClick={() => !submitting && !uploadingResume && onClose()}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-2xl text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:text-gray-200"
            aria-label="Close"
            disabled={submitting || uploadingResume}
          >
            ×
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-6" noValidate>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Select which resume recruiters should receive with this application. You can pick a saved version or upload a
            new file.
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

          {uploadError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
            >
              {uploadError}
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-gray-600 dark:text-gray-400" role="status" aria-live="polite">
              Loading your resume versions…
            </p>
          ) : versions.length > 0 ? (
            <fieldset>
              <legend className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Saved versions
              </legend>
              <div
                className="space-y-2"
                role="radiogroup"
                aria-label="Resume version"
              >
                {versions.map((v) => {
                  const checked = selectionMode === "version" && selectedVersion === v.version;
                  const label = v.originalName || v.label || `Version ${v.version}`;
                  const previewBusy = previewLoadingVersion === v.version;
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
                          name="resume-version"
                          className="mt-1 h-4 w-4 shrink-0 accent-primary"
                          checked={checked}
                          onChange={() => {
                            setSelectionMode("version");
                            setSelectedVersion(v.version);
                            setResumeFile(null);
                            setFormError(null);
                            setUploadError(null);
                          }}
                          disabled={submitting || uploadingResume}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-gray-900 dark:text-white">{label}</span>
                          <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                            Version {v.version}
                            {v.version === currentVersion ? " · Current" : ""}
                            {" · "}
                            {formatVersionDate(v.createdAt)}
                          </span>
                        </span>
                      </label>
                      <button
                        type="button"
                        className="my-2 mr-2 flex min-h-[44px] shrink-0 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-primary transition hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-primary/10"
                        onClick={(e) => void handlePreviewVersion(v, label, e)}
                        disabled={submitting || uploadingResume || previewBusy || !candidateId}
                        aria-label={`Preview ${label}`}
                      >
                        {previewBusy ? "Opening…" : "View"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No saved resume yet. Upload a file below to apply.
            </p>
          )}

          <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600">
            <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Upload a new resume</p>
            <PublicApplyResumeUploadField
              resume={resumeFile}
              resumeInputRef={resumeInputRef}
              onResumeSelected={handleResumeSelected}
              inputId="apply-resume-picker-upload"
              required={uploadRequired}
              optionalHint={
                candidateId
                  ? versions.length > 0
                    ? `Choose a file, then use Upload resume to save it before applying. ${PUBLIC_RESUME_FORMAT_MESSAGE}`
                    : `Choose a file, then use Upload resume to save it to your profile. ${PUBLIC_RESUME_FORMAT_MESSAGE}`
                  : versions.length > 0
                    ? `Optional when a saved version is selected above. ${PUBLIC_RESUME_FORMAT_MESSAGE}`
                    : undefined
              }
            />
            {resumeFile ? (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-primary transition hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-primary/10"
                  onClick={handlePreviewUpload}
                  disabled={submitting || uploadingResume}
                  aria-label={`Preview ${resumeFile.name}`}
                >
                  Preview selected file
                </button>
                {candidateId ? (
                  <button
                    type="button"
                    className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => void handleUploadResume()}
                    disabled={submitting || uploadingResume}
                  >
                    {uploadingResume ? "Uploading…" : "Upload resume"}
                  </button>
                ) : (
                  <p className="text-sm text-stone-600 dark:text-stone-400 sm:flex sm:flex-1 sm:items-center">
                    This file will be uploaded when you submit your application.
                  </p>
                )}
              </div>
            ) : null}
            {resumeFile && candidateId ? (
              <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                Save the file as a version before submitting so it appears under Saved versions.
              </p>
            ) : null}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => !submitting && !uploadingResume && onClose()}
              className="flex-1 rounded-lg border border-gray-300 px-6 py-3 text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={submitting || uploadingResume}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-primary px-6 py-3 text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting || uploadingResume || !canSubmit}
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
