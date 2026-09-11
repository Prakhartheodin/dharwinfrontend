import { isAxiosError } from "axios";

export type PublicCaptchaProvider = "turnstile" | "hcaptcha" | "recaptcha" | "";

export const CAPTCHA_RETRY_MESSAGE =
  "Security verification expired or was already used. Complete the check below again, then retry.";

export type PublicCaptchaConfig = {
  provider: PublicCaptchaProvider;
  siteKey: string;
  /** Widget can render and obtain a token on the client. */
  widgetConfigured: boolean;
  /** Provider env is set but site key is missing — block with explicit UX instead of silent API failure. */
  misconfigured: boolean;
};

let storedCaptchaToken: string | null = null;

export function getPublicCaptchaConfig(): PublicCaptchaConfig {
  const provider = (process.env.NEXT_PUBLIC_CAPTCHA_PROVIDER || "").trim().toLowerCase() as PublicCaptchaProvider;
  const siteKey = (process.env.NEXT_PUBLIC_CAPTCHA_SITE_KEY || "").trim();
  const providerValid = provider === "turnstile" || provider === "hcaptcha" || provider === "recaptcha";
  const widgetConfigured = providerValid && Boolean(siteKey);

  return {
    provider: providerValid ? provider : "",
    siteKey,
    widgetConfigured,
    misconfigured: providerValid && !siteKey,
  };
}

export function setPublicCaptchaToken(token: string | null | undefined): void {
  const next = token?.trim() || null;
  storedCaptchaToken = next;
  if (typeof window !== "undefined") {
    const w = window as Window & { __dharwinCaptchaToken?: string };
    if (next) w.__dharwinCaptchaToken = next;
    else delete w.__dharwinCaptchaToken;
  }
}

/** Clear the stored token after a captcha-protected API call (tokens are single-use). */
export function consumeCaptchaToken(): void {
  setPublicCaptchaToken(null);
}

const CAPTCHA_API_ERROR_CODES = new Set([
  "CAPTCHA_INVALID",
  "CAPTCHA_REQUIRED",
  "CAPTCHA_UNAVAILABLE",
]);

export function getCaptchaApiErrorCode(err: unknown): string | null {
  if (!isAxiosError(err) || !err.response?.data) return null;
  const data = err.response.data as { errorCode?: string };
  const code = data.errorCode?.trim();
  return code && CAPTCHA_API_ERROR_CODES.has(code) ? code : null;
}

export function isCaptchaApiError(err: unknown): boolean {
  return getCaptchaApiErrorCode(err) !== null;
}

export function getOptionalCaptchaToken(): string | undefined {
  const fromStore = storedCaptchaToken?.trim();
  if (fromStore) return fromStore;
  if (typeof window !== "undefined") {
    const w = window as Window & { __dharwinCaptchaToken?: string };
    const token = w.__dharwinCaptchaToken?.trim();
    return token || undefined;
  }
  return undefined;
}

/** Returns a user-facing block reason when apply/parse must not proceed yet. */
export function getCaptchaSubmitBlockReason(): string | null {
  const config = getPublicCaptchaConfig();
  if (config.misconfigured) {
    return "Security verification is not configured correctly. Please try again later or contact support.";
  }
  if (!config.widgetConfigured) return null;
  if (getOptionalCaptchaToken()) return null;
  return "Complete the security check below before uploading your resume or submitting your application.";
}

export function isPublicCaptchaReady(): boolean {
  return getCaptchaSubmitBlockReason() === null;
}
