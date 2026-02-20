"use client";

import { apiClient } from "@/shared/lib/api/client";

export type OfferStatus = "Draft" | "Sent" | "Under Negotiation" | "Accepted" | "Rejected";

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
  sentAt?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  notes?: string | null;
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
}

export async function updateOffer(id: string, payload: UpdateOfferPayload): Promise<Offer> {
  const { data } = await apiClient.patch<Offer>(`/offers/${id}`, payload);
  return data;
}

export async function deleteOffer(id: string): Promise<void> {
  await apiClient.delete(`/offers/${id}`);
}
