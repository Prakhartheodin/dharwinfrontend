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
  PublicJob,
  PublicApplyPayload,
} from "@/shared/lib/api/jobs";
import { ROUTES } from "@/shared/lib/constants";
import { readStoredJobReferralRef, rememberJobReferralRef } from "@/shared/lib/jobReferralRef";
import { PhoneCountrySelect } from "@/shared/components/PhoneCountrySelect";
import { getPhoneValidationError, formatPhoneForApi } from "@/shared/lib/phoneCountries";
import {
  formatJobDescriptionForDisplay,
  JOB_DESCRIPTION_PROSE_CLASS,
} from "@/shared/lib/ats/jobDescriptionHtml";

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
  const [coverLetter, setCoverLetter] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [documents, setDocuments] = useState<File[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const documentsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadJobDetails();
    loadOtherJobs();
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    rememberJobReferralRef(jobId, referralRefFromUrl);
    setResolvedReferralRef(referralRefFromUrl || readStoredJobReferralRef(jobId) || null);
  }, [jobId, referralRefFromUrl]);

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

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (!validTypes.includes(file.type)) {
        Swal.fire({
          icon: "error",
          title: "Invalid File Type",
          text: "Please upload a PDF or DOC file for your resume.",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        Swal.fire({
          icon: "error",
          title: "File Too Large",
          text: "Resume file must be less than 10MB.",
        });
        return;
      }
      setResume(file);
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
    const validTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/jpg", "image/png"];
    const invalidFiles = files.filter((f) => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      Swal.fire({
        icon: "error",
        title: "Invalid File Type",
        text: "Documents must be PDF, DOC, JPG, or PNG files.",
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
      await Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: validationError,
      });
      return;
    }

    setApplying(true);

    try {
      const payload: PublicApplyPayload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phoneNumber: formatPhoneForApi(phoneNumber, countryCode),
        countryCode,
        coverLetter: coverLetter.trim(),
        ...(resolvedReferralRef ? { ref: resolvedReferralRef } : {}),
      };

      const result = await publicApplyToJob(jobId, payload, resume!, documents);

      const detail =
        result?.message ||
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Apply for {job.title}</h2>
                <button
                  onClick={() => setApplyModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    placeholder="john@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <PhoneCountrySelect
                      value={countryCode}
                      onChange={setCountryCode}
                      className="w-40"
                    />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      placeholder="Enter phone number"
                      inputMode="numeric"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full py-2 pl-4 pr-11 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      placeholder="Min 8 characters"
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full py-2 pl-4 pr-11 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                      placeholder="Re-enter password"
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Resume <span className="text-red-500">*</span> (PDF, DOC - Max 10MB)
                  </label>
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleResumeChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    required
                  />
                  {resume && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Selected: {resume.name} ({(resume.size / 1024).toFixed(0)} KB)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Additional Documents (Optional - Max 5 files)
                  </label>
                  <input
                    ref={documentsInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    multiple
                    onChange={handleDocumentsChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  />
                  {documents.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {documents.length} file(s) selected
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cover Letter (Optional)
                  </label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                    placeholder="Why are you a good fit for this role?"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setApplyModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    disabled={applying}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={applying}
                  >
                    {applying ? "Submitting..." : "Submit Application"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
