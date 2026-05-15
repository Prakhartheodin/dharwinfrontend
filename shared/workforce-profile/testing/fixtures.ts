import type { WorkforceFormState } from "../types/workforce.types";
import { emptyWorkforceFormState } from "../services/schema";

export function makeFormState(
  overrides: Partial<WorkforceFormState> = {},
): WorkforceFormState {
  const base = emptyWorkforceFormState();
  return {
    ...base,
    ...overrides,
    personalInfo: { ...base.personalInfo, ...(overrides.personalInfo ?? {}) },
    qualification: { ...base.qualification, ...(overrides.qualification ?? {}) },
    experience: { ...base.experience, ...(overrides.experience ?? {}) },
    documents: { ...base.documents, ...(overrides.documents ?? {}) },
    salary: { ...base.salary, ...(overrides.salary ?? {}) },
  };
}

export const sampleApiCandidate = {
  _id: "cand-1",
  fullName: "Test User",
  email: "test@example.com",
  phoneNumber: "+91 90000 00000",
  countryCode: "IN",
  designation: "Engineer",
  shortBio: "Bio",
  visaType: "H1B",
  qualifications: [
    {
      degree: "B.Tech",
      institute: "IIT",
      location: "Delhi",
      startYear: 2018,
      endYear: 2022,
    },
  ],
  skills: [{ name: "TypeScript", level: "Advanced" }],
  experiences: [
    {
      company: "Acme",
      role: "Eng",
      startDate: "2022-06-01",
      endDate: "",
      currentlyWorking: true,
    },
  ],
  documents: [
    {
      type: "resume",
      label: "Resume.pdf",
      url: "https://cdn.example.com/r.pdf",
      key: "uploads/r.pdf",
      originalName: "Resume.pdf",
      size: 1234,
      mimeType: "application/pdf",
    },
  ],
  socialLinks: [{ platform: "linkedin", url: "https://linkedin.com/in/test" }],
  address: {
    streetAddress: "1 Main",
    streetAddress2: "",
    city: "Bengaluru",
    state: "KA",
    zipCode: "560001",
    country: "IN",
  },
};
