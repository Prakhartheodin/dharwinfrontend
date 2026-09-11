import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const postMock = vi.hoisted(() => vi.fn());

vi.mock("axios", async (importOriginal) => {
  const actual = await importOriginal<typeof import("axios")>();
  const makeClient = () => ({
    post: postMock,
    get: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  });
  return {
    ...actual,
    default: {
      ...actual.default,
      create: vi.fn(makeClient),
      isAxiosError: actual.default.isAxiosError,
    },
  };
});

import { parsePublicResume, publicApplyToJob } from "@/shared/lib/api/jobs";
import {
  consumeCaptchaToken,
  getCaptchaApiErrorCode,
  getOptionalCaptchaToken,
  isCaptchaApiError,
  setPublicCaptchaToken,
} from "@/shared/lib/publicApplyCaptcha";

function makeFile(name = "resume.pdf"): File {
  return new File(["resume"], name, { type: "application/pdf" });
}

describe("public apply captcha lifecycle", () => {
  beforeEach(() => {
    postMock.mockReset();
    setPublicCaptchaToken(null);
  });

  afterEach(() => {
    setPublicCaptchaToken(null);
  });

  it("consumes a captcha token after each protected API call", async () => {
    postMock.mockResolvedValue({ data: { status: "success", warnings: [], fields: {} } });
    setPublicCaptchaToken("token-parse");

    await parsePublicResume("job-1", makeFile());
    expect(getOptionalCaptchaToken()).toBeUndefined();
    expect(postMock.mock.calls[0]?.[2]?.headers?.["x-captcha-token"]).toBe("token-parse");
  });

  it("uses a fresh token for apply after parse consumed the first token", async () => {
    postMock
      .mockResolvedValueOnce({
        data: {
          status: "success",
          warnings: [],
          fields: {
            fullName: "Jane",
            email: "jane@example.com",
            phoneNumber: "5551234",
            countryCode: "US",
            skills: [],
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          user: { id: "u1", name: "Jane", email: "jane@example.com" },
          candidate: { id: "c1", fullName: "Jane" },
          application: { id: "a1", status: "applied" },
        },
      });

    setPublicCaptchaToken("token-parse");
    await parsePublicResume("job-1", makeFile());
    expect(getOptionalCaptchaToken()).toBeUndefined();

    setPublicCaptchaToken("token-apply");
    await publicApplyToJob(
      "job-1",
      {
        fullName: "Jane",
        email: "jane@example.com",
        password: "password123",
        phoneNumber: "5551234",
        countryCode: "US",
      },
      makeFile()
    );

    expect(postMock).toHaveBeenCalledTimes(2);
    expect(postMock.mock.calls[0]?.[2]?.headers?.["x-captcha-token"]).toBe("token-parse");
    expect(postMock.mock.calls[1]?.[2]?.headers?.["x-captcha-token"]).toBe("token-apply");
    expect(getOptionalCaptchaToken()).toBeUndefined();
  });

  it("clears the token when a protected API call fails", async () => {
    postMock.mockRejectedValue(new Error("network"));
    setPublicCaptchaToken("token-parse");

    await expect(parsePublicResume("job-1", makeFile())).rejects.toThrow("network");
    expect(getOptionalCaptchaToken()).toBeUndefined();
  });

  it("detects captcha API error codes", () => {
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

  it("consumeCaptchaToken clears stored and window tokens", () => {
    setPublicCaptchaToken("token-a");
    consumeCaptchaToken();
    expect(getOptionalCaptchaToken()).toBeUndefined();
  });

  it("requires a fresh token when apply is retried after parse consumed the first token", async () => {
    postMock
      .mockResolvedValueOnce({
        data: {
          status: "success",
          warnings: [],
          fields: {
            fullName: "Jane",
            email: "jane@example.com",
            phoneNumber: "5551234",
            countryCode: "US",
            skills: [],
            experiences: [],
            qualifications: [],
            socialLinks: [],
          },
        },
      })
      .mockRejectedValueOnce(new Error("validation failed"))
      .mockResolvedValueOnce({
        data: {
          user: { id: "u1", name: "Jane", email: "jane@example.com" },
          candidate: { id: "c1", fullName: "Jane" },
          application: { id: "a1", status: "applied" },
        },
      });

    setPublicCaptchaToken("token-parse");
    await parsePublicResume("job-1", makeFile());
    expect(getOptionalCaptchaToken()).toBeUndefined();

    setPublicCaptchaToken("token-parse");
    await expect(
      publicApplyToJob(
        "job-1",
        {
          fullName: "Jane",
          email: "jane@example.com",
          password: "password123",
          phoneNumber: "5551234",
          countryCode: "US",
        },
        makeFile()
      )
    ).rejects.toThrow("validation failed");
    expect(getOptionalCaptchaToken()).toBeUndefined();
    expect(postMock.mock.calls[1]?.[2]?.headers?.["x-captcha-token"]).toBe("token-parse");

    setPublicCaptchaToken("token-apply-retry");
    await publicApplyToJob(
      "job-1",
      {
        fullName: "Jane",
        email: "jane@example.com",
        password: "password123",
        phoneNumber: "5551234",
        countryCode: "US",
      },
      makeFile()
    );

    expect(postMock).toHaveBeenCalledTimes(3);
    expect(postMock.mock.calls[2]?.[2]?.headers?.["x-captcha-token"]).toBe("token-apply-retry");
    expect(getOptionalCaptchaToken()).toBeUndefined();
  });
});
