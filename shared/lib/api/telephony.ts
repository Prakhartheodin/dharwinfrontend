"use client";

import { apiClient } from "@/shared/lib/api/client";

export type TelephonyProvider = "plivo" | "twilio";

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

export async function buyTelephonyNumber(number: string): Promise<BuyTelephonyNumberResponse> {
  const res = await apiClient.post<BuyTelephonyNumberResponse>("/plivo/numbers/buy", { number });
  return res.data;
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
};

export async function getTelephonySdkToken(): Promise<TelephonySdkTokenResponse> {
  const res = await apiClient.post<TelephonySdkTokenResponse>("/plivo/sdk-token", {});
  return res.data;
}

export type RegisterTelephonyBrowserCallIntentParams = {
  toNumber: string;
  callerId: string;
};

export type RegisterTelephonyBrowserCallIntentResponse = {
  intent: string;
};

/** Plivo-only fallback when browser SDK cannot pass CallerId (Twilio uses Device.connect params). */
export async function registerTelephonyBrowserCallIntent(
  params: RegisterTelephonyBrowserCallIntentParams
): Promise<RegisterTelephonyBrowserCallIntentResponse> {
  const res = await apiClient.post<RegisterTelephonyBrowserCallIntentResponse>(
    "/plivo/browser-call-intent",
    params
  );
  return res.data;
}
