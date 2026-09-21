"use client";

import React, { useCallback, useEffect, useId, useState } from "react";

const COVER_LETTER_ACCEPT = ".pdf,.docx,.jpg,.jpeg,.png";
const COVER_LETTER_FORMAT_MESSAGE = "PDF, DOCX, JPG, or PNG — max 10MB.";
const COVER_LETTER_EXTENSIONS = [".pdf", ".docx", ".jpg", ".jpeg", ".png"];
const COVER_LETTER_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/jpg",
  "image/png",
];
const COVER_LETTER_MAX_BYTES = 10 * 1024 * 1024;

const FORMAT_REJECTED_MESSAGE =
  "Cover letter must be a PDF, DOCX, JPG, or PNG file. Choose a different file.";
const SIZE_REJECTED_MESSAGE = "That file is larger than 10MB. Choose a smaller file.";

type PublicApplyCoverLetterFieldProps = {
  file: File | null;
  /** From `useRef<HTMLInputElement>(null)`. No `| null` on the type argument: @types/react 18
   *  compares RefObject by variance, so RefObject<HTMLInputElement | null> is not a LegacyRef. */
  inputRef: React.RefObject<HTMLInputElement>;
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
  const hintId = `${inputId}-hint`;
  // Rejections used to clear the input and say nothing, so a wrong file looked like a no-op click.
  const [ownError, setOwnError] = useState<string | null>(null);
  // Held rather than revoked right after window.open: a revoked blob can race the new tab's load.
  const [, setPreviewUrl] = useState<string | null>(null);

  const releasePreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => releasePreview, [releasePreview]);

  const shownError = error ?? ownError;

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const reject = (message: string) => {
    setOwnError(message);
    onFileSelected(null);
    releasePreview();
    clearInput();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) {
      setOwnError(null);
      onFileSelected(null);
      releasePreview();
      return;
    }
    const lower = selected.name.toLowerCase();
    const okExt = COVER_LETTER_EXTENSIONS.some((ext) => lower.endsWith(ext));
    if (!COVER_LETTER_MIME_TYPES.includes(selected.type) && !okExt) {
      reject(FORMAT_REJECTED_MESSAGE);
      return;
    }
    if (selected.size > COVER_LETTER_MAX_BYTES) {
      reject(SIZE_REJECTED_MESSAGE);
      return;
    }
    setOwnError(null);
    releasePreview();
    onFileSelected(selected);
  };

  const handlePreview = () => {
    if (!file) return;
    releasePreview();
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRemove = () => {
    setOwnError(null);
    onFileSelected(null);
    releasePreview();
    clearInput();
  };

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
        Cover letter <span className="font-normal text-gray-500 dark:text-gray-400">(optional)</span>
      </label>
      <p id={hintId} className="mb-1.5 text-xs text-slate-600 dark:text-gray-400">
        {COVER_LETTER_FORMAT_MESSAGE}
      </p>
      {/*
        Hidden-but-real input driven by the label below, matching the resume field: native file
        chrome matches nothing else in this form, and keeping the input keeps keyboard access.
      */}
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept={COVER_LETTER_ACCEPT}
        disabled={disabled}
        aria-describedby={shownError ? `${inputId}-error` : hintId}
        aria-invalid={shownError ? true : undefined}
        onChange={handleChange}
        className="peer sr-only"
      />
      <label
        htmlFor={inputId}
        className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-dashed px-4 py-3 text-sm transition peer-focus-visible:ring-2 peer-focus-visible:ring-primary/50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 ${
          shownError
            ? "border-red-400 bg-red-50 dark:border-red-700 dark:bg-red-950/30"
            : "border-gray-300 hover:border-primary hover:bg-primary/5 dark:border-gray-600 dark:hover:border-primary"
        }`}
      >
        <i className="ri-upload-2-line text-lg text-primary" aria-hidden />
        <span className="min-w-0 flex-1">
          {file ? (
            <>
              <span className="block truncate font-medium text-gray-800 dark:text-gray-100">{file.name}</span>
              <span className="block text-xs text-slate-600 dark:text-gray-400">
                {(file.size / 1024).toFixed(0)} KB · Choose a different file
              </span>
            </>
          ) : (
            <span className="text-slate-600 dark:text-gray-300">Choose a file</span>
          )}
        </span>
      </label>

      {shownError ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600 dark:text-red-400" role="alert">
          {shownError}
        </p>
      ) : null}

      {file ? (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-primary transition hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:hover:bg-primary/10"
            onClick={handlePreview}
            disabled={disabled}
            aria-label={`Preview ${file.name}`}
          >
            Preview selected file
          </button>
          <button
            type="button"
            className="flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={handleRemove}
            disabled={disabled}
            aria-label={`Remove ${file.name}`}
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );
}
