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
    expect(payload).not.toHaveProperty("sevisId");
    expect(payload).not.toHaveProperty("visaType");
    expect(payload).not.toHaveProperty("supervisorName");
    expect(payload).not.toHaveProperty("salaryRange");
  });

  it("sends own immigration fields but omits HR-owned compensation from self-service payload", () => {
    const state = makeFormState({
      personalInfo: {
        ...makeFormState().personalInfo,
        sevisId: "N123",
        ead: "EAD-1",
        visaType: "H-1B",
        customVisaType: "",
        supervisorName: "Jane Doe",
        supervisorContact: "5551234567",
        supervisorCountryCode: "US",
        salaryRange: "$50,000 - $70,000",
      },
    });
    const payload = toSelfServicePayload(normalize(state), {
      "personal-info": true,
    }) as Record<string, unknown>;
    expect(payload.sevisId).toBe("N123");
    expect(payload.visaType).toBe("H-1B");
    // Legacy free-text EAD and an empty custom type stay out: "" would null-clear.
    expect(payload).not.toHaveProperty("ead");
    expect(payload).not.toHaveProperty("customVisaType");
    expect(payload).not.toHaveProperty("supervisorName");
    expect(payload).not.toHaveProperty("supervisorContact");
    expect(payload).not.toHaveProperty("supervisorCountryCode");
    expect(payload).not.toHaveProperty("salaryRange");
  });
});

// The PATCH /auth/me/with-candidate Joi schema rejects "" on these keys
// ("... is not allowed to be empty" / "must be a valid date") -> 400.
// The normalizer emits "" for every absent string, so they must be dropped here,
// exactly like toCandidatePayload already does for the admin route.
describe("payload.toSelfServicePayload — backend Joi contract", () => {
  it("drops empty address subfields", () => {
    const payload = toSelfServicePayload(normalize(makeFormState()), {
      "personal-info": true,
    }) as Record<string, unknown>;
    const address = payload.address as Record<string, unknown> | undefined;
    expect(Object.values(address ?? {})).not.toContain("");
  });

  it("drops empty experience dates", () => {
    const payload = toSelfServicePayload(normalize(baseState()), {
      "work-experience": true,
    }) as Record<string, unknown>;
    const exp = (payload.experiences as Record<string, unknown>[])[0];
    expect(exp).not.toHaveProperty("endDate");
    expect(exp.currentlyWorking).toBe(true);
  });

  it("keeps filled experience startDate through self-service payload", () => {
    const payload = toSelfServicePayload(normalize(baseState()), {
      "work-experience": true,
    }) as Record<string, unknown>;
    const exp = (payload.experiences as Record<string, unknown>[])[0];
    expect(exp.startDate).toBe("2020-01-01");
  });

  it("keeps filled experience dates when not currently working", () => {
    const state = makeFormState({
      experience: {
        experiences: [
          {
            id: "x",
            company: "Acme",
            role: "Eng",
            startDate: "2020-01-01",
            endDate: "2021-06-30",
            currentlyWorking: false,
            description: "",
          },
        ],
      },
    });
    const payload = toSelfServicePayload(normalize(state), {
      "work-experience": true,
    }) as Record<string, unknown>;
    const exp = (payload.experiences as Record<string, unknown>[])[0];
    expect(exp.startDate).toBe("2020-01-01");
    expect(exp.endDate).toBe("2021-06-30");
  });

  it("drops an empty salary slip month", () => {
    const state = makeFormState({
      salary: {
        salarySlips: [
          {
            id: "s1",
            month: "",
            year: "2024",
            resource: {
              tempId: "t1",
              status: "uploaded",
              progress: 100,
              label: "Slip",
              retryCount: 0,
              metadata: {
                url: "https://cdn.example.com/s.pdf",
                key: "uploads/s.pdf",
                originalName: "s.pdf",
                size: 10,
                mimeType: "application/pdf",
              },
            },
          },
        ],
      },
    });
    const payload = toSelfServicePayload(normalize(state), {
      salary: true,
    }) as Record<string, unknown>;
    expect((payload.salarySlips as Record<string, unknown>[])[0]).not.toHaveProperty("month");
  });

  // profilePicture.url is validated with Joi .uri(). A stored relative path is
  // server-origin data, so echoing it back is a no-op -> drop it, don't 400.
  it("drops a profile picture whose url is not absolute", () => {
    const state = makeFormState({
      personalInfo: {
        ...makeFormState().personalInfo,
        profilePicture: {
          url: "/uploads/pic.png",
          key: "uploads/pic.png",
          originalName: "pic.png",
          size: 10,
          mimeType: "image/png",
        },
      },
    });
    const payload = toSelfServicePayload(normalize(state), {
      "personal-info": true,
    }) as Record<string, unknown>;
    expect(payload).not.toHaveProperty("profilePicture");
  });

  it("keeps a profile picture with an absolute url", () => {
    const state = makeFormState({
      personalInfo: {
        ...makeFormState().personalInfo,
        profilePicture: {
          url: "https://cdn.example.com/pic.png",
          key: "uploads/pic.png",
          originalName: "pic.png",
          size: 10,
          mimeType: "image/png",
        },
      },
    });
    const payload = toSelfServicePayload(normalize(state), {
      "personal-info": true,
    }) as Record<string, unknown>;
    expect(payload).toHaveProperty("profilePicture");
  });

  // POST /upload/single echoes `label` in its response, but profilePicture on
  // PATCH /auth/me/with-candidate only allows url/key/originalName/size/mimeType.
  it("strips label from profile picture upload metadata", () => {
    const state = makeFormState({
      personalInfo: {
        ...makeFormState().personalInfo,
        profilePicture: {
          url: "https://cdn.example.com/pic.png",
          key: "uploads/pic.png",
          originalName: "pic.png",
          size: 10,
          mimeType: "image/png",
          label: "pic.png",
        } as NonNullable<
          ReturnType<typeof makeFormState>["personalInfo"]["profilePicture"]
        > & { label: string },
      },
    });
    const payload = toSelfServicePayload(normalize(state), {
      "personal-info": true,
    }) as Record<string, unknown>;
    const pic = payload.profilePicture as Record<string, unknown>;
    expect(pic.url).toBe("https://cdn.example.com/pic.png");
    expect(pic).not.toHaveProperty("label");
  });

  it("drops an empty document label", () => {
    const state = makeFormState({
      documents: {
        documents: [
          {
            tempId: "d1",
            status: "uploaded",
            progress: 100,
            label: "",
            type: "CV/Resume",
            retryCount: 0,
            metadata: {
              url: "https://cdn.example.com/r.pdf",
              key: "uploads/r.pdf",
              originalName: "r.pdf",
              size: 10,
              mimeType: "application/pdf",
            },
          },
        ],
      },
    });
    const payload = toSelfServicePayload(normalize(state), {
      documents: true,
    }) as Record<string, unknown>;
    expect((payload.documents as Record<string, unknown>[])[0]).not.toHaveProperty("label");
  });
});
