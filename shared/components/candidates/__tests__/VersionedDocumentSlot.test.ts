import { describe, expect, it } from "vitest";
import {
  candidateDocumentProfileDisplayName,
  isDocumentVersionAlreadyCurrent,
} from "../VersionedDocumentSlot";

describe("candidateDocumentProfileDisplayName", () => {
  it("prefers originalName over generic CV/Resume label", () => {
    expect(
      candidateDocumentProfileDisplayName({
        type: "CV/Resume",
        label: "CV/Resume",
        originalName: "Jane_Doe_Resume_2026.pdf",
        logicalSlot: "resume",
      })
    ).toBe("Jane_Doe_Resume_2026.pdf");
  });

  it("falls back to slot title when only generic labels exist", () => {
    expect(
      candidateDocumentProfileDisplayName({
        type: "CV/Resume",
        label: "CV/Resume",
        logicalSlot: "resume",
      })
    ).toBe("Resume / CV");
  });

  it("treats matching version number as already current", () => {
    expect(isDocumentVersionAlreadyCurrent(3, 3, "k-a", "k-b")).toBe(true);
  });

  it("treats matching S3 key as already current", () => {
    expect(isDocumentVersionAlreadyCurrent(5, 2, "uploads/same.pdf", "uploads/same.pdf")).toBe(true);
  });

  it("allows restore when version and key differ", () => {
    expect(isDocumentVersionAlreadyCurrent(5, 2, "uploads/a.pdf", "uploads/b.pdf")).toBe(false);
  });

  it("uses custom label for non-versioned documents", () => {
    expect(
      candidateDocumentProfileDisplayName({
        type: "Other",
        label: "Passport",
      })
    ).toBe("Passport");
  });
});
