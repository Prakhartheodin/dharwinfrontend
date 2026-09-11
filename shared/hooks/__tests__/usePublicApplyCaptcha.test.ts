import { AxiosError } from "axios";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { setPublicCaptchaToken } from "@/shared/lib/publicApplyCaptcha";
import { usePublicApplyCaptcha } from "../usePublicApplyCaptcha";

vi.mock("@/shared/lib/publicApplyCaptcha", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/publicApplyCaptcha")>();
  return {
    ...actual,
    getPublicCaptchaConfig: () => ({
      provider: "turnstile",
      siteKey: "site-key",
      widgetConfigured: true,
      misconfigured: false,
    }),
  };
});

describe("usePublicApplyCaptcha", () => {
  afterEach(() => {
    setPublicCaptchaToken(null);
  });

  it("rotates captcha state when a captcha API error occurs", () => {
    const reset = vi.fn();
    const { result } = renderHook(() => usePublicApplyCaptcha());

    act(() => {
      result.current.registerCaptchaReset(reset);
      result.current.setCaptchaToken("token-a");
      setPublicCaptchaToken("token-a");
    });

    const err = new AxiosError(
      "Captcha verification failed",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 400,
        data: { message: "Captcha verification failed", errorCode: "CAPTCHA_INVALID" },
        statusText: "Bad Request",
        headers: {},
        config: { headers: {} } as never,
      }
    );

    let handled = false;
    act(() => {
      handled = result.current.handleCaptchaApiError(err);
    });

    expect(handled).toBe(true);
    expect(result.current.captchaToken).toBeNull();
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("does not treat stale React captcha state as ready after the stored token is consumed", () => {
    const { result } = renderHook(() => usePublicApplyCaptcha());

    act(() => {
      result.current.setCaptchaToken("token-a");
    });

    act(() => {
      setPublicCaptchaToken(null);
    });

    expect(result.current.ensureCaptchaReady()).toContain("Complete the security check");

    act(() => {
      result.current.finalizeProtectedAttempt();
    });

    expect(result.current.captchaReady).toBe(false);
  });

  it("finalizeProtectedAttempt clears captcha state after protected submit attempts", () => {
    const reset = vi.fn();
    const { result } = renderHook(() => usePublicApplyCaptcha());

    act(() => {
      result.current.registerCaptchaReset(reset);
      result.current.setCaptchaToken("token-a");
    });

    act(() => {
      result.current.finalizeProtectedAttempt();
    });

    expect(result.current.captchaToken).toBeNull();
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
