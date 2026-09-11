import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePublicResumeParse } from "../usePublicResumeParse";

vi.mock("@/shared/lib/api/jobs", () => ({
  parsePublicResume: vi.fn(),
}));

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

import { parsePublicResume } from "@/shared/lib/api/jobs";

function makeFile(name: string, size = 100, lastModified = 1): File {
  return new File(["resume"], name, {
    type: "application/pdf",
    lastModified,
  });
}

describe("usePublicResumeParse", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("applies only the latest selected file when parse responses arrive out of order", async () => {
    const first = makeFile("first.pdf", 100, 1);
    const second = makeFile("second.pdf", 200, 2);

    let resolveFirst: (value: unknown) => void = () => {};
    let resolveSecond: (value: unknown) => void = () => {};

    vi.mocked(parsePublicResume).mockImplementation((_jobId, file) => {
      if (file.name === "first.pdf") {
        return new Promise((resolve) => {
          resolveFirst = resolve;
        }) as ReturnType<typeof parsePublicResume>;
      }
      return new Promise((resolve) => {
        resolveSecond = resolve;
      }) as ReturnType<typeof parsePublicResume>;
    });

    const targets = {
      fullName: "",
      email: "",
      phoneNumber: "",
      countryCode: "US",
      setFullName: vi.fn(),
      setEmail: vi.fn(),
      setPhoneNumber: vi.fn(),
      setCountryCode: vi.fn(),
    };

    const { result } = renderHook(() => usePublicResumeParse("job-1"));

    await act(async () => {
      void result.current.runParse(first, targets);
      void result.current.runParse(second, targets);
    });

    await act(async () => {
      resolveSecond({
        status: "success",
        warnings: [],
        fields: {
          fullName: "Second Candidate",
          email: "second@example.com",
          phoneNumber: "5550002",
          countryCode: "US",
          skills: [],
          experiences: [],
          qualifications: [],
          socialLinks: [],
        },
      });
    });

    await waitFor(() => {
      expect(result.current.parseStatus).toBe("prefill_ready");
    });
    expect(targets.setFullName).toHaveBeenCalledWith("Second Candidate");

    await act(async () => {
      resolveFirst({
        status: "success",
        warnings: [],
        fields: {
          fullName: "First Candidate",
          email: "first@example.com",
          phoneNumber: "5550001",
          countryCode: "US",
          skills: [],
          experiences: [],
          qualifications: [],
          socialLinks: [],
        },
      });
    });

    expect(targets.setFullName).not.toHaveBeenCalledWith("First Candidate");
    expect(result.current.parseStatus).toBe("prefill_ready");
  });

  it("rotates captcha after parse so apply can use a fresh token", async () => {
    const file = makeFile("resume.pdf");
    const onCaptchaTokenConsumed = vi.fn();

    vi.mocked(parsePublicResume).mockResolvedValue({
      status: "success",
      warnings: [],
      fields: {
        fullName: "Jane Candidate",
        email: "jane@example.com",
        phoneNumber: "5550001",
        countryCode: "US",
        skills: [{ name: "React", level: "Advanced" }],
        experiences: [{ company: "Acme", role: "Engineer", currentlyWorking: true }],
        qualifications: [{ degree: "BSc", institute: "State U" }],
        socialLinks: [{ platform: "LinkedIn", url: "https://linkedin.com/in/jane" }],
      },
    });

    const targets = {
      fullName: "",
      email: "",
      phoneNumber: "",
      countryCode: "US",
      setFullName: vi.fn(),
      setEmail: vi.fn(),
      setPhoneNumber: vi.fn(),
      setCountryCode: vi.fn(),
    };

    const { result } = renderHook(() =>
      usePublicResumeParse("job-1", { onCaptchaTokenConsumed })
    );

    await act(async () => {
      await result.current.runParse(file, targets);
    });

    await waitFor(() => {
      expect(result.current.parseStatus).toBe("prefill_ready");
    });
    expect(onCaptchaTokenConsumed).toHaveBeenCalledTimes(1);
    expect(result.current.suggestedExperiences).toHaveLength(1);
    expect(result.current.suggestedQualifications).toHaveLength(1);
    expect(result.current.suggestedSocialLinks).toHaveLength(1);
  });

  it("defaults to manual entry mode and sanitizes submit profile arrays", async () => {
    const { result } = renderHook(() => usePublicResumeParse("job-1"));

    expect(result.current.entryMode).toBe("manual");

    act(() => {
      result.current.setSuggestedExperiences([
        { company: " Acme ", role: " Engineer ", currentlyWorking: false },
        { company: "", role: "Skip me", currentlyWorking: false },
      ]);
      result.current.setSuggestedQualifications([
        { degree: " BSc ", institute: " State U " },
      ]);
      result.current.setSuggestedSocialLinks([
        { platform: " LinkedIn ", url: " https://linkedin.com/in/jane " },
      ]);
    });

    const arrays = result.current.getSubmitProfileArrays();
    expect(arrays.experiences).toEqual([
      {
        company: "Acme",
        role: "Engineer",
        startDate: null,
        endDate: null,
        currentlyWorking: false,
        description: null,
      },
    ]);
    expect(arrays.qualifications[0].degree).toBe("BSc");
    expect(arrays.socialLinks[0].url).toBe("https://linkedin.com/in/jane");
  });

  it("normalizes parsed phone with dial prefix into local digits and country dropdown", async () => {
    const file = makeFile("resume.pdf");

    vi.mocked(parsePublicResume).mockResolvedValue({
      status: "success",
      warnings: [],
      fields: {
        fullName: "Raj Example",
        email: "raj@example.com",
        phoneNumber: "+919876543210",
        countryCode: "IN",
        skills: [],
        experiences: [],
        qualifications: [],
        socialLinks: [],
      },
    });

    const targets = {
      fullName: "",
      email: "",
      phoneNumber: "",
      countryCode: "US",
      setFullName: vi.fn(),
      setEmail: vi.fn(),
      setPhoneNumber: vi.fn(),
      setCountryCode: vi.fn(),
    };

    const { result } = renderHook(() => usePublicResumeParse("job-1"));

    await act(async () => {
      await result.current.runParse(file, targets);
    });

    await waitFor(() => {
      expect(result.current.parseStatus).toBe("prefill_ready");
    });

    expect(targets.setCountryCode).toHaveBeenCalledWith("IN");
    expect(targets.setPhoneNumber).toHaveBeenCalledWith("9876543210");
  });

  it("strips embedded 91 prefix when country is IN and digits-only phone is too long", async () => {
    const file = makeFile("resume.pdf");

    vi.mocked(parsePublicResume).mockResolvedValue({
      status: "success",
      warnings: [],
      fields: {
        fullName: "Raj Example",
        email: "raj@example.com",
        phoneNumber: "919876543210",
        countryCode: "IN",
        skills: [],
        experiences: [],
        qualifications: [],
        socialLinks: [],
      },
    });

    const targets = {
      fullName: "",
      email: "",
      phoneNumber: "",
      countryCode: "US",
      setFullName: vi.fn(),
      setEmail: vi.fn(),
      setPhoneNumber: vi.fn(),
      setCountryCode: vi.fn(),
    };

    const { result } = renderHook(() => usePublicResumeParse("job-1"));

    await act(async () => {
      await result.current.runParse(file, targets);
    });

    await waitFor(() => {
      expect(result.current.parseStatus).toBe("prefill_ready");
    });

    expect(targets.setCountryCode).toHaveBeenCalledWith("IN");
    expect(targets.setPhoneNumber).toHaveBeenCalledWith("9876543210");
  });

  it("clears AI skills in manual mode and omits them from submit payload", async () => {
    const file = makeFile("resume.pdf");
    vi.mocked(parsePublicResume).mockResolvedValue({
      status: "success",
      warnings: [],
      fields: {
        fullName: "Jane Candidate",
        email: "jane@example.com",
        phoneNumber: "5550001",
        countryCode: "US",
        skills: [{ name: "React", level: "Advanced" }],
        experiences: [],
        qualifications: [],
        socialLinks: [],
      },
    });

    const targets = {
      fullName: "",
      email: "",
      phoneNumber: "",
      countryCode: "US",
      setFullName: vi.fn(),
      setEmail: vi.fn(),
      setPhoneNumber: vi.fn(),
      setCountryCode: vi.fn(),
    };

    const { result } = renderHook(() => usePublicResumeParse("job-1"));

    await act(async () => {
      result.current.setEntryMode("ai");
      await result.current.runParse(file, targets);
    });

    await waitFor(() => {
      expect(result.current.suggestedSkills).toHaveLength(1);
    });

    act(() => {
      result.current.setEntryMode("manual");
    });

    expect(result.current.suggestedSkills).toEqual([]);
    expect(result.current.getSubmitSkills()).toEqual([]);
  });
});
