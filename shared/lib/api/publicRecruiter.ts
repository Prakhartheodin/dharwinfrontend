import axios from "axios";
import { normalizeApiBase } from "@/shared/lib/api/client";

const publicApiClient = axios.create({
  baseURL: normalizeApiBase(),
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export interface PublicRecruiterProfile {
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  countryCode?: string;
  education?: string;
  domain?: string[];
  location?: string;
  profileSummary?: string;
  profilePicture?: { url?: string } | null;
}

/** GET /v1/public/recruiters/:id — no authentication required */
export async function getPublicRecruiterProfile(id: string): Promise<PublicRecruiterProfile> {
  const { data } = await publicApiClient.get<PublicRecruiterProfile>(`/public/recruiters/${id}`);
  return data;
}
