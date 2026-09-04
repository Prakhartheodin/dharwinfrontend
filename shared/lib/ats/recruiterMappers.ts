import { parseRecruiterDomains } from './recruiter-list-sort';

export interface DisplayRecruiter {
  id: string;
  name: string;
  email: string;
  phone: string;
  education: string;
  domain: string;
  domainTags: string[];
  location: string;
  profileSummary: string;
  displayPicture?: string;
}

/** Map API user (from GET /users?role=recruiter) to display shape */
export function mapRecruiterToDisplay(apiUser: {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  profilePicture?: { url?: string } | null;
  education?: string;
  domain?: string | string[];
  location?: string;
  profileSummary?: string;
  [key: string]: unknown;
}): DisplayRecruiter {
  const domainTags = parseRecruiterDomains(apiUser.domain);
  const profilePicture = apiUser.profilePicture as { url?: string } | null | undefined;
  return {
    id: String(apiUser.id ?? apiUser._id ?? ''),
    name: apiUser.name ?? '',
    email: apiUser.email ?? '',
    phone: apiUser.phoneNumber ?? '',
    education: apiUser.education ?? '',
    domain: domainTags.join(', '),
    domainTags,
    location: apiUser.location ?? '',
    profileSummary: apiUser.profileSummary ?? '',
    displayPicture: profilePicture?.url ?? apiUser.profileImageUrl,
  };
}
