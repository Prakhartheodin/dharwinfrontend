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
