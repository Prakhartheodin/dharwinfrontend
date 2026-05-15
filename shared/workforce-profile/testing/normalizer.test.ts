import { describe, expect, it } from "vitest";
import { normalize } from "../services/normalizer";
import { makeFormState } from "./fixtures";

describe("normalizer.normalize", () => {
  it("trims string fields", () => {
    const state = makeFormState({
      personalInfo: {
        ...makeFormState().personalInfo,
        fullName: "  Alice  ",
        email: "  a@b.co  ",
      },
    });
    const n = normalize(state);
    expect(n.fullName).toBe("Alice");
    expect(n.email).toBe("a@b.co");
  });

  it("drops empty education rows", () => {
    const state = makeFormState({
      qualification: {
        educations: [
          {
            id: "1",
            degree: "B.Tech",
            institute: "IIT",
            location: "",
            startYear: "",
            endYear: "",
            description: "",
          },
          {
            id: "2",
            degree: "",
            institute: "",
            location: "",
            startYear: "",
            endYear: "",
            description: "",
          },
        ],
        skills: [],
      },
    });
    const n = normalize(state);
    expect(n.qualifications).toHaveLength(1);
    expect(n.qualifications[0].degree).toBe("B.Tech");
  });

  it("clears endDate when currentlyWorking is true", () => {
    const state = makeFormState({
      experience: {
        experiences: [
          {
            id: "1",
            company: "Acme",
            role: "Eng",
            startDate: "2020-01-01",
            endDate: "2022-01-01",
            currentlyWorking: true,
            description: "",
          },
        ],
      },
    });
    const n = normalize(state);
    expect(n.experiences[0].endDate).toBe("");
    expect(n.experiences[0].currentlyWorking).toBe(true);
  });

  it("only normalizes uploaded documents", () => {
    const state = makeFormState({
      documents: {
        documents: [
          {
            tempId: "ok",
            status: "uploaded",
            progress: 1,
            label: "ok.pdf",
            retryCount: 0,
            metadata: {
              url: "u",
              key: "k",
              originalName: "ok.pdf",
              size: 10,
              mimeType: "application/pdf",
            },
          },
          {
            tempId: "fail",
            status: "failed",
            progress: 0,
            label: "fail",
            retryCount: 1,
          },
        ],
      },
    });
    const n = normalize(state);
    expect(n.documents).toHaveLength(1);
    expect(n.documents[0].url).toBe("u");
  });

  it("filters social links missing platform or url", () => {
    const state = makeFormState({
      personalInfo: {
        ...makeFormState().personalInfo,
        socialLinks: [
          { id: 1, platform: "linkedin", url: "https://x" },
          { id: 2, platform: "", url: "https://y" },
          { id: 3, platform: "twitter", url: "" },
        ],
      },
    });
    const n = normalize(state);
    expect(n.socialLinks).toEqual([
      { platform: "linkedin", url: "https://x" },
    ]);
  });
});
