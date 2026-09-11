"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
  getPublicCaptchaConfig,
  setPublicCaptchaToken,
  type PublicCaptchaProvider,
} from "@/shared/lib/publicApplyCaptcha";

type PublicApplyCaptchaProps = {
  onTokenChange?: (token: string | null) => void;
  onRegisterReset?: (reset: () => void) => void;
};

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
    hcaptcha?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
    grecaptcha?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
    };
    onHcaptchaLoad?: () => void;
    onRecaptchaLoad?: () => void;
  }
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load captcha script: ${src}`));
    document.head.appendChild(script);
  });
}

async function waitForGlobal(getter: () => unknown, attempts = 40, delayMs = 50): Promise<boolean> {
  for (let i = 0; i < attempts; i += 1) {
    if (getter()) return true;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

export function PublicApplyCaptcha({ onTokenChange, onRegisterReset }: PublicApplyCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const config = getPublicCaptchaConfig();

  const publishToken = useCallback(
    (token: string | null) => {
      setPublicCaptchaToken(token);
      onTokenChange?.(token);
    },
    [onTokenChange]
  );

  const resetWidget = useCallback(() => {
    publishToken(null);
    const widgetId = widgetIdRef.current;
    if (!widgetId) return;
    try {
      if (config.provider === "turnstile" && window.turnstile?.reset) {
        window.turnstile.reset(widgetId);
      } else if (config.provider === "hcaptcha" && window.hcaptcha?.reset) {
        window.hcaptcha.reset(widgetId);
      } else if (config.provider === "recaptcha" && window.grecaptcha?.reset) {
        window.grecaptcha.reset(widgetId);
      }
    } catch {
      // ignore provider reset errors
    }
  }, [config.provider, publishToken]);

  useEffect(() => {
    onRegisterReset?.(resetWidget);
    return () => {
      onRegisterReset?.(() => {});
    };
  }, [onRegisterReset, resetWidget]);

  useEffect(() => {
    if (!config.widgetConfigured) {
      publishToken(null);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    const mountWidget = async (provider: PublicCaptchaProvider, siteKey: string) => {
      if (provider === "turnstile") {
        await loadScript("https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit", "cf-turnstile");
        const ready = await waitForGlobal(() => window.turnstile?.render);
        if (!ready || cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => publishToken(token),
          "expired-callback": () => publishToken(null),
          "error-callback": () => publishToken(null),
        });
        return;
      }

      if (provider === "hcaptcha") {
        await loadScript("https://js.hcaptcha.com/1/api.js?render=explicit", "hcaptcha-api");
        const ready = await waitForGlobal(() => window.hcaptcha?.render);
        if (!ready || cancelled || !containerRef.current || !window.hcaptcha) return;
        widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => publishToken(token),
          "expired-callback": () => publishToken(null),
          "error-callback": () => publishToken(null),
        });
        return;
      }

      if (provider === "recaptcha") {
        await loadScript("https://www.google.com/recaptcha/api.js?render=explicit", "recaptcha-api");
        const ready = await waitForGlobal(() => window.grecaptcha?.render);
        if (!ready || cancelled || !containerRef.current || !window.grecaptcha) return;
        widgetIdRef.current = window.grecaptcha.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => publishToken(token),
          "expired-callback": () => publishToken(null),
        });
      }
    };

    void mountWidget(config.provider, config.siteKey).catch(() => publishToken(null));

    return () => {
      cancelled = true;
      const widgetId = widgetIdRef.current;
      if (widgetId) {
        try {
          if (config.provider === "turnstile" && window.turnstile) window.turnstile.remove(widgetId);
          if (config.provider === "hcaptcha" && window.hcaptcha) window.hcaptcha.remove(widgetId);
          if (config.provider === "recaptcha" && window.grecaptcha) window.grecaptcha.reset(widgetId);
        } catch {
          // ignore teardown errors
        }
      }
      widgetIdRef.current = null;
      publishToken(null);
    };
  }, [config.provider, config.siteKey, config.widgetConfigured, publishToken]);

  if (config.misconfigured) {
    return (
      <div
        role="alert"
        className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
      >
        Security verification is not configured correctly. Please try again later or contact support.
      </div>
    );
  }

  if (!config.widgetConfigured) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Complete the security check below before uploading your resume or submitting your application.
      </p>
      <div ref={containerRef} />
    </div>
  );
}
