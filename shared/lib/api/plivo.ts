"use client";

import { apiClient } from "@/shared/lib/api/client";

export type PlivoNumberType = "local" | "tollfree" | "mobile" | "national" | "fixed";

export type SearchAvailablePlivoNumbersParams = {
  countryIso: string;
  type?: PlivoNumberType;
  pattern?: string;
  services?: string;
  /** City name — local numbers only. */
  city?: string;
  /** Region name (e.g. Frankfurt) — fixed numbers only. */
  region?: string;
  limit?: number;
  /** Pagination offset (page * limit). */
  offset?: number;
};

export type AvailablePlivoNumber = {
  number: string;
  type: string;
  region: string;
  city: string;
  country: string;
  monthlyRentalRate: string | number | null;
  setupRate: string | number | null;
  voiceEnabled: boolean;
  smsEnabled: boolean;
  mmsEnabled: boolean;
  voiceRate: string | number | null;
  smsRate: string | number | null;
  restriction: string;
  restrictionText: string;
};

export type SearchAvailablePlivoNumbersResponse = {
  success: boolean;
  numbers: AvailablePlivoNumber[];
  hasMore: boolean;
  offset: number;
  limit: number;
  /** Total available matches reported by Plivo (absent if Plivo omitted meta). */
  total?: number;
};

export type BuyPlivoNumberResponse = {
  success: boolean;
  number: string;
  message?: string;
};

/** A number already rented/owned on the connected Plivo account. */
export type OwnedPlivoNumber = {
  number: string;
  alias: string;
  type: string;
  region: string;
  country: string;
  addedOn: string;
  application: string;
  monthlyRentalRate: string | number | null;
  voiceEnabled: boolean;
  smsEnabled: boolean;
  mmsEnabled: boolean;
  carrier: string;
};

export type ListOwnedPlivoNumbersResponse = {
  success: boolean;
  numbers: OwnedPlivoNumber[];
  total: number;
};

/** Search Plivo for available numbers to buy (safe, free). */
export async function searchAvailablePlivoNumbers(
  params: SearchAvailablePlivoNumbersParams
): Promise<SearchAvailablePlivoNumbersResponse> {
  const res = await apiClient.get<SearchAvailablePlivoNumbersResponse>(
    "/plivo/numbers/available",
    { params }
  );
  return res.data;
}

/** Buy a Plivo number — REAL, PAID action. Confirm in the UI before calling. */
export async function buyPlivoNumber(number: string): Promise<BuyPlivoNumberResponse> {
  const res = await apiClient.post<BuyPlivoNumberResponse>("/plivo/numbers/buy", {
    number,
  });
  return res.data;
}

/** List numbers already rented/owned on the connected Plivo account (safe, free). */
export async function listOwnedPlivoNumbers(): Promise<ListOwnedPlivoNumbersResponse> {
  const res = await apiClient.get<ListOwnedPlivoNumbersResponse>("/plivo/numbers/owned");
  return res.data;
}

export type PlacePlivoCallParams = {
  /** Number to dial, E.164 (e.g. +14155550100). */
  toNumber: string;
  /** Your own phone — Plivo rings this first, then bridges to toNumber. */
  agentPhone: string;
  /** A bought number to show as caller ID, E.164. */
  callerId: string;
};

export type PlacePlivoCallResponse = {
  success: boolean;
  requestUuid?: string;
  message?: string;
};

/** Place a click-to-call bridge — REAL, billable action. Plivo rings your phone, then dials the target. */
export async function placePlivoCall(
  params: PlacePlivoCallParams
): Promise<PlacePlivoCallResponse> {
  const res = await apiClient.post<PlacePlivoCallResponse>("/plivo/call", params);
  return res.data;
}

export type PlivoSdkTokenResponse = {
  success: boolean;
  /** Short-lived (1h), outbound-only WebRTC access token for plivo-browser-sdk login. */
  token: string;
  username: string;
};

/** Mint a WebRTC access token for the browser softphone. Self-provisions Plivo app/endpoint server-side. */
export async function getPlivoSdkToken(): Promise<PlivoSdkTokenResponse> {
  const res = await apiClient.post<PlivoSdkTokenResponse>("/plivo/sdk-token", {});
  return res.data;
}
