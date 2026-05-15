import type { CandidateListItem } from "@/shared/lib/api/employees";
import type { UpdateMeWithCandidatePayload } from "@/shared/lib/api/auth";
import type { NormalizedWorkforce } from "../types/workforce.types";
import type { StepId } from "../types/wizard.types";

export type DirtyMap = Partial<Record<StepId, boolean>>;

const yr = (s: string): number | undefined => {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Admin create/update payload — `Partial<CandidateListItem>` shape. */
export function toCandidatePayload(
  n: NormalizedWorkforce,
): Partial<CandidateListItem> {
  return {
    fullName: n.fullName,
    email: n.email,
    phoneNumber: n.phoneNumber,
    profilePicture: n.profilePicture,
    skills: n.skills.map(({ name, level, category }) => ({ name, level, category })),
    qualifications: n.qualifications.map((q) => ({
      degree: q.degree,
      institute: q.institute,
      ...(q.location ? { location: q.location } : {}),
      ...(yr(q.startYear) ? { startYear: yr(q.startYear) } : {}),
      ...(yr(q.endYear) ? { endYear: yr(q.endYear) } : {}),
      ...(q.description ? { description: q.description } : {}),
    })) as CandidateListItem["qualifications"],
    experiences: n.experiences.map((x) => ({
      company: x.company,
      role: x.role,
      ...(x.startDate ? { startDate: x.startDate } : {}),
      ...(x.endDate ? { endDate: x.endDate } : {}),
      currentlyWorking: x.currentlyWorking,
    })) as CandidateListItem["experiences"],
    documents: n.documents,
    socialLinks: n.socialLinks,
    designation: n.designation || null,
    companyAssignedEmail: n.companyAssignedEmail,
    companyEmailProvider: n.companyEmailProvider,
    ...(n.address ? { address: n.address } : {}),
    ...(n.shortBio ? { shortBio: n.shortBio } : {}),
    ...(n.password ? { password: n.password } : {}),
    ...(n.degree ? { degree: n.degree } : {}),
    ...(n.sevisId ? { sevisId: n.sevisId } : {}),
    ...(n.ead ? { ead: n.ead } : {}),
    ...(n.visaType ? { visaType: n.visaType } : {}),
    ...(n.customVisaType ? { customVisaType: n.customVisaType } : {}),
    ...(n.supervisorName ? { supervisorName: n.supervisorName } : {}),
    ...(n.supervisorContact ? { supervisorContact: n.supervisorContact } : {}),
    ...(n.supervisorCountryCode
      ? { supervisorCountryCode: n.supervisorCountryCode }
      : {}),
    ...(n.salaryRange ? { salaryRange: n.salaryRange } : {}),
    ...(n.countryCode ? { countryCode: n.countryCode } : {}),
    salarySlips: n.salarySlips,
  } as Partial<CandidateListItem>;
}

/**
 * Self-service payload for `PATCH /auth/me/with-candidate`.
 * Honors `dirty` map: only sections marked dirty are included (section-level PATCH).
 * If `dirty` is undefined, the full payload is emitted.
 */
export function toSelfServicePayload(
  n: NormalizedWorkforce,
  dirty?: DirtyMap,
): UpdateMeWithCandidatePayload {
  const include = (section: StepId) =>
    dirty === undefined ? true : !!dirty[section];

  const out: Record<string, unknown> = {};

  if (include("personal-info")) {
    if (n.fullName) {
      // Mirror onto User.name so the display name stays in sync with the
      // candidate profile — the legacy settings save did this explicitly.
      out.name = n.fullName;
      out.fullName = n.fullName;
    }
    if (n.phoneNumber) out.phoneNumber = n.phoneNumber;
    if (n.countryCode) out.countryCode = n.countryCode;
    out.shortBio = n.shortBio || null;
    out.degree = n.degree || null;
    if (n.visaType) out.visaType = n.visaType;
    out.customVisaType = n.customVisaType || null;
    out.sevisId = n.sevisId || null;
    out.ead = n.ead || null;
    out.supervisorName = n.supervisorName || null;
    out.supervisorContact = n.supervisorContact || null;
    out.supervisorCountryCode = n.supervisorCountryCode || null;
    if (n.salaryRange) out.salaryRange = n.salaryRange;
    if (n.address) out.address = n.address;
    if (n.socialLinks) out.socialLinks = n.socialLinks;
    if (n.profilePicture) out.profilePicture = n.profilePicture;
  }

  if (include("qualification")) {
    out.qualifications = n.qualifications.map((q) => ({
      degree: q.degree,
      institute: q.institute,
      ...(q.location ? { location: q.location } : {}),
      ...(yr(q.startYear) ? { startYear: yr(q.startYear) } : {}),
      ...(yr(q.endYear) ? { endYear: yr(q.endYear) } : {}),
      ...(q.description ? { description: q.description } : {}),
    }));
    out.skills = n.skills;
  }

  if (include("work-experience")) {
    out.experiences = n.experiences;
  }

  if (include("documents")) {
    out.documents = n.documents;
  }

  if (include("salary")) {
    out.salarySlips = n.salarySlips.map((s) => ({
      month: s.month,
      ...(yr(s.year) ? { year: yr(s.year) } : {}),
      documentUrl: s.documentUrl,
      key: s.key,
      originalName: s.originalName,
      size: s.size,
      mimeType: s.mimeType,
    }));
  }

  return out as UpdateMeWithCandidatePayload;
}
