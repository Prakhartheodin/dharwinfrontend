"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  type CandidateDocumentVersion,
  type DocumentVersionSlot,
  addCandidateDocumentVersion,
  deleteCandidateDocumentVersion,
  getDocumentVersionDownloadUrl,
  listCandidateDocumentVersions,
  uploadDocument,
} from "@/shared/lib/api/employees";
import { resolveDownloadUrlForBrowser } from "@/shared/lib/api/client";

const SLOT_TITLES: Record<DocumentVersionSlot, string> = {
  resume: "Resume / CV",
  "cover-letter": "Cover Letter",
};

const SLOT_UPLOAD_LABELS: Record<DocumentVersionSlot, string> = {
  resume: "CV/Resume",
  "cover-letter": "Cover Letter",
};

const RESUME_ACCEPT = ".pdf,.doc,.docx";
const COVER_LETTER_ACCEPT = ".pdf,.doc,.docx";

export type VersionedDocumentLike = {
  type?: string;
  label?: string;
  logicalSlot?: string;
};

function normalizeVersionSlot(raw: unknown): DocumentVersionSlot | null {
  if (raw == null) return null;
  const slot = String(raw).trim().toLowerCase();
  if (!slot) return null;
  if (slot === "resume" || slot === "cv" || slot === "cv/resume") return "resume";
  if (slot === "cover-letter" || slot === "cover_letter" || slot === "coverletter" || slot === "cover letter") {
    return "cover-letter";
  }
  return null;
}

export function inferDocumentVersionSlot(doc: VersionedDocumentLike | null | undefined): DocumentVersionSlot | null {
  if (!doc) return null;
  const explicit = normalizeVersionSlot(doc.logicalSlot);
  if (explicit) return explicit;
  const type = String(doc.type || "").trim().toLowerCase();
  if (type === "cv/resume" || type === "resume") return "resume";
  if (type === "cover letter") return "cover-letter";
  const label = String(doc.label || "").trim().toLowerCase();
  if (label === "cv/resume" || label === "resume") return "resume";
  if (label === "cover letter" || label === "cover-letter" || label === "coverletter") return "cover-letter";
  return null;
}

export function findLatestVersionedDocument<T extends VersionedDocumentLike>(
  docs: T[],
  slot: DocumentVersionSlot
): T | null {
  for (let i = docs.length - 1; i >= 0; i -= 1) {
    if (inferDocumentVersionSlot(docs[i]) === slot) return docs[i];
  }
  return null;
}

function formatVersionDate(value?: string): string {
  if (!value) return "Upload date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Upload date unavailable";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function versionFileName(version: CandidateDocumentVersion): string {
  return version.originalName || version.label || `Version ${version.version}`;
}

export type VersionedDocumentFallback = {
  originalName?: string;
  label?: string;
  url?: string;
};

type VersionedDocumentSlotProps = {
  candidateId: string;
  slot: DocumentVersionSlot;
  title?: string;
  fallbackDocument?: VersionedDocumentFallback | null;
  onUpdated?: () => void | Promise<void>;
};

export function VersionedDocumentSlot({
  candidateId,
  slot,
  title,
  fallbackDocument,
  onUpdated,
}: VersionedDocumentSlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<CandidateDocumentVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingVersion, setDownloadingVersion] = useState<number | null>(null);
  const [deletingVersion, setDeletingVersion] = useState<number | null>(null);
  const [pendingDeleteVersion, setPendingDeleteVersion] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const displayTitle = title || SLOT_TITLES[slot];
  const accept = slot === "resume" ? RESUME_ACCEPT : COVER_LETTER_ACCEPT;

  const loadVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listCandidateDocumentVersions(candidateId, slot);
      setVersions(data.versions);
      setCurrentVersion(data.currentVersion);
    } catch {
      setError("Could not load version history.");
      setVersions([]);
      setCurrentVersion(null);
    } finally {
      setLoading(false);
    }
  }, [candidateId, slot]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  const current = versions.find((row) => row.version === currentVersion) ?? versions[0] ?? null;
  const priorVersions = versions.filter((row) => row.version !== current?.version);
  const fallbackName = fallbackDocument?.originalName || fallbackDocument?.label || null;
  const hasFallbackOnly = !current && Boolean(fallbackDocument?.url);

  const handleDownload = async (version: number) => {
    setDownloadingVersion(version);
    setDeleteError(null);
    try {
      const data = await getDocumentVersionDownloadUrl(candidateId, slot, version);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setDeleteError("Could not download this version. Try again.");
    } finally {
      setDownloadingVersion(null);
    }
  };

  const handleDelete = async (version: number) => {
    setDeletingVersion(version);
    setDeleteError(null);
    try {
      await deleteCandidateDocumentVersion(candidateId, slot, version);
      setPendingDeleteVersion(null);
      await loadVersions();
      await onUpdated?.();
    } catch {
      setDeleteError("Could not remove this version. Try again.");
    } finally {
      setDeletingVersion(null);
    }
  };

  const renderVersionActions = (version: number, labelPrefix: string) => {
    const isDownloading = downloadingVersion === version;
    const isDeleting = deletingVersion === version;
    const isConfirming = pendingDeleteVersion === version;

    if (isConfirming) {
      return (
        <div
          className="flex flex-wrap items-center justify-end gap-2"
          role="alertdialog"
          aria-labelledby={`${slot}-delete-confirm-${version}`}
        >
          <p id={`${slot}-delete-confirm-${version}`} className="mb-0 text-xs text-gray-600 dark:text-gray-300">
            Remove this version permanently?
          </p>
          <button
            type="button"
            className="ti-btn ti-btn-danger !min-h-[44px] !py-1.5 !px-3 !text-xs"
            onClick={() => void handleDelete(version)}
            disabled={isDeleting}
            aria-label={`Confirm remove ${labelPrefix} of ${displayTitle}`}
          >
            {isDeleting ? "Removing…" : "Yes, remove"}
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-outline-secondary !min-h-[44px] !py-1.5 !px-3 !text-xs"
            onClick={() => setPendingDeleteVersion(null)}
            disabled={isDeleting}
            aria-label={`Cancel remove ${labelPrefix} of ${displayTitle}`}
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          className="ti-btn ti-btn-outline-primary !min-h-[44px] !py-1.5 !px-3 !text-xs"
          onClick={() => void handleDownload(version)}
          disabled={isDownloading || isDeleting}
          aria-label={`Download ${labelPrefix} of ${displayTitle}`}
        >
          {isDownloading ? "Downloading…" : "Download"}
        </button>
        <button
          type="button"
          className="ti-btn ti-btn-outline-danger !min-h-[44px] !py-1.5 !px-3 !text-xs"
          onClick={() => {
            setPendingDeleteVersion(version);
            setDeleteError(null);
          }}
          disabled={isDownloading || isDeleting}
          aria-label={`Remove ${labelPrefix} of ${displayTitle}`}
        >
          Remove
        </button>
      </div>
    );
  };

  const handleReplaceFile = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadDocument(file, SLOT_UPLOAD_LABELS[slot]);
      await addCandidateDocumentVersion(candidateId, slot, {
        type: slot === "resume" ? "CV/Resume" : "Other",
        label: SLOT_UPLOAD_LABELS[slot],
        documentUrl: uploaded.url,
        key: uploaded.key,
        originalName: uploaded.originalName,
        size: uploaded.size,
        mimeType: uploaded.mimeType,
      });
      await loadVersions();
      await onUpdated?.();
    } catch {
      setUploadError("Upload failed. Check the file type and try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <section
      className="rounded-sm border border-defaultborder/60 bg-gray-50/80 p-4 dark:border-white/10 dark:bg-gray-800/40"
      aria-label={`${displayTitle} versions`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h6 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{displayTitle}</h6>
          <p className="mb-0 text-xs text-gray-500 dark:text-gray-400">
            Replacing the file saves a new version and keeps prior uploads.
          </p>
        </div>
        {current || hasFallbackOnly ? (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            Current
          </span>
        ) : null}
      </div>

      {loading ? (
        <p className="mb-0 text-sm text-gray-500 dark:text-gray-400" role="status" aria-live="polite">
          Loading versions…
        </p>
      ) : null}

      {!loading && error ? (
        <p className="mb-3 text-sm text-danger" role="alert">{error}</p>
      ) : null}

      {!loading && !error ? (
        <>
          {current ? (
            <div className="mb-3 rounded-sm border border-defaultborder/50 bg-white p-3 dark:border-white/10 dark:bg-gray-900/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="mb-0 truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                    {versionFileName(current)}
                  </p>
                  <p className="mb-0 text-xs text-gray-500 dark:text-gray-400">
                    Uploaded {formatVersionDate(current.createdAt)}
                  </p>
                </div>
                {renderVersionActions(current.version, "current version")}
              </div>
            </div>
          ) : hasFallbackOnly ? (
            <div className="mb-3 rounded-sm border border-defaultborder/50 bg-white p-3 dark:border-white/10 dark:bg-gray-900/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="mb-0 truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                    {fallbackName || displayTitle}
                  </p>
                  <p className="mb-0 text-xs text-gray-500 dark:text-gray-400">
                    Existing file on profile. Upload a replacement to start version history.
                  </p>
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-outline-primary !py-1.5 !px-3 !text-xs"
                  onClick={() => {
                    if (fallbackDocument?.url) {
                      window.open(resolveDownloadUrlForBrowser(fallbackDocument.url), "_blank", "noopener,noreferrer");
                    }
                  }}
                  aria-label={`Download current ${displayTitle}`}
                >
                  Download
                </button>
              </div>
            </div>
          ) : (
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              No file uploaded yet.
            </p>
          )}

          {deleteError ? (
            <p className="mb-3 text-sm text-danger" role="alert">{deleteError}</p>
          ) : null}

          {versions.length > 1 ? (
            <div className="mb-3">
              <button
                type="button"
                className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-sm font-medium text-primary hover:underline"
                onClick={() => setHistoryOpen((open) => !open)}
                aria-expanded={historyOpen}
                aria-controls={`${slot}-version-history`}
              >
                <i
                  className={`ri-arrow-right-s-line text-base transition-transform ${historyOpen ? "rotate-90" : ""}`}
                  aria-hidden="true"
                />
                Version history ({priorVersions.length})
              </button>
              {historyOpen ? (
                <ul
                  id={`${slot}-version-history`}
                  className="mt-2 space-y-2 border-l border-defaultborder/40 pl-3 dark:border-white/10"
                >
                  {priorVersions.map((row) => (
                    <li
                      key={row.version}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-defaultborder/40 bg-white px-3 py-2 dark:border-white/10 dark:bg-gray-900/30"
                    >
                      <div className="min-w-0">
                        <p className="mb-0 text-sm text-gray-800 dark:text-gray-100">
                          Version {row.version}
                        </p>
                        <p className="mb-0 truncate text-xs text-gray-500 dark:text-gray-400">
                          {versionFileName(row)} · {formatVersionDate(row.createdAt)}
                        </p>
                      </div>
                      {renderVersionActions(row.version, `version ${row.version}`)}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}

      <div>
        <label className="form-label" htmlFor={`${slot}-replace-file`}>
          {current || hasFallbackOnly ? "Replace file" : "Upload file"}
        </label>
        <input
          ref={fileInputRef}
          id={`${slot}-replace-file`}
          type="file"
          accept={accept}
          className="form-control w-full !rounded-md"
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleReplaceFile(file);
          }}
        />
        <small className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
          Supported formats: PDF, DOC, DOCX
        </small>
        {uploading ? (
          <p className="mb-0 mt-2 text-sm text-gray-600 dark:text-gray-300" role="status" aria-live="polite">
            Uploading and saving new version…
          </p>
        ) : null}
        {uploadError ? (
          <p className="mb-0 mt-2 text-sm text-danger" role="alert">{uploadError}</p>
        ) : null}
      </div>
    </section>
  );
}
