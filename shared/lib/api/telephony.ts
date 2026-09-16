"use client";

import axios from "axios";
import { apiClient } from "@/shared/lib/api/client";

export type TelephonyProvider = "plivo" | "twilio";

/** Active telephony provider for client-side API path selection. */
export function getConfiguredTelephonyProvider(): TelephonyProvider {
  const raw = process.env.NEXT_PUBLIC_TELEPHONY_PROVIDER?.trim().toLowerCase();
  return raw === "twilio" ? "twilio" : "plivo";
}

export function telephonyNumbersBuyPath(
  provider: TelephonyProvider = getConfiguredTelephonyProvider()
): string {
  return provider === "twilio" ? "/twilio/numbers/buy" : "/plivo/numbers/buy";
}

export type TelephonyNumberType = "local" | "tollfree" | "mobile" | "national" | "fixed";

export type SearchAvailableTelephonyNumbersParams = {
  countryIso: string;
  type?: TelephonyNumberType;
  pattern?: string;
  services?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  nearNumber?: string;
  distance?: number;
  limit?: number;
  offset?: number;
  /** Twilio cursor — pass on "load more" instead of offset when provider is twilio. */
  pageToken?: string;
};

export type AvailableTelephonyNumber = {
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

export type SearchAvailableTelephonyNumbersResponse = {
  success: boolean;
  numbers: AvailableTelephonyNumber[];
  hasMore: boolean;
  offset: number;
  limit: number;
  total?: number;
  nextPageToken?: string;
  provider?: TelephonyProvider;
};

export type BuyTelephonyNumberResponse = {
  success: boolean;
  number: string;
  message?: string;
};

export type OwnedTelephonyNumber = {
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

export type ListOwnedTelephonyNumbersResponse = {
  success: boolean;
  numbers: OwnedTelephonyNumber[];
  total: number;
  provider?: TelephonyProvider;
};

export async function searchAvailableTelephonyNumbers(
  params: SearchAvailableTelephonyNumbersParams
): Promise<SearchAvailableTelephonyNumbersResponse> {
  const res = await apiClient.get<SearchAvailableTelephonyNumbersResponse>("/plivo/numbers/available", {
    params,
  });
  return res.data;
}

export type BuyTelephonyNumberParams = {
  number: string;
  countryIso: string;
  type?: TelephonyNumberType;
  friendlyName?: string;
  provider?: TelephonyProvider;
};

function providerFromGateError(error: unknown): TelephonyProvider | null {
  if (!axios.isAxiosError(error)) return null;
  const message = (error.response?.data as { message?: string } | undefined)?.message;
  if (!message) return null;
  const match = message.match(/TELEPHONY_PROVIDER=(plivo|twilio)/i);
  if (!match) return null;
  return match[1].toLowerCase() === "twilio" ? "twilio" : "plivo";
}

async function postBuyTelephonyNumber(
  provider: TelephonyProvider,
  params: BuyTelephonyNumberParams
): Promise<BuyTelephonyNumberResponse> {
  const res = await apiClient.post<BuyTelephonyNumberResponse>(telephonyNumbersBuyPath(provider), {
    number: params.number,
    countryIso: params.countryIso,
    type: params.type,
    friendlyName: params.friendlyName,
  });
  return res.data;
}

export async function buyTelephonyNumber(
  params: BuyTelephonyNumberParams
): Promise<BuyTelephonyNumberResponse> {
  const provider = params.provider ?? getConfiguredTelephonyProvider();
  try {
    return await postBuyTelephonyNumber(provider, params);
  } catch (error) {
    // Recover from frontend/backend provider drift by retrying only when the backend
    // explicitly reports provider-gated route mismatch.
    const expectedProvider = providerFromGateError(error);
    if (expectedProvider && expectedProvider !== provider) {
      return postBuyTelephonyNumber(expectedProvider, params);
    }
    throw error;
  }
}

export async function listOwnedTelephonyNumbers(): Promise<ListOwnedTelephonyNumbersResponse> {
  const res = await apiClient.get<ListOwnedTelephonyNumbersResponse>("/plivo/numbers/owned");
  return res.data;
}

export type PlaceTelephonyCallParams = {
  toNumber: string;
  agentPhone: string;
  callerId: string;
};

export type PlaceTelephonyCallResponse = {
  success: boolean;
  requestUuid?: string;
  message?: string;
};

export async function placeTelephonyCall(
  params: PlaceTelephonyCallParams
): Promise<PlaceTelephonyCallResponse> {
  const res = await apiClient.post<PlaceTelephonyCallResponse>("/plivo/call", params);
  return res.data;
}

export type SetTelephonyRecordingParams = {
  callSid: string;
  recording: boolean;
};

export type SetTelephonyRecordingResponse = {
  success: boolean;
  recording: boolean;
  recordingSid?: string;
};

/** Toggle live recording on an in-progress browser call (Twilio). */
export async function setTelephonyRecording(
  params: SetTelephonyRecordingParams
): Promise<SetTelephonyRecordingResponse> {
  const res = await apiClient.post<SetTelephonyRecordingResponse>("/plivo/recording", params);
  return res.data;
}

export type BackfillTwilioResponse = {
  success: boolean;
  scanned: number;
  upserted: number;
  archived: number;
  errors: number;
};

/** Pull historical Twilio call logs + recordings into CRM call records. */
export async function backfillTwilioDialerCalls(
  params: { limit?: number; force?: boolean } = {}
): Promise<BackfillTwilioResponse> {
  const res = await apiClient.post<BackfillTwilioResponse>("/plivo/backfill-twilio", params);
  return res.data;
}

export type TelephonySdkTokenResponse = {
  success: boolean;
  token: string;
  username: string;
  identity?: string;
  provider?: TelephonyProvider;
  /** Twilio Voice JWT lifetime in seconds (typically 3600). */
  ttl?: number;
};

export async function getTelephonySdkToken(): Promise<TelephonySdkTokenResponse> {
  const res = await apiClient.post<TelephonySdkTokenResponse>("/plivo/sdk-token", {});
  return res.data;
}

export type RegisterTelephonyBrowserCallIntentParams = {
  toNumber: string;
  callerId: string;
  businessName?: string;
  executionId?: string;
};

export type RegisterTelephonyBrowserCallIntentResponse = {
  intent: string;
  executionId?: string;
};

export type ReportDialerInitiateParams = {
  executionId: string;
  toNumber: string;
  fromPhoneNumber: string;
  direction?: "inbound" | "outbound";
  businessName?: string;
  status?: "initiated" | "ringing";
};

export type ReportDialerOutcomeParams = {
  executionId: string;
  status: "busy" | "no_answer" | "canceled" | "cancelled" | "completed" | "failed" | "declined" | "rejected";
  direction?: "inbound" | "outbound";
  fromPhoneNumber?: string;
  toPhoneNumber?: string;
  businessName?: string;
};

/** Register dest+callerId before browser client.call(); also seeds a dialer CallRecord for Recent. */
export async function registerTelephonyBrowserCallIntent(
  params: RegisterTelephonyBrowserCallIntentParams
): Promise<RegisterTelephonyBrowserCallIntentResponse> {
  const res = await apiClient.post<RegisterTelephonyBrowserCallIntentResponse>(
    "/plivo/browser-call-intent",
    params
  );
  return res.data;
}

/** Seed a dialer CallRecord when the web softphone starts an outbound call (Twilio CallSid). */
export async function reportDialerInitiate(
  params: ReportDialerInitiateParams
): Promise<{ success: boolean; executionId: string }> {
  const res = await apiClient.post<{ success: boolean; executionId: string }>("/plivo/dialer-initiate", params);
  return res.data;
}

/** Report terminal dialer outcome from the web softphone (disconnect / cancel / fail). */
export async function reportDialerOutcome(params: ReportDialerOutcomeParams): Promise<{ success: boolean }> {
  const res = await apiClient.post<{ success: boolean }>("/plivo/dialer-outcome", params);
  return res.data;
}
