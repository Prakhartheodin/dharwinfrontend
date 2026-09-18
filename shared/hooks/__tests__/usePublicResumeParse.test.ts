import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { describeParseEvent, usePublicResumeParse } from "../usePublicResumeParse";

vi.mock("@/shared/lib/api/jobs", () => ({
  parsePublicResume: vi.fn(),
  parsePublicResumeStream: vi.fn(),
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

import { parsePublicResume, parsePublicResumeStream } from "@/shared/lib/api/jobs";

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

  beforeEach(() => {
    // The real parsePublicResumeStream falls back to the buffered call when the backend has no
    // streaming route, so the default here delegates the same way and every existing assertion
    // about parsePublicResume keeps holding. Tests about streaming override this.
    vi.mocked(parsePublicResumeStream).mockImplementation((jobId, file) =>
      (parsePublicResume as unknown as (j: string, f: File) => Promise<never>)(jobId as string, file)
    );
  });

  it("applies only the latest selected file when parse responses arrive out of order", async () => {
    const first = makeFile("first.pdf", 100, 1);
    const second = makeFile("second.pdf", 200, 2);

    // The `as ReturnType<typeof parsePublicResume>` below contextually types each Promise, so its
    // `resolve` takes the parse response — not `unknown`, which strictFunctionTypes rejects.
    type ParseResolve = (value: Awaited<ReturnType<typeof parsePublicResume>>) => void;
    let resolveFirst: ParseResolve = () => {};
    let resolveSecond: ParseResolve = () => {};

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

  it("describeParseEvent narrates each step of the parse", () => {
    expect(describeParseEvent({ type: "stage", stage: "extracting" })).toBe("Reading your resume…");
    expect(describeParseEvent({ type: "stage", stage: "reading" })).toBe("Looking for your details…");
    expect(describeParseEvent({ type: "field", field: "fullName", value: "Harsh" })).toBe(
      "Found your name — filling it in…"
    );
    expect(describeParseEvent({ type: "field", field: "email", value: "a@b.co" })).toBe(
      "Found your email — filling it in…"
    );
    expect(describeParseEvent({ type: "skill", name: "React" })).toBe("Adding skill: React");
    // The tail sections report progress too, so the line does not freeze on the last skill.
    expect(describeParseEvent({ type: "stage", stage: "experiences" })).toBe(
      "Reading your work experience…"
    );
    expect(describeParseEvent({ type: "stage", stage: "qualifications" })).toBe(
      "Reading your education…"
    );
    expect(describeParseEvent({ type: "stage", stage: "socialLinks" })).toBe(
      "Looking for your links…"
    );
    expect(describeParseEvent({ type: "item", section: "experiences", label: "Acme Corp" })).toBe(
      "Added experience: Acme Corp"
    );
    expect(
      describeParseEvent({ type: "item", section: "qualifications", label: "IIT Delhi" })
    ).toBe("Added education: IIT Delhi");
    expect(describeParseEvent({ type: "item", section: "socialLinks", label: "LinkedIn" })).toBe(
      "Added link: LinkedIn"
    );
    // The result carries no narration of its own — the banner switches to its own copy.
    expect(
      describeParseEvent({ type: "result", status: "success", warnings: [], fields: {} } as never)
    ).toBeNull();
  });

  it("reports live activity while the parse streams, and clears it when done", async () => {
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
    const finalPayload = {
      status: "success" as const,
      warnings: [],
      fields: {
        fullName: "Harsh Bansal",
        email: "harsh@example.com",
        phoneNumber: "7742749850",
        countryCode: "IN",
        skills: [{ name: "React", level: "Advanced" }],
        experiences: [],
        qualifications: [],
        socialLinks: [],
      },
    };

    const seen: (string | null)[] = [];
    vi.mocked(parsePublicResumeStream).mockImplementation(async (_jobId, _file, onEvent) => {
      onEvent({ type: "stage", stage: "extracting" });
      onEvent({ type: "field", field: "fullName", value: "Harsh Bansal" });
      onEvent({ type: "skill", name: "React" });
      onEvent({ type: "result", ...finalPayload });
      return finalPayload as never;
    });

    const { result } = renderHook(() => usePublicResumeParse("job-1"));

    await act(async () => {
      result.current.setEntryMode("ai");
      await result.current.runParse(makeFile("stream.pdf"), targets);
    });

    seen.push(result.current.parseActivity);
    await waitFor(() => expect(result.current.parseStatus).toBe("prefill_ready"));

    // Cleared once the parse finishes, so the banner shows its own completion copy.
    expect(result.current.parseActivity).toBeNull();
    expect(result.current.suggestedSkills).toHaveLength(1);
  });

  it("fills each contact field as it streams, not all at once at the end", async () => {
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

    // Held open so the form state can be checked while the parse is still running.
    let finish: (value: unknown) => void = () => {};
    vi.mocked(parsePublicResumeStream).mockImplementation(async (_jobId, _file, onEvent) => {
      onEvent({ type: "field", field: "fullName", value: "Harsh Bansal" });
      onEvent({ type: "field", field: "email", value: "harsh@example.com" });
      onEvent({ type: "field", field: "countryCode", value: "IN" });
      onEvent({ type: "field", field: "phoneNumber", value: "7742749850" });
      return new Promise((resolve) => {
        finish = resolve;
      }) as never;
    });

    const { result } = renderHook(() => usePublicResumeParse("job-1"));

    await act(async () => {
      result.current.setEntryMode("ai");
      void result.current.runParse(makeFile("stream.pdf"), targets);
    });

    // Applied before any result arrived — the whole point of streaming.
    expect(targets.setFullName).toHaveBeenCalledWith("Harsh Bansal");
    expect(targets.setEmail).toHaveBeenCalledWith("harsh@example.com");
    expect(targets.setCountryCode).toHaveBeenCalledWith("IN");
    expect(targets.setPhoneNumber).toHaveBeenCalledWith("7742749850");
    expect(result.current.parseStatus).toBe("parsing");

    // Badges appear with the values; countryCode is a supporting control and claims none.
    await waitFor(() => {
      expect([...result.current.prefilledFields].sort()).toEqual(["email", "fullName", "phoneNumber"]);
    });

    await act(async () => {
      finish({ status: "success", warnings: [], fields: { ...targets, skills: [], experiences: [], qualifications: [], socialLinks: [] } });
    });
  });

  it("leaves a field the user is typing in alone, even mid-stream", async () => {
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

    vi.mocked(parsePublicResumeStream).mockImplementation(async (_jobId, _file, onEvent) => {
      onEvent({ type: "field", field: "fullName", value: "Harsh Bansal" });
      onEvent({ type: "field", field: "email", value: "harsh@example.com" });
      return { status: "success", warnings: [], fields: {} } as never;
    });

    const { result } = renderHook(() => usePublicResumeParse("job-1"));

    act(() => {
      result.current.setEntryMode("ai");
      result.current.markFieldEdited("fullName"); // user started typing their name
    });

    await act(async () => {
      await result.current.runParse(makeFile("stream.pdf"), targets);
    });

    expect(targets.setFullName).not.toHaveBeenCalled();
    expect(targets.setEmail).toHaveBeenCalledWith("harsh@example.com");
  });

  it("collects streamed skill chips, deduped, and drops them once the result lands", async () => {
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
    const finalPayload = {
      status: "success" as const,
      warnings: [],
      fields: {
        fullName: "Harsh Bansal",
        email: "harsh@example.com",
        phoneNumber: "7742749850",
        countryCode: "IN",
        skills: [
          { name: "React", level: "Advanced" },
          { name: "Node.js", level: "Advanced" },
        ],
        experiences: [],
        qualifications: [],
        socialLinks: [],
      },
    };

    // Held open so the chips can be observed mid-parse, before the result replaces them.
    let finish: (value: unknown) => void = () => {};
    vi.mocked(parsePublicResumeStream).mockImplementation(async (_jobId, _file, onEvent) => {
      onEvent({ type: "stage", stage: "reading" });
      onEvent({ type: "skill", name: "React" });
      onEvent({ type: "skill", name: "Node.js" });
      onEvent({ type: "skill", name: "react" }); // same skill, different casing
      return new Promise((resolve) => {
        finish = resolve;
      }) as never;
    });

    const { result } = renderHook(() => usePublicResumeParse("job-1"));

    await act(async () => {
      result.current.setEntryMode("ai");
      void result.current.runParse(makeFile("chips.pdf"), targets);
    });

    // Chips accumulate as each skill is named, and a repeat in another casing is not added twice.
    await waitFor(() => expect(result.current.streamingSkills).toEqual(["React", "Node.js"]));

    await act(async () => {
      finish(finalPayload);
    });

    // A preview only: once the authoritative result lands they give way to suggestedSkills.
    await waitFor(() => expect(result.current.streamingSkills).toEqual([]));
    expect(result.current.suggestedSkills.map((s) => s.name)).toEqual(["React", "Node.js"]);
  });

  /** Parses `first.pdf`, then offers `second.pdf`; returns the hook and the confirm spy. */
  async function parseThenOfferSecondResume(confirmResult: boolean) {
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
    const response = (skill: string) => ({
      status: "success" as const,
      warnings: [],
      fields: {
        fullName: "Jane Candidate",
        email: "jane@example.com",
        phoneNumber: "5550001",
        countryCode: "US",
        skills: [{ name: skill, level: "Advanced" }],
        experiences: [],
        qualifications: [],
        socialLinks: [],
      },
    });
    vi.mocked(parsePublicResume).mockImplementation((_jobId, file) =>
      Promise.resolve(response(file.name === "first.pdf" ? "React" : "Vue")) as ReturnType<
        typeof parsePublicResume
      >
    );

    const confirmReplaceDetails = vi.fn().mockResolvedValue(confirmResult);
    const { result } = renderHook(() =>
      usePublicResumeParse("job-1", { confirmReplaceDetails })
    );

    await act(async () => {
      result.current.setEntryMode("ai");
      await result.current.runParse(makeFile("first.pdf", 100, 1), targets);
    });
    await waitFor(() => expect(result.current.suggestedSkills).toHaveLength(1));

    await act(async () => {
      await result.current.runParse(makeFile("second.pdf", 200, 2), targets);
    });

    return { result, confirmReplaceDetails };
  }

  it("asks before a different resume replaces details, and keeps them when declined", async () => {
    const { result, confirmReplaceDetails } = await parseThenOfferSecondResume(false);

    expect(confirmReplaceDetails).toHaveBeenCalledTimes(1);
    // Declined: the second resume is never sent, and the first resume's details survive.
    expect(vi.mocked(parsePublicResume)).toHaveBeenCalledTimes(1);
    expect(result.current.suggestedSkills.map((s) => s.name)).toEqual(["React"]);
  });

  it("replaces details with the new resume when the swap is confirmed", async () => {
    const { result, confirmReplaceDetails } = await parseThenOfferSecondResume(true);

    expect(confirmReplaceDetails).toHaveBeenCalledTimes(1);
    expect(vi.mocked(parsePublicResume)).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(result.current.suggestedSkills.map((s) => s.name)).toEqual(["Vue"]));
  });

  it("does not ask when the first resume is parsed", async () => {
    const confirmReplaceDetails = vi.fn().mockResolvedValue(true);
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
    } as Awaited<ReturnType<typeof parsePublicResume>>);

    const { result } = renderHook(() => usePublicResumeParse("job-1", { confirmReplaceDetails }));

    await act(async () => {
      result.current.setEntryMode("ai");
      await result.current.runParse(makeFile("only.pdf"), {
        fullName: "",
        email: "",
        phoneNumber: "",
        countryCode: "US",
        setFullName: vi.fn(),
        setEmail: vi.fn(),
        setPhoneNumber: vi.fn(),
        setCountryCode: vi.fn(),
      });
    });

    expect(confirmReplaceDetails).not.toHaveBeenCalled();
  });

  it("defaults to the AI entry mode so the resume path is offered first", () => {
    const { result } = renderHook(() => usePublicResumeParse("job-1"));
    expect(result.current.entryMode).toBe("ai");
  });

  it("omits profile arrays from the submit payload in manual mode", async () => {
    const { result } = renderHook(() => usePublicResumeParse("job-1"));

    act(() => {
      result.current.setEntryMode("manual");
    });

    act(() => {
      result.current.setSuggestedExperiences([
        { company: " Acme ", role: " Engineer ", currentlyWorking: false },
      ]);
      result.current.setSuggestedQualifications([{ degree: " BSc ", institute: " State U " }]);
      result.current.setSuggestedSocialLinks([
        { platform: " LinkedIn ", url: " https://linkedin.com/in/jane " },
      ]);
    });

    expect(result.current.getSubmitProfileArrays()).toEqual({
      experiences: [],
      qualifications: [],
      socialLinks: [],
    });
  });

  it("sanitizes submit profile arrays in AI mode", async () => {
    const { result } = renderHook(() => usePublicResumeParse("job-1"));

    act(() => {
      result.current.setEntryMode("ai");
      result.current.setSuggestedExperiences([
        { company: " Acme ", role: " Engineer ", currentlyWorking: false },
        { company: "", role: "Skip me", currentlyWorking: false },
      ]);
      result.current.setSuggestedQualifications([{ degree: " BSc ", institute: " State U " }]);
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

  it("keeps parsed suggestions when switching to manual but omits them from the submit payload", async () => {
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
      result.current.setSuggestedExperiences([{ company: "Acme", role: "Dev", currentlyWorking: true }]);
      result.current.setEntryMode("manual");
    });

    // Retained, not discarded: wiping these on a mode switch destroyed the user's parsed resume
    // data with no warning and no undo. Switching back to AI must show them again.
    expect(result.current.suggestedSkills).toHaveLength(1);
    expect(result.current.suggestedExperiences).toHaveLength(1);
    // What actually matters is that manual mode submits none of it.
    expect(result.current.getSubmitSkills()).toEqual([]);
    expect(result.current.getSubmitProfileArrays()).toEqual({
      experiences: [],
      qualifications: [],
      socialLinks: [],
    });
  });
});
