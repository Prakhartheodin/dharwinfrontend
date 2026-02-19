export interface DisplayRecruiter {
  id: string;
  name: string;
  email: string;
  phone: string;
  education: string;
  domain: string;
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
  education?: string;
  domain?: string | string[];
  location?: string;
  profileSummary?: string;
  [key: string]: unknown;
}): DisplayRecruiter {
  return {
    id: String(apiUser.id ?? apiUser._id ?? ""),
    name: apiUser.name ?? "",
    email: apiUser.email ?? "",
    phone: apiUser.phoneNumber ?? "",
    education: apiUser.education ?? "",
    domain: Array.isArray(apiUser.domain) ? apiUser.domain.join(", ") : (apiUser.domain ?? ""),
    location: apiUser.location ?? "",
    profileSummary: apiUser.profileSummary ?? "",
    displayPicture: apiUser.profileImageUrl,
  };
}
