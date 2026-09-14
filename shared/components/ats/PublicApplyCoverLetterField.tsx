"use client";

import React, { useId } from "react";

const COVER_LETTER_ACCEPT = ".pdf,.docx,.jpg,.jpeg,.png";
const COVER_LETTER_FORMAT_MESSAGE = "PDF, DOCX, JPG, or PNG — max 10MB.";

type PublicApplyCoverLetterFieldProps = {
  file: File | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelected: (file: File | null) => void;
  error?: string | null;
  disabled?: boolean;
};

export function PublicApplyCoverLetterField({
  file,
  inputRef,
  onFileSelected,
  error,
  disabled,
}: PublicApplyCoverLetterFieldProps) {
  const inputId = useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      onFileSelected(null);
      return;
    }
    const lower = selected.name.toLowerCase();
    const okExt = [".pdf", ".docx", ".jpg", ".jpeg", ".png"].some((ext) => lower.endsWith(ext));
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    if (!validTypes.includes(selected.type) && !okExt) {
      onFileSelected(null);
      e.target.value = "";
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      onFileSelected(null);
      e.target.value = "";
      return;
    }
    onFileSelected(selected);
  };

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Cover letter (optional)
      </label>
      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{COVER_LETTER_FORMAT_MESSAGE}</p>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={COVER_LETTER_ACCEPT}
        disabled={disabled}
        aria-label="Upload cover letter document"
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        onChange={handleChange}
        className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
      />
      {file ? (
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {file.name} ({(file.size / 1024).toFixed(0)} KB)
        </p>
      ) : null}
      {error ? (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
