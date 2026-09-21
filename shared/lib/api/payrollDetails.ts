"use client";

import { apiClient } from "@/shared/lib/api/client";
import type { PayrollCountry } from "@/shared/lib/payroll/spec";

export type PayrollStatus = "requested" | "submitted" | "verified" | "rejected";

export interface PayrollBankView {
  accountHolderName: string;
  bankName: string;
  accountType: string;
  routingNumber: string;
  ifsc: string;
  branchName: string;
  accountNumberLast4: string;
  accountNumberMasked: string;
}

export interface PayrollTaxView {
  ssnStatus: string;
  ssnLast4: string;
  ssnMasked: string;
  filingStatus: string;
  multipleJobs: boolean;
  dependentsAmount: number | null;
  otherIncome: number | null;
  deductions: number | null;
  extraWithholding: number | null;
  workState: string;
  stateWithholdingDocumentIndex: number | null;
  panLast4: string;
  panMasked: string;
  taxRegime: string;
  form12bPreviousIncome: number | null;
  form12bPreviousTds: number | null;
  form12bbDocumentIndex: number | null;
}

export interface PayrollStatutoryView {
  hasExistingUan: boolean;
  aadhaarLast4: string;
  aadhaarMasked: string;
  uanLast4: string;
  uanMasked: string;
  pfApplicable: boolean | null;
  esiApplicable: boolean | null;
  monthlyGrossAtAssessment: number | null;
  applicabilityAssessedAt: string | Date | null;
  epfNominationDocumentIndex: number | null;
  gratuityNominationDocumentIndex: number | null;
  esicFamilyDocumentIndex: number | null;
  i9DocumentIndex: number | null;
  i9CompletedAt: string | Date | null;
}

export interface PayrollDetailView {
  id?: string;
  payrollCountry: PayrollCountry;
  countrySource: "offerCurrency" | "profileAddress" | "manual";
  status: PayrollStatus;
  requestNotes?: string;
  rejectionReason?: string;
  requestedAt?: string;
  submittedAt?: string;
  verifiedAt?: string;
  bankProofDocumentIndex: number | null;
  bank: PayrollBankView;
  tax?: PayrollTaxView;
  statutory?: PayrollStatutoryView;
}

export interface PayrollSubmitPayload {
  payrollCountry: PayrollCountry;
  bank: Record<string, string | boolean>;
  tax?: Record<string, string | number | boolean>;
  statutory?: Record<string, string | number | boolean>;
  bankProofDocumentIndex?: number;
}

export async function getPayrollDetails(employeeId: string): Promise<PayrollDetailView | null> {
  const { data } = await apiClient.get<{ success: boolean; data: PayrollDetailView | null }>(
    `/payroll-details/${employeeId}`
  );
  return data.data ?? null;
}

export async function getMyPayrollDetails(): Promise<PayrollDetailView | null> {
  const { data } = await apiClient.get<{ success: boolean; data: PayrollDetailView | null }>(
    `/payroll-details/me`
  );
  return data.data ?? null;
}

export async function requestPayrollDetails(
  employeeId: string,
  payload: { payrollCountry?: PayrollCountry; requestNotes?: string }
): Promise<PayrollDetailView> {
  const { data } = await apiClient.post<{ success: boolean; data: PayrollDetailView }>(
    `/payroll-details/${employeeId}/request`,
    payload
  );
  return data.data;
}

/** 204 empty body — do not parse JSON. Same void-delete pattern as offers/notifications. */
export async function cancelPayrollRequest(employeeId: string): Promise<void> {
  await apiClient.delete(`/payroll-details/${employeeId}/request`);
}

export async function submitPayrollDetails(
  employeeId: string,
  payload: PayrollSubmitPayload
): Promise<PayrollDetailView> {
  const { data } = await apiClient.post<{ success: boolean; data: PayrollDetailView }>(
    `/payroll-details/${employeeId}`,
    payload
  );
  return data.data;
}

export async function submitMyPayrollDetails(payload: PayrollSubmitPayload): Promise<PayrollDetailView> {
  const { data } = await apiClient.post<{ success: boolean; data: PayrollDetailView }>(
    `/payroll-details/me`,
    payload
  );
  return data.data;
}

export async function verifyPayrollDetails(
  employeeId: string,
  payload: { approved: boolean; rejectionReason?: string }
): Promise<PayrollDetailView> {
  const { data } = await apiClient.patch<{ success: boolean; data: PayrollDetailView }>(
    `/payroll-details/${employeeId}/verify`,
    payload
  );
  return data.data;
}

/** Decrypts and returns the full account number. Writes an audit row server-side. */
export async function revealAccountNumber(employeeId: string): Promise<string> {
  const { data } = await apiClient.post<{ success: boolean; data: { accountNumber: string } }>(
    `/payroll-details/${employeeId}/reveal`
  );
  return data.data.accountNumber;
}
