"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { isAxiosError } from "axios";
import Seo from "@/shared/layout-components/seo/seo";
import Swal from "sweetalert2";
import {
  getPublicJobById,
  getPublicJobs,
  publicApplyToJob,
  checkPublicAccountExists,
  PublicJob,
  PublicApplyPayload,
} from "@/shared/lib/api/jobs";
import { ROUTES } from "@/shared/lib/constants";
import { readStoredJobReferralRef, rememberJobReferralRef } from "@/shared/lib/jobReferralRef";
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

import { getPhoneCountry, getPhoneValidationError } from "@/shared/lib/phoneCountries";
import { isPublicResumeFile, PUBLIC_RESUME_FORMAT_MESSAGE } from "@/shared/lib/publicApplyResume";
import {
  formatJobDescriptionForDisplay,
  JOB_DESCRIPTION_PROSE_CLASS,
} from "@/shared/lib/ats/jobDescriptionHtml";

/** DOM ids so a failed submit can move focus to the first field that needs attention. */
const APPLY_FIELD_INPUT_ID: Record<ApplyFieldKey, string> = {
  fullName: "public-job-apply-fullName",
  email: "public-job-apply-email",
  phoneNumber: "public-job-apply-phone",
  resume: "public-job-apply-resume",
  password: "public-job-apply-password",
  confirmPassword: "public-job-apply-confirmPassword",
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

export default function PublicJobDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const jobId = params.jobId as string;
  const referralRefFromUrl = searchParams.get("ref")?.trim() || null;
  const [resolvedReferralRef, setResolvedReferralRef] = useState<string | null>(null);

  const [job, setJob] = useState<PublicJob | null>(null);
  const [otherJobs, setOtherJobs] = useState<PublicJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applying, setApplying] = useState(false);

  // Application form state
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
  const [emailExists, setEmailExists] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<ApplyFieldErrors>({});

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

  const closeApplyModal = () => {
    resetParseState();
    setFieldErrors({});
    setFormError("");
    setApplyModalOpen(false);
  };

  // A half-filled application is worth confirming before it is thrown away, and an in-flight
  // submit must not be dismissable at all — the request would continue with the UI gone.
  const applyFormDirty = Boolean(
    fullName || email || phoneNumber || password || confirmPassword || resume || coverLetter || documents.length
  );
  const {
    containerRef: applyModalRef,
    backdropProps: applyBackdropProps,
    requestClose: requestCloseApplyModal,
    confirmDiscardOpen,
    confirmDiscard,
    cancelDiscard,
  } = useModalBehavior({
    isOpen: applyModalOpen && !applying,
    onClose: closeApplyModal,
    isDirty: applyFormDirty,
  });

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

  useEffect(() => {
    loadJobDetails();
    loadOtherJobs();
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    rememberJobReferralRef(jobId, referralRefFromUrl);
    setResolvedReferralRef(referralRefFromUrl || readStoredJobReferralRef(jobId) || null);
  }, [jobId, referralRefFromUrl]);

  // Proactively detect an existing account so we can offer "log in to apply" instead of
  // erroring after a full submit. Debounced 500ms; any failure is silent (never blocks applying).
  useEffect(() => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      setEmailExists(false);
      setCheckingEmail(false);
      return;
    }
    let cancelled = false;
    setCheckingEmail(true);
    const t = setTimeout(async () => {
      const exists = await checkPublicAccountExists(e);
      if (!cancelled) {
        setEmailExists(exists);
        setCheckingEmail(false);
      }
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [email]);

  // Route an existing user to login, returning to this job's authenticated apply afterwards.
  const goToLoginForJob = () => {
    if (!jobId) {
      router.push(ROUTES.signIn);
      return;
    }
    const applyPath = resolvedReferralRef
      ? `/ats/browse-jobs/${jobId}?ref=${encodeURIComponent(resolvedReferralRef)}`
      : `/ats/browse-jobs/${jobId}`;
    router.push(`${ROUTES.signIn}?next=${encodeURIComponent(applyPath)}`);
  };

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const jobData = await getPublicJobById(jobId);
      setJob(jobData);
    } catch (error: any) {
      await Swal.fire({
        icon: "error",
        title: "Job Not Found",
        text: error.response?.data?.message || "This job is not available.",
        confirmButtonText: "Browse Jobs",
      });
      router.push("/public-job");
    } finally {
      setLoading(false);
    }
  };

  const loadOtherJobs = async () => {
    try {
      const result = await getPublicJobs({ limit: 6 });
      // Filter out the current job
      setOtherJobs(result.results.filter((j) => j.id !== jobId).slice(0, 5));
    } catch (error) {
      console.error("Failed to load other jobs:", error);
    }
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
      Swal.fire({
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
      Swal.fire({
        icon: "error",
        title: "File Too Large",
        text: "Each document must be less than 10MB.",
      });
      return;
    }
    setDocuments(files);
  };

  /**
   * Collects every problem at once and keys it by field, so each message can sit next to the input
   * it belongs to instead of being funnelled into one banner above a form that scrolls.
   */
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
    // Skipped entirely when the email already has an account — those inputs are not rendered.
    if (!emailExists) {
      if (password.length < PASSWORD_MIN_LENGTH) {
        errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
      } else if (!PASSWORD_REGEX.test(password)) {
        errors.password = "Add at least one uppercase letter and one number.";
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = "Both passwords must match.";
      }
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
        // Store local digits only — countryCode below is the source of truth for dial prefix.
        // Prepending here would double up at re-hydration ("+91" + "+91...").
        phoneNumber: (phoneNumber || "").replace(/\D/g, ""),
        countryCode,
        entryMode,
        ...(resolvedReferralRef ? { ref: resolvedReferralRef } : {}),
        ...(submitSkills.length > 0 ? { skills: submitSkills } : {}),
        ...(profileArrays.experiences.length > 0 ? { experiences: profileArrays.experiences } : {}),
        ...(profileArrays.qualifications.length > 0 ? { qualifications: profileArrays.qualifications } : {}),
        ...(profileArrays.socialLinks.length > 0 ? { socialLinks: profileArrays.socialLinks } : {}),
      };

      const result = await publicApplyToJob(jobId, payload, resume!, documents, coverLetter);

      const detail =
        result?.message ||
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
        // Special handling for duplicate account - show with login button
        const result = await Swal.fire({
          icon: "error",
          title: "Account Already Exists",
          html: `${errorMessage}<br><br>Please login to apply for this job.`,
          showCancelButton: true,
          confirmButtonText: "Go to Login",
          cancelButtonText: "Close",
          confirmButtonColor: "#3b82f6",
        });

        if (result.isConfirmed) {
          if (jobId) {
            const applyPath = resolvedReferralRef
              ? `/ats/browse-jobs/${jobId}?ref=${encodeURIComponent(resolvedReferralRef)}`
              : `/ats/browse-jobs/${jobId}`;
            router.push(`${ROUTES.signIn}?next=${encodeURIComponent(applyPath)}`);
          } else {
            router.push(ROUTES.signIn);
          }
        }
      } else {
        await Swal.fire({
          icon: "error",
          title: "Application Failed",
          html: errorMessage,
        });
      }
    } finally {
      finalizeProtectedAttempt();
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <>
      <Seo title={`${job.title} - Job Application`} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Job Details Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {job.title}
                </h1>
                <div className="text-lg text-gray-600 dark:text-gray-300">
                  <span className="font-semibold">{job.organisation.name}</span>
                  {job.location && <span className="ml-4">📍 {job.location}</span>}
                </div>
              </div>
              <button
                onClick={() => setApplyModalOpen(true)}
                className="mt-4 md:mt-0 px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition font-semibold text-lg"
              >
                Apply Now
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Job Type</span>
                <p className="font-semibold text-gray-900 dark:text-white">{job.jobType}</p>
              </div>
              {job.experienceLevel && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Experience Level</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{job.experienceLevel}</p>
                </div>
              )}
              {job.salaryRange && (job.salaryRange.min || job.salaryRange.max) && (
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Salary Range</span>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {job.salaryRange.currency || "USD"} {job.salaryRange.min?.toLocaleString() || "N/A"} -{" "}
                    {job.salaryRange.max?.toLocaleString() || "N/A"}
                  </p>
                </div>
              )}
            </div>

            {job.skillTags && job.skillTags.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {job.skillTags.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Job Description</h3>
              <div
                className={JOB_DESCRIPTION_PROSE_CLASS}
                dangerouslySetInnerHTML={{
                  __html: formatJobDescriptionForDisplay(job.jobDescription ?? ""),
                }}
              />
            </div>

            {job.organisation.description && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">About the Company</h3>
                <p className="text-gray-700 dark:text-gray-300">{job.organisation.description}</p>
                {job.organisation.website && (
                  <a
                    href={job.organisation.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline mt-2 inline-block"
                  >
                    Visit Website →
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Other Active Jobs Section */}
          {otherJobs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Other Open Positions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherJobs.map((otherJob) => (
                  <div
                    key={otherJob.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition cursor-pointer"
                    onClick={() => router.push(`/public-job/${otherJob.id}`)}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {otherJob.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {otherJob.organisation.name}
                    </p>
                    {otherJob.location && (
                      <p className="text-sm text-gray-500 dark:text-gray-500 mb-2">📍 {otherJob.location}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">{otherJob.jobType}</span>
                      {otherJob.experienceLevel && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                          {otherJob.experienceLevel}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-6">
                <button
                  onClick={() => router.push("/public-job")}
                  className="px-6 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition"
                >
                  View All Jobs
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Apply Modal */}
        {applyModalOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            {...applyBackdropProps}
          >
            <div
              ref={applyModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="public-job-apply-title"
              className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
                <h2 id="public-job-apply-title" className="text-2xl font-bold text-gray-900 dark:text-white">
                  Apply for {job.title}
                </h2>
                <button
                  type="button"
                  onClick={requestCloseApplyModal}
                  // Closing mid-submit would leave the upload running with no UI to report the result.
                  disabled={applying}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-2xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-white/10 dark:hover:text-gray-200"
                  aria-label="Close apply form"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
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
                  resumeInputId="public-job-apply-resume"
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
                  <label htmlFor="public-job-apply-fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name <span className="text-red-500">*</span>
                    <PrefilledBadge show={prefilledFields.has("fullName")} />
                  </label>
                  <input
                    id="public-job-apply-fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      markFieldEdited("fullName");
                      clearFieldError("fullName");
                      setFullName(e.target.value);
                    }}
                    aria-invalid={fieldErrors.fullName ? true : undefined}
                    aria-describedby={fieldErrors.fullName ? "public-job-apply-fullName-error" : undefined}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white ${fieldBorderClass(Boolean(fieldErrors.fullName))}`}
                    placeholder="John Doe"
                    minLength={2}
                    required
                  />
                  <FieldError id="public-job-apply-fullName-error" message={fieldErrors.fullName} />
                </div>

                <div>
                  <label htmlFor="public-job-apply-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email <span className="text-red-500">*</span>
                    <PrefilledBadge show={prefilledFields.has("email")} />
                  </label>
                  <input
                    id="public-job-apply-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      markFieldEdited("email");
                      clearFieldError("email");
                      setEmail(e.target.value);
                    }}
                    autoComplete="email"
                    aria-invalid={fieldErrors.email ? true : undefined}
                    aria-describedby={
                      [
                        fieldErrors.email ? "public-job-apply-email-error" : null,
                        emailExists ? "public-job-apply-email-exists" : null,
                      ]
                        .filter(Boolean)
                        .join(" ") || undefined
                    }
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white ${fieldBorderClass(Boolean(fieldErrors.email))}`}
                    placeholder="john@example.com"
                    required
                  />
                  <FieldError id="public-job-apply-email-error" message={fieldErrors.email} />
                  {checkingEmail && (
                    <p className="mt-1 text-xs text-slate-600 dark:text-gray-400">Checking…</p>
                  )}
                  {emailExists && (
                    <div
                      id="public-job-apply-email-exists"
                      role="status"
                      aria-live="polite"
                      className="mt-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 text-sm text-gray-700 dark:text-gray-200"
                    >
                      <p className="flex items-start gap-2">
                        <i className="ri-information-line mt-0.5 text-primary" aria-hidden />
                        <span className="flex-1">
                          You already have an account with this email, so there is no password to set —
                          sign in and your application will carry on from there.
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={goToLoginForJob}
                        className="mt-2 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:w-auto"
                      >
                        Log in to apply
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="public-job-apply-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                    <PrefilledBadge show={prefilledFields.has("phoneNumber")} />
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
                    <div className="w-full shrink-0 sm:w-44">
                      <PhoneCountrySelect
                        id="public-job-apply-countryCode"
                        value={countryCode}
                        onChange={(value) => {
                          markFieldEdited("countryCode");
                          setCountryCode(value);
                        }}
                        className="w-full"
                      />
                    </div>
                    <input
                      id="public-job-apply-phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => {
                        markFieldEdited("phoneNumber");
                        clearFieldError("phoneNumber");
                        setPhoneNumber(e.target.value);
                      }}
                      aria-invalid={fieldErrors.phoneNumber ? true : undefined}
                      aria-describedby={fieldErrors.phoneNumber ? "public-job-apply-phone-error" : undefined}
                      className={`min-w-0 flex-1 w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white ${fieldBorderClass(Boolean(fieldErrors.phoneNumber))}`}
                      placeholder={getPhoneCountry(countryCode).placeholder}
                      maxLength={getPhoneCountry(countryCode).maxLength}
                      inputMode="numeric"
                      required
                    />
                  </div>
                  <FieldError id="public-job-apply-phone-error" message={fieldErrors.phoneNumber} />
                </div>

                {entryMode === "manual" ? (
                  <div>
                    <PublicApplyResumeUploadField
                      resume={resume}
                      resumeInputRef={resumeInputRef}
                      onResumeSelected={handleResumeSelected}
                      inputId="public-job-apply-resume"
                      invalid={Boolean(fieldErrors.resume)}
                    />
                    <FieldError id="public-job-apply-resume-error" message={fieldErrors.resume} />
                  </div>
                ) : null}

                {/*
                  Hidden once we know the email already has an account: asking someone to create a
                  password for an account they already own is a dead end, and these were previously
                  left on screen still marked `required`.
                */}
                {!emailExists ? (
                  <>
                    <div>
                      <label htmlFor="public-job-apply-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="public-job-apply-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => {
                            clearFieldError("password");
                            setPassword(e.target.value);
                          }}
                          aria-invalid={fieldErrors.password ? true : undefined}
                          aria-describedby="public-job-apply-password-rules"
                          className={`w-full py-2 pl-4 pr-11 border rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white ${fieldBorderClass(Boolean(fieldErrors.password))}`}
                          placeholder="Create a password"
                          autoComplete="new-password"
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
                      <PasswordRulesList id="public-job-apply-password-rules" value={password} />
                      <FieldError id="public-job-apply-password-error" message={fieldErrors.password} />
                    </div>

                    <div>
                      <label htmlFor="public-job-apply-confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="public-job-apply-confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => {
                            clearFieldError("confirmPassword");
                            setConfirmPassword(e.target.value);
                          }}
                          // Checked on blur rather than per keystroke, so it does not shout mid-typing.
                          onBlur={() => {
                            if (confirmPassword && confirmPassword !== password) {
                              setFieldErrors((prev) => ({ ...prev, confirmPassword: "Both passwords must match." }));
                            }
                          }}
                          aria-invalid={fieldErrors.confirmPassword ? true : undefined}
                          aria-describedby={
                            fieldErrors.confirmPassword ? "public-job-apply-confirmPassword-error" : undefined
                          }
                          className={`w-full py-2 pl-4 pr-11 border rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white ${fieldBorderClass(Boolean(fieldErrors.confirmPassword))}`}
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
                      <FieldError
                        id="public-job-apply-confirmPassword-error"
                        message={fieldErrors.confirmPassword}
                      />
                    </div>
                  </>
                ) : null}

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
                    htmlFor="public-job-apply-documents"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Additional Documents (Optional - Max 5 files)
                  </label>
                  <input
                    id="public-job-apply-documents"
                    ref={documentsInputRef}
                    type="file"
                    accept=".pdf,.docx,.jpg,.jpeg,.png"
                    multiple
                    onChange={handleDocumentsChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  />
                  {documents.length > 0 && (
                    <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
                      {documents.length} file(s) selected
                    </p>
                  )}
                </div>

                {/*
                  Sticky so the primary action stays reachable — this form runs well past the fold
                  once the AI profile editor is expanded.
                */}
                <div className="sticky bottom-0 -mx-6 -mb-6 flex gap-3 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
                  <button
                    type="button"
                    onClick={requestCloseApplyModal}
                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={applying}
                  >
                    Cancel
                  </button>
                  {emailExists ? (
                    <button
                      type="button"
                      onClick={goToLoginForJob}
                      className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition"
                    >
                      Log in to apply
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="flex flex-1 items-center justify-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={applying}
                      aria-busy={applying}
                    >
                      {applying ? (
                        <>
                          <i className="ri-loader-4-line animate-spin motion-reduce:animate-none" aria-hidden />
                          Submitting…
                        </>
                      ) : (
                        "Submit Application"
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>
            <ConfirmDiscardDialog
              open={confirmDiscardOpen}
              onConfirm={confirmDiscard}
              onCancel={cancelDiscard}
            />
          </div>
        )}
      </div>
    </>
  );
}
