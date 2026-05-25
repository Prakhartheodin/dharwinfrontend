/** Candidate/employee fields that can describe job title across HRMS + profile forms. */
export type EmployeeJobTitleSource = {
  designation?: string | null;
  referralJobTitle?: string | null;
  position?: string | { id?: string; _id?: string; name?: string } | null;
};

/** Resolve a single job title string from position ref, designation, or referral role. */
export function resolveEmployeeJobTitle(source: EmployeeJobTitleSource | null | undefined): string {
  const pos = source?.position;
  if (pos != null) {
    if (typeof pos === "object" && pos !== null) {
      const name = String((pos as { name?: string }).name ?? "").trim();
      if (name) return name;
    }
    if (typeof pos === "string") {
      const trimmed = pos.trim();
      if (trimmed && !/^[a-f0-9]{24}$/i.test(trimmed)) return trimmed;
    }
  }

  const designation = String(source?.designation ?? "").trim();
  if (designation) return designation;

  const referralJobTitle = String(source?.referralJobTitle ?? "").trim();
  if (referralJobTitle) return referralJobTitle;

  return "";
}

export function resolveEmployeeJobTitleLabel(source: EmployeeJobTitleSource | null | undefined): string {
  return resolveEmployeeJobTitle(source) || "Not assigned";
}
