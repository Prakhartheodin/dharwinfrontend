import { describe, expect, it } from "vitest";
import {
  isDocxDocument,
  isPdfDocument,
  pdfViewerSrc,
  resolveDocumentPreviewMode,
} from "../documentVersionPreview";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

describe("documentVersionPreview", () => {
  it("detects PDF by mime or extension", () => {
    expect(isPdfDocument("resume.PDF", null)).toBe(true);
    expect(isPdfDocument("cv.pdf", "application/pdf")).toBe(true);
    expect(isPdfDocument("cv.docx", DOCX_MIME)).toBe(false);
  });

  it("detects DOCX by mime or extension", () => {
    expect(isDocxDocument("cv.docx", null)).toBe(true);
    expect(isDocxDocument("x", DOCX_MIME)).toBe(true);
    expect(isDocxDocument("cv.pdf", "application/pdf")).toBe(false);
  });

  it("resolves preview mode", () => {
    expect(resolveDocumentPreviewMode("a.pdf", null)).toBe("inline-pdf");
    expect(resolveDocumentPreviewMode("a.docx", null)).toBe("open-external");
  });

  it("appends pdf viewer hash when missing", () => {
    expect(pdfViewerSrc("https://example.com/file.pdf")).toContain("#toolbar=1");
    expect(pdfViewerSrc("https://example.com/file.pdf#zoom=50")).toBe("https://example.com/file.pdf#zoom=50");
  });
});
