"use client";

import { isAxiosError } from "axios";
import { apiClient, API_MUTATION_TIMEOUT_MS } from "@/shared/lib/api/client";

/** Save/validate letter fields on the server; allow extra time on slow networks. */
const OFFER_LETTER_SAVE_API_TIMEOUT_MS = 120_000;

export type OfferStatus = "Draft" | "Active" | "Sent" | "Under Negotiation" | "Accepted" | "Rejected";

/** Must match backend `JOB_TYPES` in constants/atsPipeline.js */
export type OfferLetterJobType =
  | "FT_40"
  | "PT_25"
  | "CONTRACT"
  | "TEMPORARY"
  | "INTERN_UNPAID"
  | "FREELANCE_PAID"
  | "FREELANCE_UNPAID";

/** Job-posting vocabulary — shared with Employee.employmentType */
export type EmploymentCategory =
  | "Full-time"
  | "Part-time"
  | "Contract"
  | "Temporary"
  | "Internship"
  | "Freelance";

export const JOB_TYPES: { value: OfferLetterJobType; label: string; compensationType: "paid" | "unpaid" }[] = [
  { value: "FT_40", label: "Full time – 40 hours/week", compensationType: "paid" },
  { value: "PT_25", label: "Part time – 20 hours/week", compensationType: "paid" },
  { value: "CONTRACT", label: "Contract", compensationType: "paid" },
  { value: "TEMPORARY", label: "Temporary", compensationType: "paid" },
  { value: "INTERN_UNPAID", label: "Training / Unpaid Internship (Full Time)", compensationType: "unpaid" },
  { value: "FREELANCE_PAID", label: "Freelance (Paid)", compensationType: "paid" },
  { value: "FREELANCE_UNPAID", label: "Freelance (Unpaid)", compensationType: "unpaid" },
];

export const EMPLOYMENT_CATEGORIES: { value: EmploymentCategory; label: string }[] = [
  { value: "Full-time", label: "Full-time" },
  { value: "Part-time", label: "Part-time" },
  { value: "Contract", label: "Contract" },
  { value: "Temporary", label: "Temporary" },
  { value: "Internship", label: "Training / Unpaid Internship" },
  { value: "Freelance", label: "Freelance" },
];

export const compensationTypeForJobType = (jobType?: OfferLetterJobType): "paid" | "unpaid" =>
  JOB_TYPES.find((t) => t.value === jobType)?.compensationType ?? "paid";

export const isInternOfferJobType = (jobType?: OfferLetterJobType): boolean => jobType === "INTERN_UNPAID";

export const isUnpaidOfferJobType = (jobType?: OfferLetterJobType): boolean =>
  compensationTypeForJobType(jobType) === "unpaid";

export function employmentCategoryFromOfferJobType(jobType?: OfferLetterJobType): EmploymentCategory {
  switch (jobType) {
    case "PT_25":
      return "Part-time";
    case "CONTRACT":
      return "Contract";
    case "TEMPORARY":
      return "Temporary";
    case "INTERN_UNPAID":
      return "Internship";
    case "FREELANCE_PAID":
    case "FREELANCE_UNPAID":
      return "Freelance";
    default:
      return "Full-time";
  }
}

/** Collapses Freelance category + pay choice into one offer enum value. */
export function offerJobTypeFromEmployment(
  category: EmploymentCategory,
  freelancePay: "paid" | "unpaid" = "paid"
): OfferLetterJobType {
  switch (category) {
    case "Part-time":
      return "PT_25";
    case "Contract":
      return "CONTRACT";
    case "Temporary":
      return "TEMPORARY";
    case "Internship":
      return "INTERN_UNPAID";
    case "Freelance":
      return freelancePay === "unpaid" ? "FREELANCE_UNPAID" : "FREELANCE_PAID";
    default:
      return "FT_40";
  }
}

export function freelancePayFromOfferJobType(jobType?: OfferLetterJobType): "paid" | "unpaid" {
  return jobType === "FREELANCE_UNPAID" ? "unpaid" : "paid";
}

export interface CtcBreakdown {
  base?: number;
  hra?: number;
  specialAllowances?: number;
  otherAllowances?: number;
  gross?: number;
  currency?: string;
}

/** One immutable Save-letter snapshot (from Offer.letterVersions). */
export interface OfferLetterVersionSnapshot {
  letterFullName?: string | null;
  letterAddress?: string | null;
  positionTitle?: string | null;
  jobType?: OfferLetterJobType | null;
  weeklyHours?: number;
  workLocation?: string | null;
  roleResponsibilities?: string[];
  positionOverviewHtml?: string | null;
  trainingOutcomes?: string[];
  trainingOutcomesHtml?: string | null;
  compensationNarrative?: string | null;
  academicAlignmentNote?: string | null;
  employmentEligibilityLines?: string[];
  supervisor?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  };
  letterDate?: string | null;
  joiningDate?: string | null;
  ctcBreakdown?: CtcBreakdown;
}

export interface OfferLetterVersion {
  version: number;
  savedAt: string;
  savedBy?: { _id?: string; name?: string; email?: string } | string | null;
  snapshot: OfferLetterVersionSnapshot;
}

export interface Offer {
  _id: string;
  id?: string;
  /** Present on GET /offers/:id only — the list endpoint does not compute it. */
  compensationGate?: OfferCompensationGate;
  offerCode: string;
  jobApplication: string;
  job: {
    _id: string;
    title: string;
    organisation?: { name: string };
    status?: string;
    /** Full posting JD + optional shorter summary (used for AI offer-letter enhancement) */
    jobDescription?: string;
    description?: string;
  };
  candidate: {
    _id: string;
    fullName: string;
    email: string;
    phoneNumber?: string;
    address?: {
      streetAddress?: string;
      streetAddress2?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
    profilePicture?: { url?: string };
    employeeId?: string;
    department?: string;
    designation?: string;
    reportingManager?: string | { _id: string; name?: string };
  };
  status: OfferStatus;
  ctcBreakdown?: CtcBreakdown;
  joiningDate?: string | null;
  offerValidityDate?: string | null;
  offerLetterUrl?: string | null;
  offerLetterKey?: string | null;
  sentAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
  letterFullName?: string | null;
  letterAddress?: string | null;
  positionTitle?: string | null;
  jobType?: OfferLetterJobType | null;
  weeklyHours?: number;
  workLocation?: string | null;
  roleResponsibilities?: string[];
  positionOverviewHtml?: string | null;
  trainingOutcomes?: string[];
  trainingOutcomesHtml?: string | null;
  compensationNarrative?: string | null;
  academicAlignmentNote?: string | null;
  employmentEligibilityLines?: string[];
  supervisor?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
  };
  letterDate?: string | null;
  offerLetterGeneratedAt?: string | null;
  compensationType?: 'paid' | 'unpaid';
  /** Monotonic letter save counter (survives trimmed history). */
  letterVersionSeq?: number;
  /** Immutable letter snapshots from each successful Save letter (GET /offers/:id only). */
  letterVersions?: OfferLetterVersion[];
  createdBy?: { _id: string; name?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
  /** Mongo id of Placement row (Accepted offers) for deep links */
  placementId?: string;
  /** Placement status (Accepted offers only): Pending = in Pre-boarding, Joined = in Onboarding */
  placementStatus?: 'Pending' | 'Joined' | 'Deferred' | 'Cancelled' | null;
  /** Placement data (pre-boarding/onboarding) for Accepted offers */
  placement?: {
    preBoardingStatus?: string;
    backgroundVerification?: { status?: string; agency?: string; notes?: string };
    assetAllocation?: { name: string; type?: string; serialNumber?: string }[];
    itAccess?: { system: string; accessLevel?: string }[];
    deferredBy?: { _id?: string; name?: string; email?: string } | null;
    deferredAt?: string | null;
    cancelledBy?: { _id?: string; name?: string; email?: string } | null;
    cancelledAt?: string | null;
  };
}

export interface OffersListParams {
  jobId?: string;
  candidateId?: string;
  createdBy?: string;
  status?: string;
  stage?: string;
  search?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface OffersListResponse {
  results: Offer[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export async function listOffers(params?: OffersListParams): Promise<OffersListResponse> {
  const { data } = await apiClient.get<OffersListResponse>("/offers", { params });
  return data;
}

export async function getOfferById(id: string): Promise<Offer> {
  const { data } = await apiClient.get<Offer>(`/offers/${id}`);
  return data;
}

export interface CreateOfferPayload {
  /** Required by POST /offers — links to an existing job application. */
  jobApplicationId?: string;
  /** Set when HR confirms offer creation without a prior interview marked selected. */
  ackBypassInterview?: boolean;
  ctcBreakdown?: CtcBreakdown;
  joiningDate?: string | null;
  offerValidityDate?: string | null;
  notes?: string | null;
  letterFullName?: string;
  letterAddress?: string;
  positionTitle?: string;
  jobType?: OfferLetterJobType;
  weeklyHours?: number;
  workLocation?: string;
  roleResponsibilities?: string[];
  positionOverviewHtml?: string;
  trainingOutcomes?: string[];
  trainingOutcomesHtml?: string | null;
  compensationNarrative?: string;
  academicAlignmentNote?: string;
  employmentEligibilityLines?: string[];
  supervisor?: Offer["supervisor"];
  letterDate?: string | null;
}

export async function createOffer(payload: CreateOfferPayload): Promise<Offer> {
  const { data } = await apiClient.post<Offer>("/offers", payload);
  return data;
}

/** How far past the offer stage the candidate is — decides whether compensation is still editable. */
export interface OfferCompensationGate {
  allowed: boolean;
  /** Editable, but the user must confirm first (placement is live: pre-boarding or onboarding). */
  confirm: boolean;
  reason: "no-placement" | "live" | "offramp" | "joined" | "unknown-stage";
  stage: string | null;
  /** When the placement was cancelled or deferred, if that is why it is blocked. */
  at: string | null;
  actorName: string | null;
}

export interface UpdateOfferPayload {
  status?: OfferStatus;
  /**
   * Explicit acknowledgement that this candidate is already past the offer stage. The server
   * requires it before a compensation change lands on a live placement, because the letter form
   * PATCHes its whole body and a stale one could otherwise revert the snapshot silently.
   */
  compensationChangeAck?: boolean;
  ctcBreakdown?: CtcBreakdown;
  joiningDate?: string | null;
  offerValidityDate?: string | null;
  notes?: string | null;
  rejectionReason?: string | null;
  letterFullName?: string;
  letterAddress?: string;
  positionTitle?: string;
  jobType?: OfferLetterJobType;
  weeklyHours?: number;
  workLocation?: string;
  roleResponsibilities?: string[];
  positionOverviewHtml?: string;
  trainingOutcomes?: string[];
  trainingOutcomesHtml?: string | null;
  compensationNarrative?: string;
  academicAlignmentNote?: string;
  employmentEligibilityLines?: string[];
  supervisor?: Offer["supervisor"];
  letterDate?: string | null;
}

export async function updateOffer(id: string, payload: UpdateOfferPayload): Promise<Offer> {
  const { data } = await apiClient.patch<Offer>(`/offers/${id}`, payload);
  return data;
}

export async function deleteOffer(id: string): Promise<void> {
  await apiClient.delete(`/offers/${id}`);
}

export interface OfferLetterDefaultsResponse {
  roleResponsibilities: string[];
  trainingOutcomes: string[];
  /** When jobId is passed, backend may return the job's JD HTML. */
  positionOverviewHtml?: string;
  trainingOutcomesHtml?: string;
  /** Suggested offer job type from the linked job posting (default only, not enforced). */
  suggestedJobType?: OfferLetterJobType;
}

export async function getOfferLetterDefaults(
  positionTitle: string,
  jobId?: string
): Promise<OfferLetterDefaultsResponse> {
  const params: Record<string, string> = { positionTitle: positionTitle || "" };
  if (jobId) params.jobId = jobId;
  const { data } = await apiClient.get<OfferLetterDefaultsResponse>("/offers/letter-defaults", {
    params,
  });
  return data;
}

/** Validates letter fields and persists them (POST `/offers/:id/generate-letter`). No server-side PDF — use browser Print / Save as PDF. */
export async function saveOfferLetter(offerId: string, letterPayload?: UpdateOfferPayload): Promise<Offer> {
  const { data } = await apiClient.post<Offer>(`/offers/${offerId}/generate-letter`, letterPayload ?? {}, {
    timeout: OFFER_LETTER_SAVE_API_TIMEOUT_MS,
  });
  return data;
}

/** User-visible message for failed offer-letter save calls (timeouts, 4xx/5xx, network). */
export function formatOfferLetterSaveError(err: unknown, fallback: string): string {
  if (isAxiosError(err) && (err.code === "ECONNABORTED" || err.message?.toLowerCase().includes("timeout"))) {
    return "The request timed out while saving the offer letter. Check your connection and try again.";
  }
  if (isAxiosError(err)) {
    const msg = (err.response?.data as { message?: string } | undefined)?.message;
    if (msg && String(msg).trim()) return String(msg).trim();
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export interface EnhanceOfferLetterRolesResponse {
  lines?: string[];
  text?: string;
  trainingLines?: string[];
  trainingText?: string;
}

/** AI: generate or improve offer letter roles and/or internship training outcomes (OpenAI on server). */
export async function enhanceOfferLetterRoles(body: {
  jobTitle: string;
  /** Official job posting body (JD) from the listing this offer is tied to */
  jobDescription?: string;
  existingRoles?: string;
  existingTraining?: string;
  isInternship?: boolean;
  /** Internships: `roles` | `training` | `both` (default `roles` when omitted). */
  enhanceFocus?: "roles" | "training" | "both";
}): Promise<EnhanceOfferLetterRolesResponse> {
  const { data } = await apiClient.post<EnhanceOfferLetterRolesResponse>("/offers/enhance-roles", body);
  return data;
}

export interface ShareOfferPayload {
  to?: string;
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
}

export async function shareOfferWithCandidate(
  offerId: string,
  payload: ShareOfferPayload
): Promise<{ sharedTo: string }> {
  const id = String(offerId || "").trim();
  if (!id) {
    throw new Error("Offer id is missing — close the dialog and try again.");
  }
  const { data } = await apiClient.post<{ sharedTo: string }>(
    `/offers/${id}/share`,
    payload,
    { timeout: API_MUTATION_TIMEOUT_MS }
  );
  return data;
}
