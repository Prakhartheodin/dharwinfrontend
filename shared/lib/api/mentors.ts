"use client";

import { apiClient } from "@/shared/lib/api/client";

export interface MentorUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleIds: string[];
  status: string;
  isEmailVerified: boolean;
}

export interface MentorAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

export interface MentorExpertise {
  area?: string;
  level?: string;
  yearsOfExperience?: number;
  description?: string;
}

export interface MentorExperience {
  title?: string;
  company?: string;
  location?: string;
  startDate?: string;
  endDate?: string | null;
  isCurrent?: boolean;
  description?: string;
}

export interface MentorCertification {
  name: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface Mentor {
  id: string;
  user: MentorUser;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  address?: MentorAddress | null;
  expertise?: MentorExpertise[];
  experience?: MentorExperience[];
  certifications?: MentorCertification[];
  skills?: string[];
  bio?: string | null;
  profileImageUrl?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MentorsListResponse {
  results: Mentor[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface ListMentorsParams {
  status?: string;
  search?: string;
  sortBy?: string;
  limit?: number;
  page?: number;
}

export async function listMentors(params?: ListMentorsParams): Promise<MentorsListResponse> {
  const { data } = await apiClient.get<MentorsListResponse>("/training/mentors", { params });
  return data;
}

export async function getMentor(mentorId: string): Promise<Mentor> {
  const { data } = await apiClient.get<Mentor>(`/training/mentors/${mentorId}`);
  return data;
}

export interface MentorProfileImageInfo {
  url: string;
  mimeType: string;
}

export interface UpdateMentorPayload {
  phone?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: MentorAddress;
  expertise?: MentorExpertise[];
  experience?: MentorExperience[];
  certifications?: MentorCertification[];
  skills?: string[];
  bio?: string;
  profileImageUrl?: string;
  status?: string;
}

export async function updateMentor(mentorId: string, payload: UpdateMentorPayload): Promise<Mentor> {
  const { data } = await apiClient.patch<Mentor>(`/training/mentors/${mentorId}`, payload);
  return data;
}

export async function deleteMentor(mentorId: string): Promise<void> {
  await apiClient.delete(`/training/mentors/${mentorId}`);
}

/**
 * Upload or replace a mentor's profile image.
 * Expects backend endpoint: POST /v1/training/mentors/:mentorId/profile-image
 */
export async function uploadMentorProfileImage(mentorId: string, file: File): Promise<Mentor> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<Mentor>(
    `/training/mentors/${mentorId}/profile-image`,
    formData,
    {
      // Let Axios set the correct multipart boundary; overriding default JSON header.
      headers: { "Content-Type": "multipart/form-data" },
    }
  );

  return data;
}

/**
 * Get a short-lived presigned URL for viewing the mentor's profile image.
 * GET /v1/training/mentors/:mentorId/profile-image with Accept: application/json
 */
export async function getMentorProfileImage(
  mentorId: string
): Promise<MentorProfileImageInfo | null> {
  const { data } = await apiClient.get<{ success?: boolean; data?: MentorProfileImageInfo }>(
    `/training/mentors/${mentorId}/profile-image`,
    {
      headers: { Accept: "application/json" },
    }
  );

  if (!data || (data.success === false && !data.data)) {
    return null;
  }

  return data.data ?? null;
}
