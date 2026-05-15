import type {
  WorkforceFormState,
  NormalizedWorkforce,
} from "../types/workforce.types";

const trimString = (v: string | undefined | null) => (v ?? "").trim();

const dropEmptyStrings = <T extends Record<string, unknown>>(obj: T): T => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = typeof v === "string" ? trimString(v) : v;
  }
  return out as T;
};

/** UI state -> intermediate normalized form. payload.ts handles backend-name mapping. */
export function normalize(state: WorkforceFormState): NormalizedWorkforce {
  const pi = state.personalInfo;

  return {
    fullName: trimString(pi.fullName),
    email: trimString(pi.email),
    phoneNumber: trimString(pi.phoneNumber),
    countryCode: trimString(pi.countryCode),
    shortBio: trimString(pi.shortBio),
    degree: trimString(pi.degree),
    designation: trimString(pi.designation),
    visaType: trimString(pi.visaType),
    customVisaType: trimString(pi.customVisaType),
    sevisId: trimString(pi.sevisId),
    ead: trimString(pi.ead),
    supervisorName: trimString(pi.supervisorName),
    supervisorContact: trimString(pi.supervisorContact),
    supervisorCountryCode: trimString(pi.supervisorCountryCode),
    salaryRange: trimString(pi.salaryRange),
    password: pi.password ? pi.password : undefined,
    companyAssignedEmail: pi.companyAssignedEmail
      ? trimString(pi.companyAssignedEmail)
      : undefined,
    companyEmailProvider: pi.companyEmailProvider
      ? String(pi.companyEmailProvider)
      : undefined,
    address: dropEmptyStrings(pi.address),
    profilePicture: pi.profilePictureRemoved ? undefined : pi.profilePicture,

    socialLinks: pi.socialLinks
      .filter((l) => trimString(l.platform) && trimString(l.url))
      .map((l) => ({ platform: trimString(l.platform), url: trimString(l.url) })),

    qualifications: state.qualification.educations
      .filter((e) => trimString(e.degree) && trimString(e.institute))
      .map(({ id: _id, ...rest }) => ({
        degree: trimString(rest.degree),
        institute: trimString(rest.institute),
        location: trimString(rest.location),
        startYear: trimString(rest.startYear),
        endYear: trimString(rest.endYear),
        description: trimString(rest.description),
      })),

    experiences: state.experience.experiences
      .filter((x) => trimString(x.company) && trimString(x.role))
      .map(({ id: _id, ...rest }) => ({
        company: trimString(rest.company),
        role: trimString(rest.role),
        startDate: trimString(rest.startDate),
        endDate: rest.currentlyWorking ? "" : trimString(rest.endDate),
        currentlyWorking: !!rest.currentlyWorking,
        description: trimString(rest.description),
      })),

    skills: state.qualification.skills
      .filter((s) => trimString(s.name))
      .map(({ id: _id, ...rest }) => ({
        name: trimString(rest.name),
        level: trimString(rest.level) || "Beginner",
        category: rest.category ? trimString(rest.category) : undefined,
      })),

    documents: state.documents.documents
      .filter((d) => d.status === "uploaded" && d.metadata)
      .map((d) => ({
        type: d.type,
        label: d.label,
        url: d.metadata!.url,
        key: d.metadata!.key,
        originalName: d.metadata!.originalName,
        size: d.metadata!.size,
        mimeType: d.metadata!.mimeType,
      })),

    salarySlips: state.salary.salarySlips
      .filter((s) => s.resource.status === "uploaded" && s.resource.metadata)
      .map((s) => ({
        month: trimString(s.month),
        year: trimString(s.year),
        documentUrl: s.resource.metadata!.url,
        key: s.resource.metadata!.key,
        originalName: s.resource.metadata!.originalName,
        size: s.resource.metadata!.size,
        mimeType: s.resource.metadata!.mimeType,
      })),
  };
}
