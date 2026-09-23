import type { CandidateListItem } from "@/shared/lib/api/employees";
import type { UpdateMeWithCandidatePayload } from "@/shared/lib/api/auth";
import type { NormalizedWorkforce } from "../types/workforce.types";
import type { StepId } from "../types/wizard.types";

export type DirtyMap = Partial<Record<StepId, boolean>>;

const yr = (s: string): number | undefined => {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/**
 * Drops "" and undefined entries. The normalizer emits "" for every absent
 * string, but the `PATCH /auth/me/with-candidate` Joi schema rejects empty
 * strings ("... is not allowed to be empty", and `""` is not a valid date)
 * and answers 400. The admin route avoids this because toCandidatePayload
 * spreads each optional field conditionally.
 */
const isAbsoluteUrl = (url: string | undefined): boolean =>
  !!url && /^https?:\/\//i.test(url);

const compact = <T extends Record<string, unknown>>(obj: T): Partial<T> =>
  Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== "" && v !== undefined),
  ) as Partial<T>;

/** Backend profilePicture schema — strip upload extras like `label`. */
const toProfilePicturePayload = (
  pic: NonNullable<NormalizedWorkforce["profilePicture"]>,
) =>
  compact({
    url: pic.url,
    key: pic.key,
    originalName: pic.originalName,
    size: pic.size,
    mimeType: pic.mimeType,
  });

/** Admin create/update payload — `Partial<CandidateListItem>` shape. */
export function toCandidatePayload(
  n: NormalizedWorkforce,
): Partial<CandidateListItem> {
  return {
    fullName: n.fullName,
    email: n.email,
    phoneNumber: n.phoneNumber,
    profilePicture: n.profilePictureRemoved
      ? null
      : n.profilePicture
        ? toProfilePicturePayload(n.profilePicture)
        : undefined,
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
    ...(n.eadCardNumber ? { eadCardNumber: n.eadCardNumber } : {}),
    // Send the bare YMD string. Never new Date(ymd).toISOString() — that reintroduces
    // the timezone shift the mapper's read side exists to avoid.
    ...(n.eadValidFrom ? { eadValidFrom: n.eadValidFrom } : {}),
    ...(n.eadValidTo ? { eadValidTo: n.eadValidTo } : {}),
    ...(n.visaNumber ? { visaNumber: n.visaNumber } : {}),
    // Bare YMD, never toISOString() -- see the eadValidFrom note above.
    ...(n.visaIssueDate ? { visaIssueDate: n.visaIssueDate } : {}),
    ...(n.visaExpiryDate ? { visaExpiryDate: n.visaExpiryDate } : {}),
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
    // Compensation and job-title fields stay omitted: they are admin-owned, read-only
    // in this wizard, and sending the "" the state holds for them would null-clear a
    // real value on save.
    //
    // The immigration fields are different — CANDIDATE_ME_FIELDS has always let a
    // person set their own `ead`, `sevisId` and `visaType`, so the scanned equivalents
    // belong to them too. Each is sent only when non-empty, which keeps the clearing
    // risk that motivated the original omission off the table.
    if (n.sevisId) out.sevisId = n.sevisId;
    if (n.visaType) out.visaType = n.visaType;
    if (n.customVisaType) out.customVisaType = n.customVisaType;
    if (n.eadCardNumber) out.eadCardNumber = n.eadCardNumber;
    if (n.eadValidFrom) out.eadValidFrom = n.eadValidFrom;
    if (n.eadValidTo) out.eadValidTo = n.eadValidTo;
    if (n.visaNumber) out.visaNumber = n.visaNumber;
    if (n.visaIssueDate) out.visaIssueDate = n.visaIssueDate;
    if (n.visaExpiryDate) out.visaExpiryDate = n.visaExpiryDate;
    if (n.address) out.address = compact(n.address);
    if (n.socialLinks) out.socialLinks = n.socialLinks;
    // A cleared photo must reach the server as an explicit null; omitting it
    // left the old picture in place.
    if (n.profilePictureRemoved) {
      out.profilePicture = null;
    } else if (n.profilePicture && isAbsoluteUrl(n.profilePicture.url)) {
      // profilePicture.url is validated with Joi .uri(). A relative path is
      // server-origin data, so echoing it back changes nothing — drop it rather
      // than trade a no-op for a 400. Upload metadata may include `label`, which
      // the schema rejects — pick only allowed fields (legacy settings page does this).
      out.profilePicture = toProfilePicturePayload(n.profilePicture);
    }
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
    // currentlyWorking is a boolean and survives compact(); blank dates do not.
    out.experiences = n.experiences.map((x) =>
      compact({
        company: x.company,
        role: x.role,
        startDate: x.startDate,
        endDate: x.endDate,
        currentlyWorking: x.currentlyWorking,
        description: x.description,
      }),
    );
  }

  if (include("documents")) {
    out.documents = n.documents.map((d) => compact({ ...d }));
  }

  if (include("salary")) {
    out.salarySlips = n.salarySlips.map((s) =>
      compact({
        month: s.month,
        year: yr(s.year),
        documentUrl: s.documentUrl,
        key: s.key,
        originalName: s.originalName,
        size: s.size,
        mimeType: s.mimeType,
      }),
    );
  }

  return out as UpdateMeWithCandidatePayload;
}
