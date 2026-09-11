import { resolveEmployeeJobTitle } from "@/shared/lib/employee-job-title";
import { parseStoredPhone } from "@/shared/lib/phoneCountries";
import type { CandidateListItem } from "@/shared/lib/api/employees";
import type { CandidateWithProfile } from "@/shared/lib/api/auth";
import type {
  WorkforceFormState,
  PersonalInfoSlice,
  Education,
  Skill,
  Experience,
  SalarySlip,
} from "../types/workforce.types";
import type { DocumentResource } from "../types/resource.types";
import { emptyWorkforceFormState } from "./schema";
import { migrateToCurrent } from "./version";

export type WorkforceSource =
  | (CandidateListItem & Partial<CandidateWithProfile>)
  | CandidateWithProfile
  | null
  | undefined;

let idCounter = 0;
const nextId = () => `wf-${Date.now()}-${++idCounter}`;

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : v != null ? String(v) : fallback;
}

function asNum(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v);
}

function asBool(v: unknown): boolean {
  return v === true;
}

/**
 * HTML `<input type="date">` only accepts `yyyy-mm-dd`.
 * GET/PATCH `/auth/me/with-candidate` returns Mongo Date fields as full ISO
 * (`2022-06-01T00:00:00.000Z`); feeding that straight into the input blanks it
 * even though the value was saved — coerce to the date-only prefix.
 */
function asDateInputValue(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  const raw = typeof v === "string" ? v.trim() : String(v);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const isoPrefix = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoPrefix) return isoPrefix[1];
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return "";
}

function readSchemaVersion(data: unknown): number {
  if (data && typeof data === "object" && "__schemaVersion" in (data as Record<string, unknown>)) {
    const raw = (data as Record<string, unknown>).__schemaVersion;
    if (typeof raw === "number") return raw;
  }
  return 1;
}

function mapDocument(d: NonNullable<CandidateListItem["documents"]>[number]): DocumentResource {
  const logicalSlot =
    d.logicalSlot === "resume" || d.logicalSlot === "cover-letter" ? d.logicalSlot : undefined;
  return {
    tempId: nextId(),
    status: "uploaded",
    progress: 1,
    label: asString(d.label, asString(d.originalName)),
    type: typeof d.type === "string" ? d.type : undefined,
    logicalSlot,
    slotVersion: typeof d.slotVersion === "number" ? d.slotVersion : undefined,
    retryCount: 0,
    metadata: {
      url: asString(d.url),
      key: asString(d.key),
      originalName: asString(d.originalName),
      size: typeof d.size === "number" ? d.size : 0,
      mimeType: asString(d.mimeType, "application/octet-stream"),
    },
  };
}

function mapSalarySlip(
  s: NonNullable<CandidateWithProfile["salarySlips"]>[number] & {
    size?: number;
    mimeType?: string;
  },
): SalarySlip {
  return {
    id: nextId(),
    month: asString(s.month),
    year: asNum(s.year),
    resource: {
      tempId: nextId(),
      status: s.key || s.documentUrl ? "uploaded" : "queued",
      progress: 1,
      label: asString(s.originalName, `${asString(s.month)} ${asNum(s.year)}`),
      retryCount: 0,
      metadata:
        s.key || s.documentUrl
          ? {
              url: asString(s.documentUrl),
              key: asString(s.key),
              originalName: asString(s.originalName),
              size: typeof s.size === "number" ? s.size : 0,
              mimeType: asString(s.mimeType, "application/octet-stream"),
            }
          : undefined,
    },
  };
}

/** API response -> UI state. Version-aware via services/version.ts. */
export function mapToFormState(source: WorkforceSource): WorkforceFormState {
  if (!source) return emptyWorkforceFormState();

  const migrated = migrateToCurrent(source, readSchemaVersion(source)) as
    & CandidateListItem
    & Partial<CandidateWithProfile>;

  const empty = emptyWorkforceFormState();
  const storedPhone = parseStoredPhone(migrated.phoneNumber, migrated.countryCode);

  const personalInfo: PersonalInfoSlice = {
    ...empty.personalInfo,
    fullName: asString(migrated.fullName, empty.personalInfo.fullName),
    email: asString(migrated.email, empty.personalInfo.email),
    // Stored phones come back E.164 or formatted ("+91 90000 00000"), while the
    // input holds national digits only and the API demands ^\d{6,15}$. Without
    // this split, opening a profile and saving it answers 400.
    phoneNumber: storedPhone.digits || empty.personalInfo.phoneNumber,
    countryCode: storedPhone.countryCode || empty.personalInfo.countryCode,
    shortBio: asString(migrated.shortBio, empty.personalInfo.shortBio),
    degree: asString(migrated.degree, empty.personalInfo.degree),
    designation: resolveEmployeeJobTitle(migrated) || asString(migrated.designation, empty.personalInfo.designation),
    visaType: asString(migrated.visaType, empty.personalInfo.visaType),
    customVisaType: asString(migrated.customVisaType, empty.personalInfo.customVisaType),
    sevisId: asString(migrated.sevisId, empty.personalInfo.sevisId),
    ead: asString(migrated.ead, empty.personalInfo.ead),
    supervisorName: asString(migrated.supervisorName, empty.personalInfo.supervisorName),
    supervisorContact: asString(migrated.supervisorContact, empty.personalInfo.supervisorContact),
    supervisorCountryCode: asString(
      migrated.supervisorCountryCode,
      empty.personalInfo.supervisorCountryCode,
    ),
    salaryRange: asString(migrated.salaryRange, empty.personalInfo.salaryRange),
    companyAssignedEmail: asString(migrated.companyAssignedEmail, empty.personalInfo.companyAssignedEmail),
    companyEmailProvider:
      (migrated.companyEmailProvider as PersonalInfoSlice["companyEmailProvider"]) ?? "",
    address: {
      streetAddress: asString(migrated.address?.streetAddress),
      streetAddress2: asString(migrated.address?.streetAddress2),
      city: asString(migrated.address?.city),
      state: asString(migrated.address?.state),
      zipCode: asString(migrated.address?.zipCode),
      country: asString(migrated.address?.country),
    },
    profilePicture: migrated.profilePicture ?? undefined,
    profilePictureRemoved: false,
    socialLinks: (migrated.socialLinks ?? []).map((l) => ({
      id: nextId(),
      platform: asString(l?.platform),
      url: asString(l?.url),
    })),
  };

  const educations: Education[] = (migrated.qualifications ?? []).map((q) => ({
    id: nextId(),
    degree: asString(q.degree),
    institute: asString(q.institute),
    location: asString((q as { location?: string }).location),
    startYear: asNum((q as { startYear?: number }).startYear),
    endYear: asNum((q as { endYear?: number }).endYear),
    description: asString((q as { description?: string }).description),
  }));

  const skills: Skill[] = (migrated.skills ?? []).map((s) => ({
    id: nextId(),
    name: asString(s.name),
    level: asString(s.level, "Beginner"),
    category: asString(s.category) || undefined,
  }));

  const experiences: Experience[] = (migrated.experiences ?? []).map((x) => ({
    id: nextId(),
    company: asString(x.company),
    role: asString(x.role),
    startDate: asDateInputValue(x.startDate),
    endDate: asDateInputValue(x.endDate),
    currentlyWorking: asBool((x as { currentlyWorking?: boolean }).currentlyWorking),
    description: asString((x as { description?: string }).description),
  }));

  const documents = (migrated.documents ?? []).map(mapDocument);
  const salarySlips = (migrated.salarySlips ?? []).map((s) =>
    mapSalarySlip(s as Parameters<typeof mapSalarySlip>[0]),
  );

  return {
    personalInfo,
    qualification: { educations, skills },
    experience: { experiences },
    documents: { documents },
    salary: { salarySlips },
  };
}
