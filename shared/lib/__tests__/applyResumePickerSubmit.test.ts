import { describe, expect, it } from "vitest";
import { canSubmitBrowseJobApplyResume } from "../applyResumePickerSubmit";

describe("canSubmitBrowseJobApplyResume", () => {
  const versions = [{ version: 1 }, { version: 2 }];

  it("allows submit when a saved version is selected", () => {
    expect(
      canSubmitBrowseJobApplyResume({
        selectionMode: "version",
        selectedVersion: 2,
        versions,
        resumeFile: null,
      })
    ).toBe(true);
  });

  it("blocks submit when version mode has no file and no valid selection", () => {
    expect(
      canSubmitBrowseJobApplyResume({
        selectionMode: "version",
        selectedVersion: null,
        versions,
        resumeFile: null,
      })
    ).toBe(false);
    expect(
      canSubmitBrowseJobApplyResume({
        selectionMode: "version",
        selectedVersion: 99,
        versions,
        resumeFile: null,
      })
    ).toBe(false);
  });

  it("requires upload when in upload mode without a linked profile", () => {
    const file = new File(["x"], "cv.pdf", { type: "application/pdf" });
    expect(
      canSubmitBrowseJobApplyResume({
        selectionMode: "upload",
        selectedVersion: 1,
        versions,
        resumeFile: null,
      })
    ).toBe(false);
    expect(
      canSubmitBrowseJobApplyResume({
        selectionMode: "upload",
        selectedVersion: null,
        versions,
        resumeFile: file,
      })
    ).toBe(true);
  });

  it("blocks submit while a staged file awaits upload for a linked profile", () => {
    const file = new File(["x"], "cv.pdf", { type: "application/pdf" });
    expect(
      canSubmitBrowseJobApplyResume({
        selectionMode: "upload",
        selectedVersion: null,
        versions,
        resumeFile: file,
        candidateId: "507f1f77bcf86cd799439011",
      })
    ).toBe(false);
    expect(
      canSubmitBrowseJobApplyResume({
        selectionMode: "version",
        selectedVersion: 2,
        versions,
        resumeFile: file,
        candidateId: "507f1f77bcf86cd799439011",
      })
    ).toBe(false);
  });

  it("blocks submit while resume upload is in progress", () => {
    expect(
      canSubmitBrowseJobApplyResume({
        selectionMode: "version",
        selectedVersion: 2,
        versions,
        resumeFile: null,
        uploadingResume: true,
      })
    ).toBe(false);
  });
});
