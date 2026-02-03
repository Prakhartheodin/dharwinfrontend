/** User from backend (login/me). Matches guide: id, email, name, role, roleIds, status. */
export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
  roleIds?: string[];
  status?: string;
  [key: string]: unknown;
}

/** Auth API response; frontend ignores tokens and uses cookies. */
export interface AuthResponse {
  user: User;
  tokens: {
    access: { token: string; expires: string };
    refresh: { token: string; expires: string };
  };
}

/** Role from /v1/roles API. */
export interface Role {
  id: string;
  name: string;
  permissions: string[];
  status?: "active" | "inactive";
  createdAt?: string;
  updatedAt?: string;
}

/** Paginated roles list response. */
export interface RolesListResponse {
  results: Role[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}
