import { describe, expect, it } from "vitest";
import {
  getGenericDocumentTypeGroups,
  getReservedVersionedDocumentLabelError,
  isReservedVersionedDocumentLabel,
  resolveGenericDocumentUploadLabel,
} from "../documentUploadUx";

describe("getGenericDocumentTypeGroups", () => {
  it("includes CV/Resume when versioned slots are not active", () => {
    const groups = getGenericDocumentTypeGroups(false);
    const application = groups.find((g) => g.label === "Application");
    expect(application?.options).toContain("CV/Resume");
  });

  it("omits CV/Resume when versioned slots are active", () => {
    const groups = getGenericDocumentTypeGroups(true);
    const application = groups.find((g) => g.label === "Application");
    expect(application?.options).not.toContain("CV/Resume");
    expect(application?.options).toContain("Marksheet");
  });
});

describe("reserved versioned document labels", () => {
  const reserved = ["resume", " CV ", "cv/resume", "Cover Letter", "cover-letter", "coverletter"];

  it.each(reserved)("treats %s as reserved", (label) => {
    expect(isReservedVersionedDocumentLabel(label)).toBe(true);
  });

  it("allows non-reserved labels", () => {
    expect(isReservedVersionedDocumentLabel("Passport")).toBe(false);
    expect(isReservedVersionedDocumentLabel("Experience Letter")).toBe(false);
  });

  it("returns null when versioned slots are inactive", () => {
    expect(getReservedVersionedDocumentLabelError("Resume", false)).toBeNull();
  });

  it("returns an error when versioned slots are active and label is reserved", () => {
    expect(getReservedVersionedDocumentLabelError("Resume", true)).toMatch(/Resume \/ CV and Cover Letter cards/i);
  });

  it("resolves Other custom names for validation", () => {
    const label = resolveGenericDocumentUploadLabel("Other", "Cover Letter");
    expect(getReservedVersionedDocumentLabelError(label, true)).not.toBeNull();
  });
});
