"use client";

import { isAxiosError } from "axios";
import { apiClient } from "@/shared/lib/api/client";

/** Save/validate letter fields on the server; allow extra time on slow networks. */
const OFFER_LETTER_SAVE_API_TIMEOUT_MS = 120_000;

export type OfferStatus = "Draft" | "Sent" | "Under Negotiation" | "Accepted" | "Rejected";

/** Must match backend offer letter job types */
export type OfferLetterJobType = "FT_40" | "PT_25" | "INTERN_UNPAID";

export interface CtcBreakdown {
  base?: number;
  hra?: number;
  specialAllowances?: number;
  otherAllowances?: number;
  gross?: number;
  currency?: string;
}

export interface Offer {
  _id: string;
  id?: string;
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
  weeklyHours?: 25 | 40;
  workLocation?: string | null;
  roleResponsibilities?: string[];
  trainingOutcomes?: string[];
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
  status?: OfferStatus;
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
  /** Omit or leave unset to create a shell job + candidate (offer letter from scratch). */
  jobApplicationId?: string;
  ctcBreakdown?: CtcBreakdown;
  joiningDate?: string | null;
  offerValidityDate?: string | null;
  notes?: string | null;
  letterFullName?: string;
  letterAddress?: string;
  positionTitle?: string;
  jobType?: OfferLetterJobType;
  weeklyHours?: 25 | 40;
  workLocation?: string;
  roleResponsibilities?: string[];
  trainingOutcomes?: string[];
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

export interface UpdateOfferPayload {
  status?: OfferStatus;
  ctcBreakdown?: CtcBreakdown;
  joiningDate?: string | null;
  offerValidityDate?: string | null;
  notes?: string | null;
  rejectionReason?: string | null;
  letterFullName?: string;
  letterAddress?: string;
  positionTitle?: string;
  jobType?: OfferLetterJobType;
  weeklyHours?: 25 | 40;
  workLocation?: string;
  roleResponsibilities?: string[];
  trainingOutcomes?: string[];
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
}

export async function getOfferLetterDefaults(positionTitle: string): Promise<OfferLetterDefaultsResponse> {
  const { data } = await apiClient.get<OfferLetterDefaultsResponse>("/offers/letter-defaults", {
    params: { positionTitle: positionTitle || "" },
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
