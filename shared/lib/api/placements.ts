"use client";

import { apiClient } from "@/shared/lib/api/client";

export type PlacementStatus = "Pending" | "Joined" | "Deferred" | "Cancelled";
export type PreBoardingStatus = "Pending" | "In Progress" | "Completed";
export type BGVStatus = "Pending" | "In Progress" | "Completed" | "Verified";

export interface BackgroundVerification {
  status?: BGVStatus;
  requestedAt?: string | null;
  completedAt?: string | null;
  verifiedBy?: string | null;
  agency?: string | null;
  notes?: string | null;
}

export interface AssetAllocation {
  name: string;
  type?: string;
  serialNumber?: string;
  allocatedAt?: string;
  notes?: string;
}

export interface ItAccess {
  system: string;
  accessLevel?: string;
  provisionedAt?: string;
  notes?: string;
}

export interface PlacementActorRef {
  _id?: string;
  name?: string;
  email?: string;
}

export interface Placement {
  _id: string;
  id?: string;
  offer: {
    _id: string;
    offerCode?: string;
    status?: string;
    joiningDate?: string | null;
    ctcBreakdown?: Record<string, number>;
  };
  job: { _id: string; title?: string; organisation?: { name: string } };
  candidate: { _id: string; fullName?: string; email?: string; phoneNumber?: string; employeeId?: string };
  joiningDate: string;
  employeeId?: string | null;
  status: PlacementStatus;
  preBoardingStatus?: PreBoardingStatus;
  backgroundVerification?: BackgroundVerification;
  assetAllocation?: AssetAllocation[];
  itAccess?: ItAccess[];
  notes?: string | null;
  /** Filled when status was set to Deferred */
  deferredBy?: PlacementActorRef | null;
  deferredAt?: string | null;
  /** Filled when status was set to Cancelled */
  cancelledBy?: PlacementActorRef | null;
  cancelledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlacementsListParams {
  jobId?: string;
  candidateId?: string;
  /** One status, or comma-separated (e.g. `Pending,Deferred`) */
  status?: PlacementStatus | string;
  preBoardingStatus?: PreBoardingStatus;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export interface PlacementsListResponse {
  results: Placement[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export async function listPlacements(params?: PlacementsListParams): Promise<PlacementsListResponse> {
  const { data } = await apiClient.get<PlacementsListResponse>("/placements", { params });
  return data;
}

export async function getPlacementById(id: string): Promise<Placement> {
  const { data } = await apiClient.get<Placement>(`/placements/${id}`);
  return data;
}

export interface UpdatePlacementPayload {
  status?: PlacementStatus;
  preBoardingStatus?: PreBoardingStatus;
  joiningDate?: string;
  notes?: string | null;
  preboardingGateBypass?: boolean;
  suppressCandidateNotifications?: boolean;
  backgroundVerification?: Partial<BackgroundVerification>;
  assetAllocation?: AssetAllocation[];
  itAccess?: ItAccess[];
}

export async function updatePlacement(id: string, payload: UpdatePlacementPayload): Promise<Placement> {
  const { data } = await apiClient.patch<Placement>(`/placements/${id}`, payload);
  return data;
}
