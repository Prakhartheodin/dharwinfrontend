"use client";

import { useEffect, useRef, useState } from "react";
import { inferDocumentVersionSlot } from "@/shared/components/candidates/VersionedDocumentSlot";
import {
  ApplicationDocumentSlotsSection,
  GenericDocumentTypeSelect,
  getReservedVersionedDocumentLabelError,
  OtherDocumentsDropdownNote,
  OtherDocumentsSectionHeader,
  ReservedVersionedLabelError,
  resolveGenericDocumentUploadLabel,
} from "@/shared/components/candidates/documentUploadUx";
import { useWorkforceStore } from "../state/workforce.store";
import { useWizardContext } from "../engine/WizardContext";
import wizardUi from "../engine/workforce-wizard.module.css";
import salaryStyles from "./salary-step.module.css";
import { useDocumentUpload } from "../resources/useDocumentUpload";
import { ResumeSkillsExtractOverlay } from "../components/ResumeSkillsExtractOverlay";
import { useResumeSkillsExtract } from "../resources/useResumeSkillsExtract";
import type { DocumentResource } from "../types/resource.types";

type DraftRow = {
  draftId: string;
  type: string;
  customName: string;
};

let draftCounter = 0;
const newDraftId = () => `draft-${Date.now()}-${++draftCounter}`;

function DraftFileButton({
  disabled,
  onFile,
}: {
  disabled: boolean;
  onFile: (file: File) => void;
}) {
  const inputId = `doc-upload-${Math.random().toString(36).slice(2)}`;
  return (
    <div className="flex w-full flex-col">
      <input
        id={inputId}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        className={salaryStyles.hiddenFile}
        disabled={disabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onFile(file);
        }}
      />
      <label
        htmlFor={inputId}
        className={`${salaryStyles.uploadBtn} ${
          disabled ? "pointer-events-none cursor-not-allowed opacity-55" : ""
        }`}
      >
        <i className="ri-upload-2-line" aria-hidden="true" />
        Choose file
      </label>
      <small className={salaryStyles.fieldHint}>
        Supported formats: JPG, JPEG, PNG, PDF
      </small>
    </div>
  );
}

function isExistingDoc(d: DocumentResource): boolean {
  return d.status === "uploaded" && !d.file;
}

function isNewDoc(d: DocumentResource): boolean {
  return !isExistingDoc(d);
}

export function DocumentsStep() {
  const documents = useWorkforceStore((s) => s.documents.documents);
  const removeDocument = useWorkforceStore((s) => s.removeDocument);
  const upload = useDocumentUpload();
  const { maybeExtractFromResume, overlayStatus, addedCount, errorMessage } =
    useResumeSkillsExtract();
  const { issuesByField, candidateId, refreshDocuments } = useWizardContext();

  const docErr = issuesByField["documents"]?.[0]?.message ?? null;

  const existingUploaded = documents.filter(isExistingDoc);
  const existingDocs = existingUploaded.filter((doc) => !inferDocumentVersionSlot(doc));
  const versionedDocRows = existingUploaded.map((doc) => ({
    type: doc.type,
    label: doc.label,
    logicalSlot: doc.logicalSlot,
    slotVersion: doc.slotVersion,
    url: doc.metadata?.url,
    originalName: doc.metadata?.originalName,
  }));
  const newDocs = documents.filter(isNewDoc);
  const hasVersionedSlots = Boolean(candidateId);

  const [drafts, setDrafts] = useState<DraftRow[]>([]);
  const [existingOpen, setExistingOpen] = useState(false);
  const newDocsRef = useRef<HTMLDivElement>(null);
  const pendingDraftScrollRef = useRef(false);
  const lastDraftIdRef = useRef<string | null>(null);

  const addDraft = () => {
    const draftId = newDraftId();
    lastDraftIdRef.current = draftId;
    pendingDraftScrollRef.current = true;
    setDrafts((d) => [...d, { draftId, type: "", customName: "" }]);
  };

  useEffect(() => {
    if (!pendingDraftScrollRef.current || drafts.length === 0) return;
    pendingDraftScrollRef.current = false;
    newDocsRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    const draftId = lastDraftIdRef.current;
    const select = draftId
      ? newDocsRef.current?.querySelector<HTMLSelectElement>(
          `[data-draft-id="${draftId}"] select`,
        )
      : newDocsRef.current?.querySelector("select");
    select?.focus();
  }, [drafts.length]);

  const updateDraft = (draftId: string, patch: Partial<DraftRow>) =>
    setDrafts((d) => d.map((row) => (row.draftId === draftId ? { ...row, ...patch } : row)));

  const removeDraft = (draftId: string) =>
    setDrafts((d) => d.filter((row) => row.draftId !== draftId));

  const submitDraft = async (draft: DraftRow, file: File) => {
    const label = resolveGenericDocumentUploadLabel(draft.type, draft.customName);
    if (!label || !file) return;
    if (getReservedVersionedDocumentLabelError(label, hasVersionedSlots)) return;
    await upload.add(file, { label, type: draft.type });
    removeDraft(draft.draftId);
    await maybeExtractFromResume(file, { type: draft.type, label });
  };

  const replaceExisting = async (existing: DocumentResource, file: File) => {
    await upload.add(file, {
      label: existing.label,
      type: existing.type,
    });
    removeDocument(existing.tempId);
    await maybeExtractFromResume(file, {
      type: existing.type,
      label: existing.label,
    });
  };

  const fileThumbnail = (file: File) => {
    const isImage = file.type.startsWith("image/");
    if (isImage) {
      const url = URL.createObjectURL(file);
      return (
        <img
          src={url}
          alt={file.name}
          className="w-10 h-10 object-cover rounded border"
          onLoad={() => URL.revokeObjectURL(url)}
        />
      );
    }
    return (
      <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded text-xs">
        <i className="ri-file-text-line" />
      </div>
    );
  };

  return (
    <>
      <ResumeSkillsExtractOverlay
        status={overlayStatus}
        addedCount={addedCount}
        errorMessage={errorMessage}
      />
      <div className="p-4">
      <p className="mb-1 font-semibold text-[#8c9097] opacity-50 text-[1.25rem]">04</p>
      {docErr && <div className="text-red-500 text-sm mb-3">{docErr}</div>}

      {candidateId ? (
        <ApplicationDocumentSlotsSection
          candidateId={candidateId}
          versionedDocs={versionedDocRows}
          onUpdated={refreshDocuments}
        />
      ) : null}

      <OtherDocumentsSectionHeader
        action={
          <button type="button" onClick={addDraft} className={wizardUi.actionBtn}>
            + Add Document
          </button>
        }
      />
      <OtherDocumentsDropdownNote hasVersionedSlots={hasVersionedSlots} />

      {(drafts.length > 0 || newDocs.length > 0) && (
        <div ref={newDocsRef} className="mb-6">
          <h6 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
            New Documents
          </h6>

          {drafts.map((draft) => {
            const draftLabel = resolveGenericDocumentUploadLabel(draft.type, draft.customName);
            const reservedLabelError = getReservedVersionedDocumentLabelError(
              draftLabel,
              hasVersionedSlots,
            );
            const customNameErrorId = `doc-custom-name-error-${draft.draftId}`;
            return (
            <div
              key={draft.draftId}
              data-draft-id={draft.draftId}
              className="relative grid grid-cols-12 gap-2 items-start border rounded-sm p-3 mb-3"
            >
              <button
                type="button"
                onClick={() => removeDraft(draft.draftId)}
                className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
              >
                ✕
              </button>

              <div
                className={`${
                  draft.type === "Other" ? "xl:col-span-4" : "xl:col-span-5"
                } col-span-12 flex flex-col`}
              >
                <label className="form-label">
                  Document Type <span className="text-red-500">*</span>
                </label>
                <GenericDocumentTypeSelect
                  value={draft.type}
                  hasVersionedSlots={hasVersionedSlots}
                  className="form-control !w-full !rounded-md h-11"
                  onChange={(t) =>
                    updateDraft(draft.draftId, {
                      type: t,
                      customName: t === "Other" ? draft.customName : "",
                    })
                  }
                />
                <div className="mt-1 min-h-4 text-xs opacity-0 select-none" aria-hidden="true">
                  helper
                </div>
              </div>

              {draft.type === "Other" && (
                <div className="xl:col-span-4 col-span-12 flex flex-col">
                  <label className="form-label">
                    Custom Document Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control w-full !rounded-md"
                    placeholder="Enter custom document name"
                    value={draft.customName}
                    aria-invalid={reservedLabelError ? true : undefined}
                    aria-describedby={reservedLabelError ? customNameErrorId : undefined}
                    onChange={(e) =>
                      updateDraft(draft.draftId, { customName: e.target.value })
                    }
                  />
                  <ReservedVersionedLabelError
                    id={customNameErrorId}
                    label={draftLabel}
                    hasVersionedSlots={hasVersionedSlots}
                  />
                </div>
              )}

              <div
                className={`${
                  draft.type === "Other" ? "xl:col-span-4" : "xl:col-span-7"
                } col-span-12 flex flex-col`}
              >
                <label className="form-label">
                  Upload File <span className="text-red-500">*</span>
                </label>
                <DraftFileButton
                  disabled={
                    !draft.type ||
                    (draft.type === "Other" && !draft.customName.trim()) ||
                    Boolean(reservedLabelError)
                  }
                  onFile={(file) => void submitDraft(draft, file)}
                />
              </div>
            </div>
          );
          })}

          {newDocs.map((doc) => (
            <div
              key={doc.tempId}
              className="relative grid grid-cols-12 gap-3 border rounded-sm p-3 mb-3"
            >
              <button
                type="button"
                onClick={() => upload.remove(doc.tempId)}
                className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
              >
                ✕
              </button>

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">Document Type</label>
                <input
                  type="text"
                  className="form-control w-full !rounded-md bg-gray-50"
                  value={doc.label}
                  readOnly
                />
              </div>

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">Status</label>
                <div className="text-sm">
                  {doc.status === "uploading" && (
                    <span className="text-blue-600">Uploading…</span>
                  )}
                  {doc.status === "uploaded" && (
                    <span className="text-green-600">Uploaded ✓</span>
                  )}
                  {doc.status === "failed" && (
                    <div>
                      <span className="text-red-600">Failed: {doc.error}</span>
                      <button
                        type="button"
                        className="ti-btn ti-btn-warning ti-btn-sm ml-2"
                        onClick={() => upload.retry(doc.tempId)}
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {doc.status === "queued" && (
                    <span className="text-gray-500">Queued…</span>
                  )}
                </div>
              </div>

              {doc.file && (
                <div className="xl:col-span-4 col-span-12 mt-6">
                  <label className="form-label">File Preview</label>
                  <div className="flex items-center">
                    {fileThumbnail(doc.file)}
                    <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="text-xs">{doc.file.name}</div>
                      <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                        {doc.label}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {existingDocs.length > 0 && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setExistingOpen((v) => !v)}
            className="inline-flex items-center gap-1 border-0 bg-transparent cursor-pointer text-inherit p-0 mb-3"
            aria-expanded={existingOpen}
          >
            <i
              className={`ri-arrow-right-s-line text-lg leading-none text-[#8c9097] transition-transform duration-150 ${
                existingOpen ? "rotate-90" : ""
              }`}
              aria-hidden="true"
            />
            <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Existing Documents
            </h6>
          </button>
          {existingOpen &&
          existingDocs.map((doc) => (
            <div
              key={doc.tempId}
              className="relative grid grid-cols-12 gap-3 border rounded-sm p-3 mb-3 bg-gray-50 dark:bg-gray-800"
            >
              <button
                type="button"
                onClick={() => removeDocument(doc.tempId)}
                className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
              >
                ✕
              </button>

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">Document Type</label>
                <input
                  type="text"
                  className="form-control w-full !rounded-md bg-white dark:bg-gray-700"
                  value={doc.label}
                  readOnly
                />
              </div>

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">Current File</label>
                <div className="flex items-center">
                  <a
                    href={doc.metadata?.url ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline text-xs"
                  >
                    {doc.metadata?.originalName ?? doc.label}
                  </a>
                </div>
              </div>

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">Replace File</label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="form-control w-full !rounded-md"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void replaceExisting(doc, file);
                  }}
                />
                <small className="text-gray-500 text-xs mt-1">
                  Supported formats: JPG, JPEG, PNG, PDF
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
