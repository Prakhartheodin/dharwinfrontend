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
