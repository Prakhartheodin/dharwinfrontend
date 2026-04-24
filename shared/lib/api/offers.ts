"use client";

import { apiClient } from "@/shared/lib/api/client";

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
  job: { _id: string; title: string; organisation?: { name: string }; status?: string };
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
  /** Placement status (Accepted offers only): Pending = in Pre-boarding, Joined = in Onboarding */
  placementStatus?: 'Pending' | 'Joined' | 'Deferred' | 'Cancelled' | null;
  /** Placement data (pre-boarding/onboarding) for Accepted offers */
  placement?: {
    preBoardingStatus?: string;
    backgroundVerification?: { status?: string; agency?: string; notes?: string };
    assetAllocation?: { name: string; type?: string; serialNumber?: string }[];
    itAccess?: { system: string; accessLevel?: string }[];
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
  jobApplicationId: string;
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

export async function generateOfferLetterPdf(offerId: string): Promise<Offer> {
  const { data } = await apiClient.post<Offer>(`/offers/${offerId}/generate-letter`, {});
  return data;
}

export async function downloadOfferLetterFile(offerId: string): Promise<Blob> {
  const { data } = await apiClient.get<Blob>(`/offers/${offerId}/letter-file`, { responseType: "blob" });
  return data;
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
  existingRoles?: string;
  existingTraining?: string;
  isInternship?: boolean;
  /** Internships: `roles` | `training` | `both` (default `roles` when omitted). */
  enhanceFocus?: "roles" | "training" | "both";
}): Promise<EnhanceOfferLetterRolesResponse> {
  const { data } = await apiClient.post<EnhanceOfferLetterRolesResponse>("/offers/enhance-roles", body);
  return data;
}
