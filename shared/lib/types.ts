/** Profile picture subdocument from backend. */
export interface ProfilePicture {
  url?: string;
  key?: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
}

/** User from backend (login/me). Matches guide: id, email, name, username, role, roleIds, status, createdAt, lastLoginAt. */
export interface User {
  id: string;
  email: string;
  name?: string;
  username?: string;
  role?: string;
  roleIds?: string[];
  status?: string;
  profilePicture?: ProfilePicture | null;
  createdAt?: string;
  lastLoginAt?: string;
  [key: string]: unknown;
}

/** Session from GET /v1/auth/me response (sessions array). */
export interface Session {
  id: string;
  userAgent?: string | null;
  ip?: string | null;
  createdAt: string;
  expires: string;
}

/** Auth API response; frontend ignores tokens and uses cookies. */
export interface AuthResponse {
  user: User;
  tokens: {
    access: { token: string; expires: string };
    refresh: { token: string; expires: string };
  };
}

/** Impersonation info from POST /v1/auth/impersonate or GET /v1/auth/me. */
export interface ImpersonationInfo {
  impersonationId?: string;
  by: string;
  startedAt: string;
}

/** Response from POST /v1/auth/impersonate. */
export interface ImpersonateResponse extends AuthResponse {
  impersonation: ImpersonationInfo;
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

/** Paginated users list response. */
export interface UsersListResponse {
  results: User[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

/** Actor object returned in activity logs (id and name only). */
export interface ActivityLogActor {
  id: string;
  name?: string | null;
}

/** Geo subdocument from activity log (e.g. Cloudflare country). */
export interface ActivityLogGeo {
  country?: string | null;
  region?: string | null;
  city?: string | null;
}

/** Optional browser GPS (privileged users who opted in). */
export interface ActivityLogClientGeo {
  lat?: number | null;
  lng?: number | null;
  accuracyM?: number | null;
  capturedAt?: string | null;
  source?: string | null;
}

/** Activity log entry from /v1/activity-logs. */
export interface ActivityLog {
  id: string;
  actor?: ActivityLogActor | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
  httpMethod?: string | null;
  httpPath?: string | null;
  geo?: ActivityLogGeo | null;
  clientGeo?: ActivityLogClientGeo | null;
  createdAt: string;
}

/** Paginated activity logs list response. */
export interface ActivityLogsListResponse {
  results: ActivityLog[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}
