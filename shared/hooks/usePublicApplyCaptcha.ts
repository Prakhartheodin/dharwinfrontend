"use client";

import { useCallback, useRef, useState } from "react";
import {
  CAPTCHA_RETRY_MESSAGE,
  consumeCaptchaToken,
  getCaptchaSubmitBlockReason,
  getOptionalCaptchaToken,
  getPublicCaptchaConfig,
  isCaptchaApiError,
  setPublicCaptchaToken,
} from "@/shared/lib/publicApplyCaptcha";

export function usePublicApplyCaptcha() {
  const config = getPublicCaptchaConfig();
  const [captchaToken, setCaptchaTokenState] = useState<string | null>(null);
  const resetWidgetRef = useRef<(() => void) | null>(null);

  const setCaptchaToken = useCallback((token: string | null) => {
    setPublicCaptchaToken(token);
    setCaptchaTokenState(token);
  }, []);

  const captchaReady = !config.widgetConfigured || Boolean(getOptionalCaptchaToken());
  const captchaBlockReason = getCaptchaSubmitBlockReason();

  const registerCaptchaReset = useCallback((reset: () => void) => {
    resetWidgetRef.current = reset;
  }, []);

  const rotateCaptchaToken = useCallback(() => {
    consumeCaptchaToken();
    setCaptchaToken(null);
    resetWidgetRef.current?.();
  }, [setCaptchaToken]);

  const handleCaptchaApiError = useCallback(
    (err: unknown): boolean => {
      if (!isCaptchaApiError(err)) return false;
      rotateCaptchaToken();
      return true;
    },
    [rotateCaptchaToken]
  );

  const ensureCaptchaReady = useCallback((): string | null => {
    if (config.misconfigured) {
      return "Security verification is not configured correctly. Please try again later or contact support.";
    }
    if (!config.widgetConfigured) return null;
    if (getOptionalCaptchaToken()) return null;
    return "Complete the security check below before uploading your resume or submitting your application.";
  }, [config.misconfigured, config.widgetConfigured]);

  const finalizeProtectedAttempt = useCallback(() => {
    if (!config.widgetConfigured) return;
    rotateCaptchaToken();
  }, [config.widgetConfigured, rotateCaptchaToken]);

  return {
    config,
    captchaToken,
    captchaReady,
    captchaBlockReason,
    captchaRetryMessage: CAPTCHA_RETRY_MESSAGE,
    setCaptchaToken,
    registerCaptchaReset,
    rotateCaptchaToken,
    finalizeProtectedAttempt,
    handleCaptchaApiError,
    ensureCaptchaReady,
  };
}
