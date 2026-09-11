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
import { PublicApplyResumeSection } from "@/shared/components/ats/PublicApplyResumeSection";
import { usePublicApplyCaptcha } from "@/shared/hooks/usePublicApplyCaptcha";
import { usePublicResumeParse } from "@/shared/hooks/usePublicResumeParse";
import { getPhoneValidationError } from "@/shared/lib/phoneCountries";
import { isPublicResumeFile, PUBLIC_RESUME_FORMAT_MESSAGE } from "@/shared/lib/publicApplyResume";

const PASSWORD_MIN_LENGTH = 8;

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
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("US");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [coverLetter, setCoverLetter] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);
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
    suggestedExperiences,
    setSuggestedExperiences,
    suggestedQualifications,
    setSuggestedQualifications,
    suggestedSocialLinks,
    setSuggestedSocialLinks,
    markFieldEdited,
    runParse,
    retryParse,
    resetParseState,
    getSubmitSkills,
    getSubmitProfileArrays,
  } = usePublicResumeParse(jobId, { onCaptchaTokenConsumed: rotateCaptchaToken });

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

  const validateForm = (): string | null => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      return "Please enter your full name (at least 2 characters).";
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Please enter a valid email address.";
    }
    const phoneError = getPhoneValidationError(phoneNumber, countryCode);
    if (phoneError) {
      return phoneError;
    }
    if (password.length < PASSWORD_MIN_LENGTH) {
      return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
    }
    if (password !== confirmPassword) {
      return "Passwords do not match.";
    }
    if (!resume) {
      return "Please upload your resume.";
    }
    return null;
  };

  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      await Swal.fire({ icon: "error", title: "Validation Error", text: validationError });
      return;
    }

    const captchaError = ensureCaptchaReady();
    if (captchaError) {
      await Swal.fire({ icon: "warning", title: "Security check required", text: captchaError });
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
        coverLetter: coverLetter.trim(),
        ...(referralRef?.trim() ? { ref: referralRef.trim() } : {}),
        ...(submitSkills.length > 0 ? { skills: submitSkills } : {}),
        ...(profileArrays.experiences.length > 0 ? { experiences: profileArrays.experiences } : {}),
        ...(profileArrays.qualifications.length > 0 ? { qualifications: profileArrays.qualifications } : {}),
        ...(profileArrays.socialLinks.length > 0 ? { socialLinks: profileArrays.socialLinks } : {}),
      };
      const applyRes = await publicApplyToJob(jobId, payload, resume!, documents);
      onClose();
      onSuccess?.();
      const detail =
        applyRes?.message ||
        "Your application is saved. Your account is pending—check your email to verify, then an administrator can activate your access. You can sign in once your account is active.";
      await Swal.fire({
        icon: "success",
        title: "Application submitted",
        text: detail,
        confirmButtonText: "Go to sign in",
        width: 560,
      });
      router.push(
        `${ROUTES.signIn}?registered=1&message=${encodeURIComponent("Application submitted. Account pending—verify your email, then sign in when an administrator has activated your account.")}`
      );
    } catch (error: unknown) {
      if (handleCaptchaApiError(error)) {
        await Swal.fire({
          icon: "warning",
          title: "Security check required",
          text: captchaRetryMessage,
        });
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl dark:bg-gray-800">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">Apply · {jobTitle}</h2>
          <button
            type="button"
            onClick={() => {
              if (!applying) {
                resetParseState();
                onClose();
              }
            }}
            className="text-2xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleApplySubmit} className="space-y-4 p-6">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Create your account and submit this application in one step. Use a real phone number you can answer for
            verification calls.
          </p>
          <PublicApplyCaptcha
            onTokenChange={setCaptchaToken}
            onRegisterReset={registerCaptchaReset}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Full name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => {
                markFieldEdited("fullName");
                setFullName(e.target.value);
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Your name"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                markFieldEdited("email");
                setEmail(e.target.value);
              }}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Phone <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <PhoneCountrySelect
                value={countryCode}
                onChange={(value) => {
                  markFieldEdited("countryCode");
                  setCountryCode(value);
                }}
                className="w-40"
              />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => {
                  markFieldEdited("phoneNumber");
                  setPhoneNumber(e.target.value);
                }}
                className="flex-1 min-w-0 rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Phone number"
                inputMode="numeric"
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-4 pr-11 focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder={`Min ${PASSWORD_MIN_LENGTH} characters`}
                autoComplete="new-password"
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
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirm password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-4 pr-11 focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 dark:hover:bg-white/10 dark:hover:text-gray-200"
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                <i className={`text-xl ${showConfirmPassword ? "ri-eye-off-line" : "ri-eye-line"}`} aria-hidden />
              </button>
            </div>
          </div>
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
            suggestedSkills={suggestedSkills}
            suggestedExperiences={suggestedExperiences}
            suggestedQualifications={suggestedQualifications}
            suggestedSocialLinks={suggestedSocialLinks}
            onExperiencesChange={setSuggestedExperiences}
            onQualificationsChange={setSuggestedQualifications}
            onSocialLinksChange={setSuggestedSocialLinks}
            onRetryParse={() => retryParse(prefillTargets)}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Additional documents (optional, max 5)
            </label>
            <input
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
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Cover letter (optional)</label>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-primary dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => !applying && onClose()}
              className="flex-1 rounded-lg border border-gray-300 px-6 py-3 text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              disabled={applying}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-primary px-6 py-3 text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={applying}
            >
              {applying ? "Submitting…" : "Create account & apply"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
