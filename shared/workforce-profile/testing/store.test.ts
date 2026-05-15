import { describe, expect, it, beforeEach } from "vitest";
import { useWorkforceStore } from "../state/workforce.store";
import { emptyWorkforceFormState } from "../services/schema";

describe("workforce.store", () => {
  beforeEach(() => {
    useWorkforceStore.getState().hydrate(emptyWorkforceFormState());
  });

  it("hydrates state and seeds snapshot", () => {
    const next = emptyWorkforceFormState();
    next.personalInfo.fullName = "Hydrated";
    useWorkforceStore.getState().hydrate(next);
    expect(useWorkforceStore.getState().personalInfo.fullName).toBe("Hydrated");
    expect(useWorkforceStore.getState().snapshot.personalInfo.fullName).toBe(
      "Hydrated",
    );
  });

  it("setPersonalInfo mutates without touching snapshot", () => {
    useWorkforceStore.getState().setPersonalInfo({ fullName: "X" });
    expect(useWorkforceStore.getState().personalInfo.fullName).toBe("X");
    expect(useWorkforceStore.getState().snapshot.personalInfo.fullName).toBe("");
  });

  it("reset restores snapshot values", () => {
    useWorkforceStore.getState().setPersonalInfo({ fullName: "X" });
    useWorkforceStore.getState().reset();
    expect(useWorkforceStore.getState().personalInfo.fullName).toBe("");
  });

  it("commitSnapshot freezes current state as new baseline", () => {
    useWorkforceStore.getState().setPersonalInfo({ fullName: "Saved" });
    useWorkforceStore.getState().commitSnapshot();
    useWorkforceStore.getState().setPersonalInfo({ fullName: "Edited" });
    useWorkforceStore.getState().reset();
    expect(useWorkforceStore.getState().personalInfo.fullName).toBe("Saved");
  });

  it("addEducation appends to qualification slice", () => {
    useWorkforceStore.getState().addEducation({
      id: "1",
      degree: "B",
      institute: "I",
      location: "",
      startYear: "",
      endYear: "",
      description: "",
    });
    expect(useWorkforceStore.getState().qualification.educations).toHaveLength(1);
  });

  it("removeEducation removes the matching row", () => {
    useWorkforceStore.getState().addEducation({
      id: "1",
      degree: "B",
      institute: "I",
      location: "",
      startYear: "",
      endYear: "",
      description: "",
    });
    useWorkforceStore.getState().removeEducation("1");
    expect(useWorkforceStore.getState().qualification.educations).toHaveLength(0);
  });
});
