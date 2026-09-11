/** PDF/DOCX only — legacy .doc is not supported (matches backend upload validation). */
export const PUBLIC_RESUME_ACCEPT = ".pdf,.docx";

export const PUBLIC_RESUME_FORMAT_MESSAGE =
  "Resume must be a PDF or DOCX file. Legacy Word (.doc) files are not supported.";

export const PUBLIC_RESUME_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

export function isPublicResumeFile(file: File): boolean {
  const lower = file.name.toLowerCase();
  return (
    file.type === "application/pdf" ||
    lower.endsWith(".pdf") ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  );
}

export {
  CAPTCHA_RETRY_MESSAGE,
  consumeCaptchaToken,
  getCaptchaApiErrorCode,
  getOptionalCaptchaToken,
  isCaptchaApiError,
} from "@/shared/lib/publicApplyCaptcha";
