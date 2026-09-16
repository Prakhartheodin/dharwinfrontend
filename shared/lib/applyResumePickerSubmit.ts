export type BrowseApplyResumeSelectionMode = "version" | "upload";

export type BrowseApplyResumeVersionRef = { version: number };

/** Whether logged-in browse apply can submit (mirrors ApplyResumePickerOverlay). */
export function canSubmitBrowseJobApplyResume(params: {
  selectionMode: BrowseApplyResumeSelectionMode;
  selectedVersion: number | null;
  versions: BrowseApplyResumeVersionRef[];
  resumeFile: File | null;
  candidateId?: string | null;
  uploadingResume?: boolean;
}): boolean {
  const { selectionMode, selectedVersion, versions, resumeFile, candidateId, uploadingResume } = params;
  if (uploadingResume) return false;
  if (resumeFile && candidateId) {
    return false;
  }
  if (selectionMode === "upload") {
    return Boolean(resumeFile);
  }
  return selectedVersion != null && versions.some((v) => v.version === selectedVersion);
}
