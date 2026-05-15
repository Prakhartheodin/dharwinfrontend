import { describe, expect, it } from "vitest";
import { mapToFormState } from "../services/mapper";
import { sampleApiCandidate } from "./fixtures";

describe("mapper.mapToFormState", () => {
  it("returns empty form state when source is null", () => {
    const state = mapToFormState(null);
    expect(state.personalInfo.fullName).toBe("");
    expect(state.qualification.educations).toEqual([]);
    expect(state.experience.experiences).toEqual([]);
    expect(state.documents.documents).toEqual([]);
  });

  it("maps personal info fields", () => {
    const state = mapToFormState(sampleApiCandidate as never);
    expect(state.personalInfo.fullName).toBe("Test User");
    expect(state.personalInfo.email).toBe("test@example.com");
    expect(state.personalInfo.designation).toBe("Engineer");
    expect(state.personalInfo.countryCode).toBe("IN");
    expect(state.personalInfo.address.city).toBe("Bengaluru");
  });

  it("assigns synthetic ids to nested rows", () => {
    const state = mapToFormState(sampleApiCandidate as never);
    expect(state.qualification.educations).toHaveLength(1);
    expect(state.qualification.educations[0].id).toMatch(/^wf-/);
    expect(state.experience.experiences[0].id).toMatch(/^wf-/);
    expect(state.qualification.skills[0].id).toMatch(/^wf-/);
  });

  it("preserves currentlyWorking flag", () => {
    const state = mapToFormState(sampleApiCandidate as never);
    expect(state.experience.experiences[0].currentlyWorking).toBe(true);
  });

  it("marks documents as uploaded with metadata", () => {
    const state = mapToFormState(sampleApiCandidate as never);
    expect(state.documents.documents).toHaveLength(1);
    const doc = state.documents.documents[0];
    expect(doc.status).toBe("uploaded");
    expect(doc.metadata?.url).toBe("https://cdn.example.com/r.pdf");
    expect(doc.metadata?.size).toBe(1234);
  });

  it("coerces numeric years to strings", () => {
    const state = mapToFormState(sampleApiCandidate as never);
    expect(state.qualification.educations[0].startYear).toBe("2018");
    expect(state.qualification.educations[0].endYear).toBe("2022");
  });
});
