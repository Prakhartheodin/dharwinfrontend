"use client";

import React, { useState } from "react";
import { useWorkforceStore } from "../state/workforce.store";
import { useWizardContext } from "../engine/WizardContext";
import { useDocumentUpload } from "../resources/useDocumentUpload";
import type { DocumentResource } from "../types/resource.types";

const DOC_TYPE_GROUPS: Array<{ label: string; options: string[] }> = [
  {
    label: "Identity / KYC (Pre-boarding)",
    options: ["Aadhar", "PAN", "Bank", "Passport"],
  },
  {
    label: "Application",
    options: [
      "CV/Resume",
      "Marksheet",
      "Degree Certificate",
      "Experience Letter",
      "Offer Letter",
      "Visa",
      "EAD Card",
      "I-765 Receipt",
      "I-983 Form-only",
    ],
  },
];

type DraftRow = {
  draftId: string;
  type: string;
  customName: string;
};

let draftCounter = 0;
const newDraftId = () => `draft-${Date.now()}-${++draftCounter}`;

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
  const { issuesByField } = useWizardContext();

  const docErr = issuesByField["documents"]?.[0]?.message ?? null;

  const existingDocs = documents.filter(isExistingDoc);
  const newDocs = documents.filter(isNewDoc);

  const [drafts, setDrafts] = useState<DraftRow[]>([]);

  const addDraft = () =>
    setDrafts((d) => [...d, { draftId: newDraftId(), type: "", customName: "" }]);

  const updateDraft = (draftId: string, patch: Partial<DraftRow>) =>
    setDrafts((d) => d.map((row) => (row.draftId === draftId ? { ...row, ...patch } : row)));

  const removeDraft = (draftId: string) =>
    setDrafts((d) => d.filter((row) => row.draftId !== draftId));

  const submitDraft = async (draft: DraftRow, file: File) => {
    const label = draft.type === "Other" ? draft.customName : draft.type;
    if (!label || !file) return;
    await upload.add(file, { label, type: draft.type });
    removeDraft(draft.draftId);
  };

  const replaceExisting = async (existing: DocumentResource, file: File) => {
    await upload.add(file, {
      label: existing.label,
      type: existing.type,
    });
    removeDocument(existing.tempId);
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
    <div className="p-4">
      <p className="mb-1 font-semibold text-[#8c9097] opacity-50 text-[1.25rem]">04</p>
      <div className="text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4">
        <div>Documents (Optional) :</div>
        <button
          type="button"
          onClick={addDraft}
          className="ti-btn bg-primary text-white !py-1 !px-2 !text-[0.75rem]"
        >
          + Add Document
        </button>
      </div>
      {docErr && <div className="text-red-500 text-sm mb-3">{docErr}</div>}

      {existingDocs.length > 0 && (
        <div className="mb-6">
          <h6 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
            Existing Documents
          </h6>
          {existingDocs.map((doc) => (
            <div
              key={doc.tempId}
              className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3 bg-gray-50 dark:bg-gray-800"
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

      {(drafts.length > 0 || newDocs.length > 0) && (
        <div>
          <h6 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
            New Documents
          </h6>

          {drafts.map((draft) => (
            <div
              key={draft.draftId}
              className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3"
            >
              <button
                type="button"
                onClick={() => removeDraft(draft.draftId)}
                className="absolute top-2 right-2 border rounded-full px-1 text-red-500 hover:text-white hover:bg-red-600"
              >
                ✕
              </button>

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">
                  Document Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="form-control w-full !rounded-md"
                  value={draft.type}
                  onChange={(e) => {
                    const t = e.target.value;
                    updateDraft(draft.draftId, {
                      type: t,
                      customName: t === "Other" ? draft.customName : "",
                    });
                  }}
                >
                  <option value="">Select Document Type</option>
                  {DOC_TYPE_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </div>

              {draft.type === "Other" && (
                <div className="xl:col-span-4 col-span-12">
                  <label className="form-label">
                    Custom Document Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control w-full !rounded-md"
                    placeholder="Enter custom document name"
                    value={draft.customName}
                    onChange={(e) =>
                      updateDraft(draft.draftId, { customName: e.target.value })
                    }
                  />
                </div>
              )}

              <div className="xl:col-span-4 col-span-12">
                <label className="form-label">
                  Upload File <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="form-control w-full !rounded-md"
                  disabled={
                    !draft.type ||
                    (draft.type === "Other" && !draft.customName.trim())
                  }
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) void submitDraft(draft, file);
                  }}
                />
                <small className="text-gray-500 text-xs mt-1">
                  Supported formats: JPG, JPEG, PNG, PDF
                </small>
              </div>
            </div>
          ))}

          {newDocs.map((doc) => (
            <div
              key={doc.tempId}
              className="relative grid grid-cols-12 gap-4 border rounded-sm p-3 mb-3"
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
    </div>
  );
}
