"use client";

import type { ReactNode } from "react";
import {
  VersionedDocumentSlot,
  findLatestVersionedDocument,
  inferDocumentVersionSlot,
  type VersionedDocumentLike,
} from "@/shared/components/candidates/VersionedDocumentSlot";

export const VERSIONED_DOC_SLOT_IDS = {
  resume: "versioned-doc-resume",
  "cover-letter": "versioned-doc-cover-letter",
} as const;

export type DocumentTypeGroup = { label: string; options: string[] };

/** Shown when a reserved resume/cover-letter label is typed into the generic "Other" path. */
export const VERSIONED_SLOT_GENERIC_UPLOAD_ERROR =
  "Resume and cover letter cannot be added here. Use the Resume / CV and Cover Letter cards above — they keep version history.";

/** Resolve the label used for a generic document row (dropdown value or custom "Other" name). */
export function resolveGenericDocumentUploadLabel(
  documentType: string,
  customName = "",
): string {
  const trimmedType = String(documentType || "").trim();
  if (trimmedType === "Other") return String(customName || "").trim();
  return trimmedType;
}

/** True when `raw` matches a versioned resume/cover-letter slot (case-insensitive, trimmed). */
export function isReservedVersionedDocumentLabel(raw: string): boolean {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return false;
  return (
    inferDocumentVersionSlot({ type: trimmed }) !== null ||
    inferDocumentVersionSlot({ label: trimmed }) !== null
  );
}

/** Validation error when versioned slots are active and the label is reserved; otherwise null. */
export function getReservedVersionedDocumentLabelError(
  label: string,
  hasVersionedSlots: boolean,
): string | null {
  if (!hasVersionedSlots) return null;
  if (!isReservedVersionedDocumentLabel(label)) return null;
  return VERSIONED_SLOT_GENERIC_UPLOAD_ERROR;
}

type ReservedVersionedLabelErrorProps = {
  label: string;
  hasVersionedSlots: boolean;
  id?: string;
  className?: string;
};

/** Inline, accessible validation for reserved resume/cover-letter labels in the generic upload path. */
export function ReservedVersionedLabelError({
  label,
  hasVersionedSlots,
  id,
  className = "text-danger text-xs mt-1",
}: ReservedVersionedLabelErrorProps) {
  const message = getReservedVersionedDocumentLabelError(label, hasVersionedSlots);
  if (!message) return null;
  return (
    <div id={id} className={className} role="alert">
      {message}
    </div>
  );
}

/** Generic document dropdown options. Resume is omitted once versioned slots are active. */
export function getGenericDocumentTypeGroups(hasVersionedSlots: boolean): DocumentTypeGroup[] {
  return [
    {
      label: "Identity / KYC (Pre-boarding)",
      options: ["Aadhar", "PAN", "Bank", "Passport"],
    },
    {
      label: "Application",
      options: [
        ...(hasVersionedSlots ? [] : ["CV/Resume"]),
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
}

export function scrollToVersionedDocSlot(slot: keyof typeof VERSIONED_DOC_SLOT_IDS) {
  document.getElementById(VERSIONED_DOC_SLOT_IDS[slot])?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

type VersionedSlotHintOptionsProps = {
  /** When false, hints are omitted (creation flow still offers CV/Resume in the list). */
  show: boolean;
};

/** Non-selectable dropdown rows — must not use values that route through the generic upload path. */
export function VersionedSlotHintOptions({ show }: VersionedSlotHintOptionsProps) {
  if (!show) return null;
  return (
    <optgroup label="Resume &amp; cover letter (use cards above)">
      <option value="" disabled>Resume / CV — upload in the card above</option>
      <option value="" disabled>Cover Letter — upload in the card above</option>
    </optgroup>
  );
}

type OtherDocumentsDropdownNoteProps = {
  hasVersionedSlots: boolean;
  className?: string;
};

export function OtherDocumentsDropdownNote({
  hasVersionedSlots,
  className = "mb-4",
}: OtherDocumentsDropdownNoteProps) {
  if (!hasVersionedSlots) return null;
  return (
    <div
      className={`rounded-sm border border-primary/25 bg-primary/5 p-3 text-sm ${className}`}
      role="note"
    >
      <p className="mb-1 font-medium text-gray-800 dark:text-gray-100">
        This dropdown is for other documents only.
      </p>
      <p className="mb-2 text-xs text-gray-600 dark:text-gray-300">
        Upload or replace your resume and cover letter in the dedicated cards above. They keep version
        history and avoid duplicate resume rows.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="ti-btn ti-btn-outline-primary !min-h-[36px] !py-1 !px-2.5 !text-xs"
          onClick={() => scrollToVersionedDocSlot("resume")}
        >
          Go to Resume / CV
        </button>
        <button
          type="button"
          className="ti-btn ti-btn-outline-primary !min-h-[36px] !py-1 !px-2.5 !text-xs"
          onClick={() => scrollToVersionedDocSlot("cover-letter")}
        >
          Go to Cover Letter
        </button>
      </div>
    </div>
  );
}

type ApplicationDocumentSlotsSectionProps<T extends VersionedDocumentLike> = {
  candidateId: string;
  versionedDocs: T[];
  onUpdated?: () => void | Promise<void>;
  heading?: string;
  headingClassName?: string;
  className?: string;
};

export function ApplicationDocumentSlotsSection<T extends VersionedDocumentLike>({
  candidateId,
  versionedDocs,
  onUpdated,
  heading = "Resume & cover letter",
  headingClassName = "text-sm font-semibold text-gray-700 dark:text-gray-300",
  className = "mb-6 space-y-4",
}: ApplicationDocumentSlotsSectionProps<T>) {
  return (
    <div className={className}>
      <h6 className={headingClassName}>{heading}</h6>
      <p className="mb-0 text-xs text-gray-500 dark:text-gray-400">
        Upload or replace these here. Each save keeps prior versions downloadable.
      </p>
      <VersionedDocumentSlot
        candidateId={candidateId}
        slot="resume"
        fallbackDocument={findLatestVersionedDocument(versionedDocs, "resume")}
        onUpdated={onUpdated}
        sectionId={VERSIONED_DOC_SLOT_IDS.resume}
      />
      <VersionedDocumentSlot
        candidateId={candidateId}
        slot="cover-letter"
        fallbackDocument={findLatestVersionedDocument(versionedDocs, "cover-letter")}
        onUpdated={onUpdated}
        sectionId={VERSIONED_DOC_SLOT_IDS["cover-letter"]}
      />
    </div>
  );
}

type GenericDocumentTypeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  hasVersionedSlots: boolean;
  disabled?: boolean;
  className?: string;
  emptyLabel?: string;
  includeOther?: boolean;
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
};

export function GenericDocumentTypeSelect({
  value,
  onChange,
  hasVersionedSlots,
  disabled = false,
  className = "form-control w-full !rounded-md h-11",
  emptyLabel = "Select Document Type",
  includeOther = true,
  id,
  required,
  "aria-describedby": ariaDescribedBy,
}: GenericDocumentTypeSelectProps) {
  const groups = getGenericDocumentTypeGroups(hasVersionedSlots);
  return (
    <select
      id={id}
      className={className}
      value={value}
      disabled={disabled}
      required={required}
      aria-describedby={ariaDescribedBy}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{emptyLabel}</option>
      <VersionedSlotHintOptions show={hasVersionedSlots} />
      {groups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </optgroup>
      ))}
      {includeOther ? <option value="Other">Other</option> : null}
    </select>
  );
}

type OtherDocumentsSectionHeaderProps = {
  title?: string;
  action?: ReactNode;
  className?: string;
};

export function OtherDocumentsSectionHeader({
  title = "Other documents",
  action,
  className = "text-[0.9375rem] font-semibold sm:flex block items-center justify-between mb-4",
}: OtherDocumentsSectionHeaderProps) {
  return (
    <div className={className}>
      <div>
        <div>{title}</div>
        <p className="mb-0 mt-0.5 text-xs font-normal text-gray-500 dark:text-gray-400">
          ID, education, visa, and other supporting files
        </p>
      </div>
      {action}
    </div>
  );
}
