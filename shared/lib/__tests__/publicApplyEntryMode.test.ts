import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { publicApplyToJob } from "@/shared/lib/api/jobs";

function makeFile(name = "resume.pdf"): File {
  return new File(["resume"], name, { type: "application/pdf" });
}

function formDataEntries(formData: FormData): Record<string, string> {
  const entries: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string") entries[key] = value;
  });
  return entries;
}

describe("publicApplyToJob entryMode payload", () => {
  beforeEach(() => {
    postMock.mockReset();
    postMock.mockResolvedValue({
      data: {
        user: { id: "u1", name: "Jane", email: "jane@example.com" },
        candidate: { id: "c1", fullName: "Jane" },
        application: { id: "a1", status: "Applied" },
      },
    });
  });

  it("maps manual entryMode to multipart field", async () => {
    await publicApplyToJob(
      "job-1",
      {
        fullName: "Jane",
        email: "jane@example.com",
        password: "password123",
        phoneNumber: "5551234",
        countryCode: "US",
        entryMode: "manual",
      },
      makeFile()
    );

    const formData = postMock.mock.calls[0]?.[1] as FormData;
    expect(formDataEntries(formData).entryMode).toBe("manual");
  });

  it("maps ai entryMode to multipart field", async () => {
    await publicApplyToJob(
      "job-1",
      {
        fullName: "Jane",
        email: "jane@example.com",
        password: "password123",
        phoneNumber: "5551234",
        countryCode: "US",
        entryMode: "ai",
        skills: [{ name: "React", level: "Advanced" }],
      },
      makeFile()
    );

    const formData = postMock.mock.calls[0]?.[1] as FormData;
    const entries = formDataEntries(formData);
    expect(entries.entryMode).toBe("ai");
    expect(entries.skills).toContain("React");
  });

  it("defaults omitted entryMode to manual", async () => {
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

    const formData = postMock.mock.calls[0]?.[1] as FormData;
    expect(formDataEntries(formData).entryMode).toBe("manual");
  });
});
