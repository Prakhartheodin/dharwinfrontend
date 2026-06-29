import { apiClient } from "@/shared/lib/api/client";

export interface CompanyPhoneNumberCapabilities {
  voice?: boolean;
  sms?: boolean;
}

export interface CompanyPhoneNumberAssignee {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
}

export interface CompanyPhoneNumberRow {
  _id: string;
  id?: string;
  tenantId?: string;
  provider: "twilio" | "plivo";
  phoneNumber: string;
  friendlyName?: string;
  twilioSid?: string;
  assignedTo?: CompanyPhoneNumberAssignee | string | null;
  departmentId?: { _id?: string; name?: string } | string | null;
  teamId?: { _id?: string; name?: string } | string | null;
  isActive: boolean;
  capabilities?: CompanyPhoneNumberCapabilities;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListCompanyPhoneNumbersParams {
  q?: string;
  assignedTo?: string;
  departmentId?: string;
  teamId?: string;
  isActive?: "true" | "false";
  unassigned?: "true" | "false";
}

export async function listCompanyPhoneNumbers(params?: ListCompanyPhoneNumbersParams) {
  const { data } = await apiClient.get<{
    success: boolean;
    numbers: CompanyPhoneNumberRow[];
    total: number;
  }>("/company-phone-numbers", { params });
  return data;
}

export async function syncCompanyPhoneNumbers() {
  const { data } = await apiClient.post<{
    success: boolean;
    created: number;
    updated: number;
    total: number;
    provider: string;
  }>("/company-phone-numbers/sync");
  return data;
}

export async function updateCompanyPhoneNumber(
  id: string,
  body: {
    friendlyName?: string;
    assignedTo?: string | null;
    departmentId?: string | null;
    teamId?: string | null;
    isActive?: boolean;
  },
) {
  const { data } = await apiClient.patch<{ success: boolean; number: CompanyPhoneNumberRow }>(
    `/company-phone-numbers/${encodeURIComponent(id)}`,
    body,
  );
  return data;
}

export async function listMyAssignedCompanyPhoneNumbers() {
  const { data } = await apiClient.get<{ success: boolean; numbers: CompanyPhoneNumberRow[] }>(
    "/company-phone-numbers/mine",
  );
  return data;
}

export interface CompanyPhoneUserAssignmentRow {
  userId: string;
  fullName: string;
  email: string;
  roleLabel: string;
  companyPhoneNumberId: string | null;
  companyPhoneNumber: string;
}

export interface CompanyPhoneNumberOption {
  _id: string;
  phoneNumber: string;
  friendlyName?: string;
  isActive: boolean;
  assignedToUserId: string | null;
}

export async function getCompanyPhoneUserAssignments() {
  const { data } = await apiClient.get<{
    success: boolean;
    users: CompanyPhoneUserAssignmentRow[];
    numbers: CompanyPhoneNumberOption[];
  }>("/company-phone-numbers/user-assignments");
  return data;
}

export async function assignCompanyPhoneNumberToUser(body: {
  userId: string;
  companyPhoneNumberId?: string | null;
}) {
  const { data } = await apiClient.post<{
    success: boolean;
    userId: string;
    companyPhoneNumberId: string | null;
    companyPhoneNumber: string;
  }>("/company-phone-numbers/assign-user", body);
  return data;
}
