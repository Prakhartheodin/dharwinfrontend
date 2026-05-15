import { describe, expect, it } from "vitest";
import { toCandidatePayload, toSelfServicePayload } from "../services/payload";
import { normalize } from "../services/normalizer";
import { makeFormState } from "./fixtures";

const baseState = () =>
  makeFormState({
    personalInfo: {
      ...makeFormState().personalInfo,
      fullName: "Alice",
      email: "a@b.co",
      phoneNumber: "+91 99999",
      designation: "Eng",
      visaType: "H1B",
      address: {
        streetAddress: "1",
        streetAddress2: "",
        city: "C",
        state: "S",
        zipCode: "Z",
        country: "IN",
      },
    },
    qualification: {
      educations: [
        {
          id: "1",
          degree: "B.Tech",
          institute: "IIT",
          location: "",
          startYear: "2018",
          endYear: "2022",
          description: "",
        },
      ],
      skills: [{ id: "s", name: "TS", level: "Advanced" }],
    },
    experience: {
      experiences: [
        {
          id: "x",
          company: "Acme",
          role: "Eng",
          startDate: "2020-01-01",
          endDate: "",
          currentlyWorking: true,
          description: "",
        },
      ],
    },
  });

describe("payload.toCandidatePayload (admin)", () => {
  it("converts year strings to numbers", () => {
    const payload = toCandidatePayload(normalize(baseState()));
    const q = payload.qualifications?.[0] as { startYear?: number; endYear?: number };
    expect(q?.startYear).toBe(2018);
    expect(q?.endYear).toBe(2022);
  });

  it("preserves currentlyWorking with empty endDate", () => {
    const payload = toCandidatePayload(normalize(baseState()));
    expect(payload.experiences?.[0].currentlyWorking).toBe(true);
  });

  it("omits absent optional fields", () => {
    const empty = makeFormState();
    const payload = toCandidatePayload(normalize(empty));
    expect(payload).not.toHaveProperty("password");
    expect(payload).not.toHaveProperty("visaType");
  });
});

describe("payload.toSelfServicePayload (PATCH)", () => {
  it("includes only dirty sections when dirty map is provided", () => {
    const payload = toSelfServicePayload(normalize(baseState()), {
      "personal-info": true,
    });
    expect(payload).toHaveProperty("fullName");
    expect(payload).not.toHaveProperty("qualifications");
    expect(payload).not.toHaveProperty("experiences");
    expect(payload).not.toHaveProperty("documents");
  });

  it("emits full payload when dirty map is undefined", () => {
    const payload = toSelfServicePayload(normalize(baseState()));
    expect(payload).toHaveProperty("fullName");
    expect(payload).toHaveProperty("qualifications");
    expect(payload).toHaveProperty("experiences");
  });

  it("nullifies cleared optional strings", () => {
    const payload = toSelfServicePayload(normalize(makeFormState()), {
      "personal-info": true,
    }) as Record<string, unknown>;
    expect(payload.shortBio).toBeNull();
    expect(payload.degree).toBeNull();
    expect(payload.sevisId).toBeNull();
  });
});
