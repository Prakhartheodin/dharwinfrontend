"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import { uploadDocument } from "@/shared/lib/api/employees";
import { AvatarCropOverlay } from "./AvatarCropOverlay";
import wizardStyles from "../steps/personal-info-step.module.css";
import inlineStyles from "./profile-photo-uploader.module.css";

const MAX_PICTURE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];

export type ProfilePhotoMetadata = {
  url: string;
  key: string;
  originalName: string;
  size: number;
  mimeType: string;
};

export type ProfilePhotoUploaderProps = {
  previewUrl?: string;
  disabled?: boolean;
  /** When true, uploads to /upload/single immediately after crop. */
  uploadOnApply?: boolean;
  /** Deferred upload: parent stores the cropped file until form submit. */
  onCroppedFile?: (file: File, previewUrl: string) => void;
  /** Immediate upload: parent receives S3 metadata after crop+upload. May be async (e.g. PATCH on settings). */
  onUploaded?: (meta: ProfilePhotoMetadata) => void | Promise<void>;
  /** Fired when a local blob preview is set or cleared (uploadOnApply paths). */
  onPreviewChange?: (url: string | null) => void;
  /** Fired when internal uploading state changes (S3 + awaited onUploaded). */
  onUploadingChange?: (uploading: boolean) => void;
  /** Button label while onUploaded runs after S3 (e.g. settings PATCH). */
  uploadSavingLabel?: string;
  onRemove?: () => void;
  showRemove?: boolean;
  variant?: "wizard" | "inline" | "compact";
  inputId?: string;
  label?: string;
  hint?: string;
  /** When false, only action buttons are rendered (parent supplies the avatar preview). */
  showPreview?: boolean;
};

type UploadPhase = null | "uploading" | "saving";

export function ProfilePhotoUploader({
  previewUrl = "",
  disabled = false,
  uploadOnApply = false,
  onCroppedFile,
  onUploaded,
  onPreviewChange,
  onUploadingChange,
  uploadSavingLabel,
  onRemove,
  showRemove = true,
  variant = "inline",
  inputId,
  label = "Upload profile picture",
  hint,
  showPreview = true,
}: ProfilePhotoUploaderProps) {
  const autoId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [localPreview, setLocalPreview] = useState("");

  const displayUrl = localPreview || previewUrl;

  useEffect(() => {
    if (!localPreview.startsWith("blob:")) return;
    return () => URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const clearLocalPreview = () => {
    setLocalPreview("");
    onPreviewChange?.(null);
  };

  const setBlobPreview = (url: string) => {
    setLocalPreview(url);
    onPreviewChange?.(url);
  };

  const uploadButtonLabel = (fallbackChange: string, fallbackUpload: string) => {
    if (!uploading) return displayUrl ? fallbackChange : fallbackUpload;
    if (uploadPhase === "saving" && uploadSavingLabel) return uploadSavingLabel;
    if (uploadPhase === "uploading") return "Uploading photo…";
    return "Uploading…";
  };

  const avatarOverlay = uploading ? (
    <div className={inlineStyles.avatarOverlay} aria-hidden="true">
      <i className={`ri-loader-4-line ${inlineStyles.avatarSpinner}`} />
    </div>
  ) : null;

  const wizardAvatarOverlay = uploading ? (
    <div className={wizardStyles.avatarOverlay} aria-hidden="true">
      <i className={`ri-loader-4-line ${wizardStyles.avatarSpinner}`} />
    </div>
  ) : null;

  const closeCropEditor = () => {
    setCropOpen(false);
    setCropFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      e.target.value = "";
      setError("That file type isn't supported. Choose a JPG or PNG image.");
      return;
    }
    if (file.size > MAX_PICTURE_BYTES) {
      e.target.value = "";
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setError(`That image is ${mb} MB. Choose one under 5 MB.`);
      return;
    }

    setCropFile(file);
    setCropOpen(true);
  };

  const onCropApply = async (croppedFile: File) => {
    setCropOpen(false);
    setCropFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    const nextPreview = URL.createObjectURL(croppedFile);

    if (!uploadOnApply) {
      setBlobPreview(nextPreview);
      onCroppedFile?.(croppedFile, nextPreview);
      return;
    }

    setBlobPreview(nextPreview);
    setUploading(true);
    setUploadPhase("uploading");
    let phase: UploadPhase = "uploading";
    try {
      const meta = await uploadDocument(croppedFile, croppedFile.name);
      phase = "saving";
      setUploadPhase("saving");
      await onUploaded?.(meta);
      clearLocalPreview();
    } catch {
      clearLocalPreview();
      if (phase !== "saving") {
        setError("Couldn't upload that photo. Check your connection and try again.");
      }
    } finally {
      setUploading(false);
      setUploadPhase(null);
    }
  };

  const handleRemove = () => {
    clearLocalPreview();
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onRemove?.();
  };

  if (variant === "compact") {
    return (
      <div className={inlineStyles.compactRoot}>
        <AvatarCropOverlay
          open={cropOpen}
          imageFile={cropFile}
          onClose={closeCropEditor}
          onApply={onCropApply}
        />
        <div className={inlineStyles.compactAvatar}>
          {showPreview ? (
            displayUrl ? (
              <div className={inlineStyles.avatarFrame}>
                <img src={displayUrl} alt="" className={inlineStyles.compactAvatarImage} />
                {avatarOverlay}
              </div>
            ) : (
              <span className={inlineStyles.compactAvatarFallback} aria-hidden="true">
                <i className="ri-user-line" />
              </span>
            )
          ) : null}
        </div>
        <input
          ref={fileInputRef}
          id={inputId ?? autoId}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          onChange={onFileChange}
          className="hidden"
          aria-label={label}
          disabled={disabled || uploading}
        />
        <div className={inlineStyles.compactActions}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
            className="ti-btn ti-btn-sm ti-btn-primary !w-auto !h-auto whitespace-nowrap inline-flex items-center"
          >
            {uploading ? (
              uploadButtonLabel("Photo", "Photo")
            ) : (
              <>
                <i className="ri-camera-line me-1 align-middle inline-block" />
                Photo
              </>
            )}
          </button>
          {showRemove && displayUrl ? (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled || uploading}
              className="ti-btn ti-btn-sm ti-btn-soft-danger !w-auto !h-auto whitespace-nowrap"
            >
              Remove
            </button>
          ) : null}
        </div>
        {error ? (
          <p className={inlineStyles.error} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  if (variant === "wizard") {
    return (
      <div className={wizardStyles.avatarBlock}>
        <AvatarCropOverlay
          open={cropOpen}
          imageFile={cropFile}
          onClose={closeCropEditor}
          onApply={onCropApply}
        />
        <div className={wizardStyles.avatarRing}>
          {displayUrl ? (
            <img src={displayUrl} alt="Your profile photo" className={wizardStyles.avatarImage} />
          ) : (
            <div className={wizardStyles.avatarPlaceholder} aria-hidden="true">
              <i className="ri-user-line" />
            </div>
          )}
          {wizardAvatarOverlay}
        </div>
        <input
          ref={fileInputRef}
          id={inputId ?? autoId}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          onChange={onFileChange}
          className={wizardStyles.hiddenFile}
          aria-label={label}
          disabled={disabled || uploading}
        />
        <div className={wizardStyles.avatarActions}>
          <button
            type="button"
            className={wizardStyles.uploadBtn}
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            <i
              className={uploading ? "ri-loader-4-line" : "ri-upload-2-line"}
              aria-hidden="true"
            />
            {uploadButtonLabel("Change photo", "Upload photo")}
          </button>
          {showRemove && displayUrl && !uploading ? (
            <button type="button" className={wizardStyles.removeBtn} onClick={handleRemove}>
              <i className="ri-delete-bin-line" aria-hidden="true" />
              Remove
            </button>
          ) : null}
        </div>
        <p className={wizardStyles.avatarHint}>{hint ?? "JPG or PNG, up to 5 MB"}</p>
        {error ? (
          <p className={wizardStyles.avatarError} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className={inlineStyles.root}>
      <AvatarCropOverlay
        open={cropOpen}
        imageFile={cropFile}
        onClose={closeCropEditor}
        onApply={onCropApply}
      />
      <div className={inlineStyles.row}>
        <div className={inlineStyles.avatarWrap}>
          <div className={inlineStyles.avatarFrame}>
            {displayUrl ? (
              <img src={displayUrl} alt="Profile preview" className={inlineStyles.avatarImage} />
            ) : (
              <div className={inlineStyles.avatarPlaceholder} aria-hidden="true">
                <i className="ri-user-line" />
              </div>
            )}
            {avatarOverlay}
          </div>
        </div>
        <div className={inlineStyles.controls}>
          <input
            ref={fileInputRef}
            id={inputId ?? autoId}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            onChange={onFileChange}
            className="form-control w-full !rounded-md"
            aria-label={label}
            disabled={disabled || uploading}
          />
          <small className={inlineStyles.hint}>{hint ?? "JPG or PNG. Max 5 MB."}</small>
        </div>
        {showRemove && displayUrl ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={disabled || uploading}
            className="ti-btn ti-btn-danger ti-btn-sm"
            title="Remove profile picture"
          >
            <i className="ri-delete-bin-line" />
          </button>
        ) : null}
      </div>
      {error ? (
        <p className={inlineStyles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
