export type DocumentPreviewMode = "inline-pdf" | "open-external";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export function isPdfDocument(fileName: string, mimeType?: string | null): boolean {
  const mime = (mimeType || "").trim().toLowerCase();
  if (mime === "application/pdf") return true;
  return fileName.trim().toLowerCase().endsWith(".pdf");
}

export function isDocxDocument(fileName: string, mimeType?: string | null): boolean {
  const mime = (mimeType || "").trim().toLowerCase();
  if (mime === DOCX_MIME) return true;
  return fileName.trim().toLowerCase().endsWith(".docx");
}

/** PDFs can be shown in an iframe; Word resumes open or download in a new tab. */
export function resolveDocumentPreviewMode(fileName: string, mimeType?: string | null): DocumentPreviewMode {
  if (isPdfDocument(fileName, mimeType)) return "inline-pdf";
  return "open-external";
}

export function pdfViewerSrc(url: string): string {
  const hash = "toolbar=1&navpanes=0";
  return url.includes("#") ? url : `${url}#${hash}`;
}
