"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type CandidateDocumentVersion,
  type DocumentVersionSlot,
  addCandidateDocumentVersion,
  restoreCandidateDocumentVersion,
  deleteCandidateDocumentVersion,
  getDocumentVersionDownloadUrl,
  isMongoObjectId,
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

const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(",");
/** Matches the server's multer limit (UPLOAD_MAX_FILE_BYTES, default 25 MB). */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

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

/**
 * Mirrors the backend's `inferVersionSlotFromDocument`
 * (`uat.dharwin.backend/src/utils/documentVersionSlot.js`). The two must agree — when this side
 * called a row "the resume" and the server did not, the next upload appended a second resume row
 * instead of replacing the first. A unit test pins the backend half.
 */
export function inferDocumentVersionSlot(doc: VersionedDocumentLike | null | undefined): DocumentVersionSlot | null {
  if (!doc) return null;
  const explicit = normalizeVersionSlot(doc.logicalSlot);
  if (explicit) return explicit;
  const type = String(doc.type || "").trim().toLowerCase();
  if (type === "cv/resume" || type === "resume" || type === "cv") return "resume";
  if (type === "cover letter") return "cover-letter";
  const label = String(doc.label || "").trim().toLowerCase();
  if (label === "cv/resume" || label === "resume" || label === "cv") return "resume";
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

function formatBytes(bytes?: number | null): string | null {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes <= 0) return null;
  const units = ["B", "KB", "MB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 || value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** A version keeps the name its uploader gave it; otherwise it is known by its filename. */
function versionDisplayName(version: CandidateDocumentVersion, slot: DocumentVersionSlot): string {
  const label = (version.label || "").trim();
  if (label && label !== SLOT_UPLOAD_LABELS[slot]) return label;
  return version.originalName || SLOT_UPLOAD_LABELS[slot] || `Version ${version.version}`;
}

const GENERIC_SLOT_LABELS = new Set<string>(Object.values(SLOT_UPLOAD_LABELS));

/** Profile / read views: prefer the stored filename over generic slot labels like "CV/Resume". */
export function candidateDocumentProfileDisplayName(
  doc: VersionedDocumentLike & { originalName?: string; type?: string },
  fallback = "Document"
): string {
  const originalName = String(doc.originalName || "").trim();
  if (originalName) return originalName;
  const label = String(doc.label || "").trim();
  const type = String(doc.type || "").trim();
  if (label && !GENERIC_SLOT_LABELS.has(label)) return label;
  if (type && !GENERIC_SLOT_LABELS.has(type)) return type;
  const slot = inferDocumentVersionSlot(doc);
  if (slot) return SLOT_TITLES[slot];
  return label || type || fallback;
}

/** Client-side guard before PATCH restore — mirrors backend no-op when already active. */
export function isDocumentVersionAlreadyCurrent(
  currentVersion: number | null,
  targetVersion: number,
  currentKey?: string | null,
  targetKey?: string | null
): boolean {
  if (currentVersion != null && currentVersion === targetVersion) return true;
  const ck = String(currentKey || "").trim();
  const tk = String(targetKey || "").trim();
  return Boolean(ck && tk && ck === tk);
}

function formatCurrentVersionMeta(
  versionNumber: number,
  savedCount: number,
  createdAt?: string,
  createdByName?: string | null,
  size?: number | null
): string {
  const parts = [
    savedCount <= 1 ? `Version ${versionNumber}` : `Version ${versionNumber} · ${savedCount} saved`,
    `Uploaded ${formatVersionDate(createdAt)}`,
    createdByName ? `by ${createdByName}` : null,
    formatBytes(size),
  ];
  return parts.filter(Boolean).join(" · ");
}

/**
 * Every failure here used to read "Upload failed. Check the file type and try again.", which sent
 * people hunting for a file problem when the server had actually answered 403.
 */
function apiErrorMessage(err: unknown, fallback: string): string {
  const res = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
  if (res?.status === 401) return "Your session has expired. Sign in again and retry.";
  if (res?.status === 403) return "You do not have permission to change this document.";
  if (res?.status === 413) return `That file is too large. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  const message = res?.data?.message;
  return typeof message === "string" && message.trim() ? message.trim() : fallback;
}

/** The accept attribute is only a hint, and the upload endpoint applies no filter of its own. */
function rejectionReason(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return `${file.name} is not a supported format. Upload a PDF, DOC or DOCX.`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name} is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`;
  }
  return null;
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
  /** Anchor id for in-page jump links from the generic document dropdown. */
  sectionId?: string;
};

export function VersionedDocumentSlot({
  candidateId,
  slot,
  title,
  fallbackDocument,
  onUpdated,
  sectionId,
}: VersionedDocumentSlotProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const promoteInFlightRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<CandidateDocumentVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingVersion, setDownloadingVersion] = useState<number | null>(null);
  const [deletingVersion, setDeletingVersion] = useState<number | null>(null);
  const [promotingVersion, setPromotingVersion] = useState<number | null>(null);
  const [pendingDeleteVersion, setPendingDeleteVersion] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Staged, not yet uploaded. Replacing is destructive, so it is confirmed rather than fired on pick.
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [versionName, setVersionName] = useState("");

  const slotContextLabel = title || SLOT_TITLES[slot];

  const loadVersions = useCallback(async () => {
    if (!isMongoObjectId(candidateId)) {
      setLoading(false);
      setError(null);
      setVersions([]);
      setCurrentVersion(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await listCandidateDocumentVersions(candidateId, slot);
      setVersions(data.versions);
      setCurrentVersion(data.currentVersion);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not load version history."));
      setVersions([]);
      setCurrentVersion(null);
    } finally {
      setLoading(false);
    }
  }, [candidateId, slot]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  const current = useMemo(
    () => versions.find((row) => row.version === currentVersion) ?? versions[0] ?? null,
    [versions, currentVersion]
  );
  const priorVersions = versions.filter((row) => row.version !== current?.version);
  const fallbackName = fallbackDocument?.originalName || fallbackDocument?.label || null;
  const hasFallbackOnly = !current && Boolean(fallbackDocument?.url);
  const currentName = current ? versionDisplayName(current, slot) : fallbackName;
  const primaryHeading = currentName || slotContextLabel;
  const showSlotContextBadge = Boolean(currentName);
  const nextVersionNumber = (versions.length > 0 ? Math.max(...versions.map((v) => v.version)) : 0) + 1;

  const clearStaged = useCallback(() => {
    setStagedFile(null);
    setVersionName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleDownload = async (version: number) => {
    setDownloadingVersion(version);
    setDeleteError(null);
    try {
      const data = await getDocumentVersionDownloadUrl(candidateId, slot, version);
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setDeleteError(apiErrorMessage(err, "Could not download this version. Try again."));
    } finally {
      setDownloadingVersion(null);
    }
  };

  const handlePromote = async (row: CandidateDocumentVersion) => {
    if (uploading || promoteInFlightRef.current) return;
    if (
      isDocumentVersionAlreadyCurrent(
        currentVersion,
        row.version,
        current?.key,
        row.key
      )
    ) {
      return;
    }
    promoteInFlightRef.current = true;
    setPromotingVersion(row.version);
    setDeleteError(null);
    try {
      const result = await restoreCandidateDocumentVersion(candidateId, slot, row.version);
      setCurrentVersion(result.currentVersion);
      await loadVersions();
      await onUpdated?.();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, "Could not set this version as current. Try again."));
    } finally {
      promoteInFlightRef.current = false;
      setPromotingVersion(null);
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
      // The row that held focus is gone; park it on the slot heading rather than losing it to <body>.
      headingRef.current?.focus();
    } catch (err) {
      setDeleteError(apiErrorMessage(err, "Could not remove this version. Try again."));
    } finally {
      setDeletingVersion(null);
    }
  };

  const renderVersionActions = (version: number, labelPrefix: string, options?: { isCurrent?: boolean }) => {
    const isCurrent = options?.isCurrent ?? false;
    const isDownloading = downloadingVersion === version;
    const isDeleting = deletingVersion === version;
    const isPromoting = promotingVersion === version;
    const promoteBlocked = uploading || promotingVersion !== null;
    const isConfirming = pendingDeleteVersion === version;
    const row = versions.find((v) => v.version === version);

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
            disabled={isDeleting || isPromoting}
            aria-label={`Confirm remove ${labelPrefix} of ${slotContextLabel}`}
          >
            {isDeleting ? "Removing…" : "Yes, remove"}
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-outline-secondary !min-h-[44px] !py-1.5 !px-3 !text-xs"
            onClick={() => setPendingDeleteVersion(null)}
            disabled={isDeleting}
            aria-label={`Cancel remove ${labelPrefix} of ${slotContextLabel}`}
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
          disabled={isDownloading || isDeleting || isPromoting}
          aria-label={`Download ${labelPrefix} of ${slotContextLabel}`}
        >
          {isDownloading ? "Downloading…" : "Download"}
        </button>
        {!isCurrent && row ? (
          <button
            type="button"
            className="ti-btn ti-btn-outline-secondary !min-h-[44px] !py-1.5 !px-3 !text-xs"
            onClick={() => void handlePromote(row)}
            disabled={isDownloading || isDeleting || isPromoting || promoteBlocked}
            aria-label={`Use version ${version} as current ${slotContextLabel}`}
          >
            {isPromoting ? "Switching…" : "Use as current"}
          </button>
        ) : null}
        <button
          type="button"
          className="ti-btn ti-btn-outline-danger !min-h-[44px] !py-1.5 !px-3 !text-xs"
          onClick={() => {
            setPendingDeleteVersion(version);
            setDeleteError(null);
          }}
          disabled={isDownloading || isDeleting || isPromoting}
          aria-label={`Remove ${labelPrefix} of ${slotContextLabel}`}
        >
          Remove
        </button>
      </div>
    );
  };

  const handleStageFile = (file: File) => {
    const reason = rejectionReason(file);
    if (reason) {
      setUploadError(reason);
      clearStaged();
      return;
    }
    setUploadError(null);
    setStagedFile(file);
    setVersionName("");
  };

  const handleSaveVersion = async () => {
    if (!stagedFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await uploadDocument(stagedFile, SLOT_UPLOAD_LABELS[slot]);
      const chosenName = versionName.trim();
      await addCandidateDocumentVersion(candidateId, slot, {
        type: slot === "resume" ? "CV/Resume" : "Other",
        // A name the user typed becomes this version's label; otherwise the slot's canonical one.
        label: chosenName || SLOT_UPLOAD_LABELS[slot],
        documentUrl: uploaded.url,
        key: uploaded.key,
        originalName: uploaded.originalName,
        size: uploaded.size,
        mimeType: uploaded.mimeType,
      });
      clearStaged();
      await loadVersions();
      await onUpdated?.();
    } catch (err) {
      setUploadError(apiErrorMessage(err, "Upload failed. Check the file and try again."));
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      id={sectionId}
      className="rounded-sm border border-defaultborder/60 bg-gray-50/80 p-4 dark:border-white/10 dark:bg-gray-800/40 scroll-mt-4"
      aria-label={`${slotContextLabel} versions`}
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h6
              ref={headingRef}
              tabIndex={-1}
              className="truncate text-sm font-semibold text-gray-800 outline-none dark:text-gray-200"
              title={primaryHeading}
            >
              {primaryHeading}
            </h6>
            {showSlotContextBadge ? (
              <span className="inline-flex shrink-0 items-center rounded-full bg-gray-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-gray-600 dark:text-gray-300">
                {slotContextLabel}
              </span>
            ) : null}
          </div>
          <p className="mb-0 text-xs text-gray-500 dark:text-gray-400">
            Replacing the file saves a new version and keeps prior uploads. Use as current switches to a saved copy without uploading again.
          </p>
        </div>
        {current ? (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            Version {currentVersion ?? current.version}
          </span>
        ) : hasFallbackOnly ? (
          <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
            Not versioned yet
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
                  <p
                    className="mb-0 truncate text-sm font-medium text-gray-800 dark:text-gray-100"
                    title={versionDisplayName(current, slot)}
                  >
                    {versionDisplayName(current, slot)}
                  </p>
                  <p className="mb-0 text-xs text-gray-500 dark:text-gray-400">
                    {formatCurrentVersionMeta(
                      currentVersion ?? current.version,
                      versions.length,
                      current.createdAt,
                      current.createdByName,
                      current.size
                    )}
                  </p>
                </div>
                {renderVersionActions(current.version, "current version", { isCurrent: true })}
              </div>
            </div>
          ) : hasFallbackOnly ? (
            <div className="mb-3 rounded-sm border border-defaultborder/50 bg-white p-3 dark:border-white/10 dark:bg-gray-900/40">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p
                    className="mb-0 truncate text-sm font-medium text-gray-800 dark:text-gray-100"
                    title={fallbackName || slotContextLabel}
                  >
                    {fallbackName || slotContextLabel}
                  </p>
                  <p className="mb-0 text-xs text-gray-500 dark:text-gray-400">
                    Existing file on profile. Replacing it keeps this copy as version 1.
                  </p>
                </div>
                <button
                  type="button"
                  className="ti-btn ti-btn-outline-primary !min-h-[44px] !py-1.5 !px-3 !text-xs"
                  onClick={() => {
                    if (fallbackDocument?.url) {
                      window.open(resolveDownloadUrlForBrowser(fallbackDocument.url), "_blank", "noopener,noreferrer");
                    }
                  }}
                  aria-label={`Download current ${slotContextLabel}`}
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

          {priorVersions.length > 0 ? (
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
                        <p
                          className="mb-0 truncate text-xs text-gray-500 dark:text-gray-400"
                          title={versionDisplayName(row, slot)}
                        >
                          {[
                            versionDisplayName(row, slot),
                            formatVersionDate(row.createdAt),
                            row.createdByName ? `by ${row.createdByName}` : null,
                            formatBytes(row.size),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
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

      {stagedFile ? (
        <div
          className="rounded-sm border border-primary/40 bg-primary/5 p-3"
          role="group"
          aria-label={`Confirm new version of ${slotContextLabel}`}
        >
          <p className="mb-2 text-sm text-gray-800 dark:text-gray-100">
            {currentName ? (
              <>
                Replacing <span className="font-medium">{currentName}</span> with{" "}
                <span className="font-medium">{stagedFile.name}</span>
                {formatBytes(stagedFile.size) ? ` (${formatBytes(stagedFile.size)})` : ""}.
              </>
            ) : (
              <>
                Uploading <span className="font-medium">{stagedFile.name}</span>
                {formatBytes(stagedFile.size) ? ` (${formatBytes(stagedFile.size)})` : ""}.
              </>
            )}
          </p>
          {currentName ? (
            <p className="mb-3 text-xs text-gray-600 dark:text-gray-300">
              The current file is kept as version {Math.max(nextVersionNumber - 1, 1)} and stays downloadable.
            </p>
          ) : null}

          <label className="form-label" htmlFor={`${slot}-version-name`}>
            Display name <span className="text-gray-500">(optional)</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id={`${slot}-version-name`}
              type="text"
              className="form-control !min-h-[44px] !rounded-md"
              style={{ flex: "1 1 14rem" }}
              value={versionName}
              maxLength={120}
              placeholder={stagedFile.name}
              onChange={(event) => setVersionName(event.target.value)}
              disabled={uploading}
              aria-describedby={`${slot}-version-name-help`}
            />
            {currentName ? (
              <button
                type="button"
                className="ti-btn ti-btn-outline-secondary !min-h-[44px] !py-1.5 !px-3 !text-xs"
                onClick={() => setVersionName(currentName)}
                disabled={uploading}
              >
                Use current name
              </button>
            ) : null}
          </div>
          <small id={`${slot}-version-name-help`} className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
            Leave blank to use the uploaded file&apos;s name.
          </small>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="ti-btn ti-btn-primary !min-h-[44px] !py-1.5 !px-3 !text-xs"
              onClick={() => void handleSaveVersion()}
              disabled={uploading}
            >
              {uploading ? "Saving…" : `Save as version ${nextVersionNumber}`}
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-outline-secondary !min-h-[44px] !py-1.5 !px-3 !text-xs"
              onClick={clearStaged}
              disabled={uploading}
            >
              Cancel
            </button>
          </div>
          {uploading ? (
            <p className="mb-0 mt-2 text-sm text-gray-600 dark:text-gray-300" role="status" aria-live="polite">
              Uploading and saving new version…
            </p>
          ) : null}
          {uploadError ? (
            <p className="mb-0 mt-2 text-sm text-danger" role="alert">{uploadError}</p>
          ) : null}
        </div>
      ) : (
        <div>
          <label className="form-label" htmlFor={`${slot}-replace-file`}>
            {current || hasFallbackOnly ? `Replace ${slotContextLabel.toLowerCase()}` : `Upload ${slotContextLabel.toLowerCase()}`}
          </label>
          <input
            ref={fileInputRef}
            id={`${slot}-replace-file`}
            type="file"
            accept={ACCEPT_ATTR}
            className="form-control w-full !rounded-md"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleStageFile(file);
            }}
            disabled={uploading || promotingVersion !== null}
          />
          <small className="mt-1 block text-xs text-gray-500 dark:text-gray-400">
            Supported formats: PDF, DOC, DOCX · up to {formatBytes(MAX_UPLOAD_BYTES)}. You can review before saving.
          </small>
          {uploadError ? (
            <p className="mb-0 mt-2 text-sm text-danger" role="alert">{uploadError}</p>
          ) : null}
        </div>
      )}
    </section>
  );
}
