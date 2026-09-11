import { describe, expect, it } from "vitest";
import {
  isPublicResumeFile,
  PUBLIC_RESUME_ACCEPT,
  PUBLIC_RESUME_FORMAT_MESSAGE,
} from "../publicApplyResume";

describe("publicApplyResume", () => {
  it("accepts only pdf and docx hints", () => {
    expect(PUBLIC_RESUME_ACCEPT).toBe(".pdf,.docx");
  });

  it("isPublicResumeFile accepts pdf and docx", () => {
    expect(isPublicResumeFile(new File(["x"], "cv.pdf", { type: "application/pdf" }))).toBe(true);
    expect(
      isPublicResumeFile(
        new File(["x"], "cv.docx", {
          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        })
      )
    ).toBe(true);
    expect(isPublicResumeFile(new File(["x"], "legacy.doc", { type: "application/msword" }))).toBe(false);
  });

  it("documents pdf/docx-only user-facing copy", () => {
    expect(PUBLIC_RESUME_FORMAT_MESSAGE).toMatch(/PDF or DOCX/i);
    expect(PUBLIC_RESUME_FORMAT_MESSAGE).toMatch(/\.doc/i);
  });
});
