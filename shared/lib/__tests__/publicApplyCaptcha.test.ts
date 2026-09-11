import { AxiosError } from "axios";
import { afterEach, describe, expect, it } from "vitest";
import {
  consumeCaptchaToken,
  getCaptchaApiErrorCode,
  getCaptchaSubmitBlockReason,
  getOptionalCaptchaToken,
  getPublicCaptchaConfig,
  isCaptchaApiError,
  setPublicCaptchaToken,
} from "../publicApplyCaptcha";

describe("publicApplyCaptcha", () => {
  afterEach(() => {
    setPublicCaptchaToken(null);
  });

  it("does not block when captcha widget is not configured", () => {
    expect(getPublicCaptchaConfig().widgetConfigured).toBe(false);
    expect(getCaptchaSubmitBlockReason()).toBeNull();
  });

  it("stores and reads captcha token for API headers", () => {
    setPublicCaptchaToken("test-token");
    expect(getOptionalCaptchaToken()).toBe("test-token");
  });

  it("clears stored token", () => {
    setPublicCaptchaToken("test-token");
    setPublicCaptchaToken(null);
    expect(getOptionalCaptchaToken()).toBeUndefined();
  });

  it("consumeCaptchaToken clears a stored token", () => {
    setPublicCaptchaToken("test-token");
    consumeCaptchaToken();
    expect(getOptionalCaptchaToken()).toBeUndefined();
  });

  it("recognizes captcha API failures", () => {
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
    expect(isCaptchaApiError(err)).toBe(true);
    expect(getCaptchaApiErrorCode(err)).toBe("CAPTCHA_INVALID");
  });
});
