"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "@/shared/lib/constants";
import { isAxiosError } from "axios";
import Swal from "sweetalert2";
import {
  publicApplyToJob,
  type PublicApplyPayload,
} from "@/shared/lib/api/jobs";
import { PhoneCountrySelect } from "@/shared/components/PhoneCountrySelect";
import { PublicApplyCaptcha } from "@/shared/components/ats/PublicApplyCaptcha";
import {
  PublicApplyOptionalProfileDetails,
  PublicApplyResumeSection,
  PublicApplyResumeUploadField,
} from "@/shared/components/ats/PublicApplyResumeSection";
import { PublicApplyCoverLetterField } from "@/shared/components/ats/PublicApplyCoverLetterField";
import { usePublicApplyCaptcha } from "@/shared/hooks/usePublicApplyCaptcha";
import { usePublicResumeParse } from "@/shared/hooks/usePublicResumeParse";
import { useModalBehavior } from "@/shared/hooks/useModalBehavior";
import ConfirmDiscardDialog from "@/shared/components/ConfirmDiscardDialog";
import { getPhoneCountry, getPhoneValidationError } from "@/shared/lib/phoneCountries";
import { isPublicResumeFile, PUBLIC_RESUME_FORMAT_MESSAGE } from "@/shared/lib/publicApplyResume";
import {
  FieldError,
  PASSWORD_MIN_LENGTH,
  PASSWORD_REGEX,
  PasswordRulesList,
  PrefilledBadge,
  confirmReplaceParsedDetails,
  fieldBorderClass,
  fieldErrorSummary,
  focusFirstInvalidField,
  hasFieldErrors,
  type ApplyFieldErrors,
  type ApplyFieldKey,
} from "@/shared/components/ats/publicApplyFormFields";

/** DOM ids so a failed submit can move focus to the first field that needs attention. */
const APPLY_FIELD_INPUT_ID: Record<ApplyFieldKey, string> = {
  fullName: "public-apply-modal-fullName",
  email: "public-apply-modal-email",
  phoneNumber: "public-apply-modal-phone",
  resume: "public-apply-modal-resume",
  password: "public-apply-modal-password",
  confirmPassword: "public-apply-modal-confirmPassword",
};

function getApplySubmissionErrorMessage(error: unknown): string {
  if (isAxiosError(error) && !error.response) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[publicApplyToJob]", error.code, error.message);
    }
    if (error.code === "ECONNABORTED") {
      return "The upload took too long. Try using Wi‑Fi, a smaller resume file, or fewer attachments, then submit again.";
    }
    return "We could not reach the server. Check your internet connection, try another network if possible, and submit again.";
  }
  if (isAxiosError(error) && error.response?.data) {
    const data = error.response.data as { message?: string };
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message;
    }
  }
  if (error instanceof Error && error.message.trim()) {
    if (error.message === "Network Error" || error.message.includes("Network Error")) {
      return "We could not reach the server. Check your internet connection, try another network if possible, and submit again.";
    }
    return error.message;
  }
  return "Failed to submit application. Please try again.";
}

export type PublicJobApplyModalProps = {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  /** Signed HMAC `ref` from job URL `?ref=` (job-scoped referral). */
  referralRef?: string | null;
  /** Called after successful apply (cookies may be set for session) */
  onSuccess?: () => void;
};

export function PublicJobApplyModal({
  open,
  onClose,
  jobId,
  jobTitle,
  referralRef,
  onSuccess,
}: PublicJobApplyModalProps) {
  const router = useRouter();
  const [applying, setApplying] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ApplyFieldErrors>({});
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [coverLetter, setCoverLetter] = useState<File | null>(null);
  const [resume, setResume] = useState<File | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const coverLetterInputRef = useRef<HTMLInputElement>(null);
  const documentsInputRef = useRef<HTMLInputElement>(null);
  const {
    ensureCaptchaReady,
    setCaptchaToken,
    registerCaptchaReset,
    rotateCaptchaToken,
    finalizeProtectedAttempt,
    handleCaptchaApiError,
    captchaRetryMessage,
  } = usePublicApplyCaptcha();
  const {
    entryMode,
    setEntryMode,
    parseStatus,
    parseMessage,
    suggestedSkills,
    setSuggestedSkills,
    suggestedExperiences,
    setSuggestedExperiences,
    suggestedQualifications,
    setSuggestedQualifications,
    suggestedSocialLinks,
    setSuggestedSocialLinks,
    prefilledFields,
    parseActivity,
    streamingSkills,
    markFieldEdited,
    runParse,
    retryParse,
    resetParseState,
    getSubmitSkills,
    getSubmitProfileArrays,
  } = usePublicResumeParse(jobId, {
    onCaptchaTokenConsumed: rotateCaptchaToken,
    confirmReplaceDetails: confirmReplaceParsedDetails,
  });

  const closeModal = () => {
    resetParseState();
    setFieldErrors({});
    setFormError("");
    onClose();
  };

  // A half-filled application is worth confirming before it is thrown away, and an in-flight
  // submit must not be dismissable at all — the request would continue with the UI gone.
  const formDirty = Boolean(
    fullName || email || phoneNumber || password || confirmPassword || resume || coverLetter || documents.length
  );
  const {
    containerRef: modalRef,
    backdropProps,
    requestClose: requestCloseModal,
    confirmDiscardOpen,
    confirmDiscard,
    cancelDiscard,
  } = useModalBehavior({ isOpen: open && !applying, onClose: closeModal, isDirty: formDirty });

  const prefillTargets = {
    fullName,
    email,
    phoneNumber,
    countryCode,
    setFullName,
    setEmail,
    setPhoneNumber,
    setCountryCode,
  };

  /** Clears one field's error as soon as the user starts correcting it. */
  const clearFieldError = (key: ApplyFieldKey) => {
    setFieldErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  const handleResumeSelected = (file: File) => {
    if (!isPublicResumeFile(file)) {
      void Swal.fire({
        icon: "error",
        title: "Invalid File Type",
        text: PUBLIC_RESUME_FORMAT_MESSAGE,
      });
      if (resumeInputRef.current) resumeInputRef.current.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      void Swal.fire({
        icon: "error",
        title: "File Too Large",
        text: "Resume file must be less than 10MB.",
      });
      if (resumeInputRef.current) resumeInputRef.current.value = "";
      return;
    }

    setResume(file);
    clearFieldError("resume");
    if (entryMode === "ai") {
      void runParse(file, prefillTargets);
    }
  };

  const handleDocumentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      void Swal.fire({
        icon: "error",
        title: "Too Many Files",
        text: "You can upload a maximum of 5 additional documents.",
      });
      return;
    }
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    const invalidFiles = files.filter((f) => {
      const lower = f.name.toLowerCase();
      const okExt = [".pdf", ".docx", ".jpg", ".jpeg", ".png"].some((ext) => lower.endsWith(ext));
      return !validTypes.includes(f.type) && !okExt;
    });
    if (invalidFiles.length > 0) {
      void Swal.fire({
        icon: "error",
        title: "Invalid File Type",
        text: "Documents must be PDF, DOCX, JPG, or PNG files.",
      });
      return;
    }
    const oversizedFiles = files.filter((f) => f.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      void Swal.fire({
        icon: "error",
        title: "File Too Large",
        text: "Each document must be less than 10MB.",
      });
      return;
    }
    setDocuments(files);
  };

  /** Collects every problem at once and keys it by field, so each message sits next to its input. */
  const validateForm = (): ApplyFieldErrors => {
    const errors: ApplyFieldErrors = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = "Enter your full name (at least 2 characters).";
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = "Enter a valid email address, for example name@example.com.";
    }
    const phoneError = getPhoneValidationError(phoneNumber, countryCode);
    if (phoneError) {
      errors.phoneNumber = phoneError;
    }
    if (!resume) {
      errors.resume = "Upload your resume to continue.";
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    } else if (!PASSWORD_REGEX.test(password)) {
      errors.password = "Add at least one uppercase letter and one number.";
    }
    if (password !== confirmPassword) {
      errors.confirmPassword = "Both passwords must match.";
    }
    return errors;
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    const errors = validateForm();
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) {
      setFormError(fieldErrorSummary(errors));
      focusFirstInvalidField(errors, APPLY_FIELD_INPUT_ID);
      return;
    }

    const captchaError = ensureCaptchaReady();
    if (captchaError) {
      setFormError(captchaError);
      return;
    }

    setApplying(true);
    try {
      const profileArrays = getSubmitProfileArrays();
      const submitSkills = getSubmitSkills();
      const payload: PublicApplyPayload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        // Store local digits only — countryCode is the source of truth for dial prefix.
        phoneNumber: (phoneNumber || "").replace(/\D/g, ""),
        countryCode,
        entryMode,
        ...(referralRef?.trim() ? { ref: referralRef.trim() } : {}),
        ...(submitSkills.length > 0 ? { skills: submitSkills } : {}),
        ...(profileArrays.experiences.length > 0 ? { experiences: profileArrays.experiences } : {}),
        ...(profileArrays.qualifications.length > 0 ? { qualifications: profileArrays.qualifications } : {}),
        ...(profileArrays.socialLinks.length > 0 ? { socialLinks: profileArrays.socialLinks } : {}),
      };
      const applyRes = await publicApplyToJob(jobId, payload, resume!, documents, coverLetter);
      onClose();
      onSuccess?.();
      const detail =
        applyRes?.message ||
        "Your application is saved. Your account is pending—check your email to verify, then an administrator can activate your access. You can sign in once your account is active.";
      const em = email.trim().toLowerCase();
      await Swal.fire({
        icon: "success",
        title: "Application submitted",
        html: `
          <p class="mb-4">${detail}</p>
          <div class="text-left bg-gray-50 rounded-lg p-4 text-sm">
            <p class="font-semibold mb-2">Next steps:</p>
            <ul class="list-disc list-inside space-y-1 text-gray-700">
              <li>Check <strong>${em}</strong> and verify your address if you have not already</li>
              <li>Sign in once your account is active to track this application</li>
            </ul>
          </div>
        `,
        confirmButtonText: "Go to sign in",
        confirmButtonColor: "#36af4c",
        width: 560,
      });
      router.push(
        `${ROUTES.signIn}?registered=1&message=${encodeURIComponent("Application submitted. Account pending—verify your email, then sign in when an administrator has activated your account.")}`
      );
    } catch (error: unknown) {
      if (handleCaptchaApiError(error)) {
        setFormError(captchaRetryMessage);
        return;
      }

      const errorMessage = getApplySubmissionErrorMessage(error);
      if (errorMessage.includes("already exists")) {
        const result = await Swal.fire({
          icon: "info",
          title: "Account already exists",
          html: `${errorMessage}<br><br>Sign in to apply using this email.`,
          showCancelButton: true,
          confirmButtonText: "Go to sign in",
          cancelButtonText: "Close",
        });
        if (result.isConfirmed) {
          const applyPath =
            referralRef?.trim()
              ? `/ats/browse-jobs/${jobId}?ref=${encodeURIComponent(referralRef.trim())}`
              : `/ats/browse-jobs/${jobId}`;
          router.push(`${ROUTES.signIn}?next=${encodeURIComponent(applyPath)}`);
        }
      } else {
        await Swal.fire({ icon: "error", title: "Application failed", html: errorMessage });
      }
    } finally {
      finalizeProtectedAttempt();
      setApplying(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 overflow-y-auto" {...backdropProps}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="public-apply-modal-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl dark:bg-gray-800"
      >
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 id="public-apply-modal-title" className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
            Apply · {jobTitle}
          </h2>
          <button
            type="button"
            onClick={requestCloseModal}
            // Closing mid-submit would leave the upload running with no UI to report the result.
            disabled={applying}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-gray-200"
            aria-label="Close apply form"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleApplySubmit} className="space-y-4 p-6">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Create your account and submit this application in one step. Use a real phone number you can answer for
            verification calls.
          </p>
          {formError ? (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
            >
              {formError}
            </div>
          ) : null}
          <PublicApplyCaptcha
            onTokenChange={setCaptchaToken}
            onRegisterReset={registerCaptchaReset}
          />
          <PublicApplyResumeSection
            entryMode={entryMode}
            onEntryModeChange={(mode) => {
              setEntryMode(mode);
              if (mode === "ai" && resume) {
                void runParse(resume, prefillTargets);
              }
            }}
            resume={resume}
            resumeInputRef={resumeInputRef}
            onResumeSelected={handleResumeSelected}
            parseStatus={parseStatus}
            parseMessage={parseMessage}
            parseActivity={parseActivity}
            streamingSkills={streamingSkills}
            resumeInputId="public-apply-modal-resume"
            resumeInvalid={Boolean(fieldErrors.resume)}
            suggestedSkills={suggestedSkills}
            suggestedExperiences={suggestedExperiences}
            suggestedQualifications={suggestedQualifications}
            suggestedSocialLinks={suggestedSocialLinks}
            onExperiencesChange={setSuggestedExperiences}
            onQualificationsChange={setSuggestedQualifications}
            onSocialLinksChange={setSuggestedSocialLinks}
            onSkillsChange={setSuggestedSkills}
            onRetryParse={() => retryParse(prefillTargets)}
            showOptionalProfile={false}
            showResumeUpload={entryMode === "ai"}
          />
          <div>
            <label htmlFor="public-apply-modal-fullName" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Full name <span className="text-red-500">*</span>
              <PrefilledBadge show={prefilledFields.has("fullName")} />
            </label>
            <input
              id="public-apply-modal-fullName"
              type="text"
              value={fullName}
              onChange={(e) => {
                markFieldEdited("fullName");
                clearFieldError("fullName");
                setFullName(e.target.value);
              }}
              aria-invalid={fieldErrors.fullName ? true : undefined}
              aria-describedby={fieldErrors.fullName ? "public-apply-modal-fullName-error" : undefined}
              className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white ${fieldBorderClass(Boolean(fieldErrors.fullName))}`}
              placeholder="Your name"
              minLength={2}
              required
            />
            <FieldError id="public-apply-modal-fullName-error" message={fieldErrors.fullName} />
          </div>
          <div>
            <label htmlFor="public-apply-modal-email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email <span className="text-red-500">*</span>
              <PrefilledBadge show={prefilledFields.has("email")} />
            </label>
            <input
              id="public-apply-modal-email"
              type="email"
              value={email}
              onChange={(e) => {
                markFieldEdited("email");
                clearFieldError("email");
                setEmail(e.target.value);
              }}
              aria-invalid={fieldErrors.email ? true : undefined}
              aria-describedby={fieldErrors.email ? "public-apply-modal-email-error" : undefined}
              className={`w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white ${fieldBorderClass(Boolean(fieldErrors.email))}`}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label htmlFor="public-apply-modal-phone" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone <span className="text-red-500">*</span>
              <PrefilledBadge show={prefilledFields.has("phoneNumber")} />
            </label>
            <div className="flex gap-2">
              <PhoneCountrySelect
                id="public-apply-modal-countryCode"
                value={countryCode}
                onChange={(value) => {
                  markFieldEdited("countryCode");
                  setCountryCode(value);
                }}
                className="w-40"
              />
              <input
                id="public-apply-modal-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  markFieldEdited("phoneNumber");
                  clearFieldError("phoneNumber");
                  setPhoneNumber(e.target.value);
                }}
                aria-invalid={fieldErrors.phoneNumber ? true : undefined}
                aria-describedby={fieldErrors.phoneNumber ? "public-apply-modal-phone-error" : undefined}
                className={`flex-1 min-w-0 rounded-lg border px-4 py-2 focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white ${fieldBorderClass(Boolean(fieldErrors.phoneNumber))}`}
                placeholder={getPhoneCountry(countryCode).placeholder}
                maxLength={getPhoneCountry(countryCode).maxLength}
                inputMode="numeric"
                required
              />
            </div>
            <FieldError id="public-apply-modal-phone-error" message={fieldErrors.phoneNumber} />
          </div>
          {entryMode === "manual" ? (
            <div>
              <PublicApplyResumeUploadField
                resume={resume}
                resumeInputRef={resumeInputRef}
                onResumeSelected={handleResumeSelected}
                inputId="public-apply-modal-resume"
                invalid={Boolean(fieldErrors.resume)}
              />
              <FieldError id="public-apply-modal-resume-error" message={fieldErrors.resume} />
            </div>
          ) : null}
          <div>
            <label htmlFor="public-apply-modal-password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="public-apply-modal-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  clearFieldError("password");
                  setPassword(e.target.value);
                }}
                className={`w-full rounded-lg border py-2 pl-4 pr-11 focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white ${fieldBorderClass(Boolean(fieldErrors.password))}`}
                placeholder="Create a password"
                autoComplete="new-password"
                aria-invalid={fieldErrors.password ? true : undefined}
                aria-describedby="public-apply-modal-password-rules"
                minLength={PASSWORD_MIN_LENGTH}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:bg-white/10 dark:hover:text-gray-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                <i className={`text-xl ${showPassword ? "ri-eye-off-line" : "ri-eye-line"}`} aria-hidden />
              </button>
            </div>
            {/* Persistent, not a placeholder — the rules used to vanish on the first keystroke. */}
            <PasswordRulesList id="public-apply-modal-password-rules" value={password} />
            <FieldError id="public-apply-modal-password-error" message={fieldErrors.password} />
          </div>
          <div>
            <label htmlFor="public-apply-modal-confirmPassword" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirm password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="public-apply-modal-confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  clearFieldError("confirmPassword");
                  setConfirmPassword(e.target.value);
                }}
                onBlur={() => {
                  if (confirmPassword && confirmPassword !== password) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: "Both passwords must match." }));
                  }
                }}
                aria-invalid={fieldErrors.confirmPassword ? true : undefined}
                aria-describedby={
                  fieldErrors.confirmPassword ? "public-apply-modal-confirmPassword-error" : undefined
                }
                className={`w-full rounded-lg border py-2 pl-4 pr-11 focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white ${fieldBorderClass(Boolean(fieldErrors.confirmPassword))}`}
                placeholder="Re-enter password"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:bg-white/10 dark:hover:text-gray-200"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                <i className={`text-xl ${showConfirmPassword ? "ri-eye-off-line" : "ri-eye-line"}`} aria-hidden />
              </button>
            </div>
            <FieldError id="public-apply-modal-confirmPassword-error" message={fieldErrors.confirmPassword} />
          </div>
          {entryMode === "ai" ? (
            <PublicApplyOptionalProfileDetails
              entryMode={entryMode}
              parseStatus={parseStatus}
              suggestedSkills={suggestedSkills}
              suggestedExperiences={suggestedExperiences}
              suggestedQualifications={suggestedQualifications}
              suggestedSocialLinks={suggestedSocialLinks}
              onExperiencesChange={setSuggestedExperiences}
              onQualificationsChange={setSuggestedQualifications}
              onSocialLinksChange={setSuggestedSocialLinks}
              onSkillsChange={setSuggestedSkills}
            />
          ) : null}
          <PublicApplyCoverLetterField
            file={coverLetter}
            inputRef={coverLetterInputRef}
            onFileSelected={setCoverLetter}
            disabled={applying}
          />
          <div>
            <label
              htmlFor="public-apply-modal-documents"
              className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Additional documents (optional, max 5)
            </label>
            <input
              id="public-apply-modal-documents"
              ref={documentsInputRef}
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png"
              multiple
              onChange={handleDocumentsChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            {documents.length > 0 ? (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{documents.length} file(s)</p>
            ) : null}
          </div>
          {/* Sticky so the primary action stays reachable on this long, scrolling form. */}
          <div className="sticky bottom-0 -mx-6 -mb-6 flex gap-3 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
            <button
              type="button"
              onClick={requestCloseModal}
              className="flex-1 rounded-lg border border-gray-300 px-6 py-3 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={applying}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={applying}
              aria-busy={applying}
            >
              {applying ? (
                <>
                  <i className="ri-loader-4-line animate-spin motion-reduce:animate-none" aria-hidden />
                  Submitting…
                </>
              ) : (
                "Create account & apply"
              )}
            </button>
          </div>
        </form>
      </div>
      <ConfirmDiscardDialog open={confirmDiscardOpen} onConfirm={confirmDiscard} onCancel={cancelDiscard} />
    </div>
  );
}
