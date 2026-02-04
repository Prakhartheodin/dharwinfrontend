const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Auth API – JWT + HttpOnly cookies; frontend does not store tokens.
 * GET /v1/auth/me restores user state on app load (e.g. after refresh) when cookies are valid.
 * Override me URL via NEXT_PUBLIC_AUTH_ME_URL if your backend uses a different path.
 */
export const AUTH_ENDPOINTS = {
  login: `${BASE_API_URL}/auth/login`,
  register: `${BASE_API_URL}/auth/register`,
  me: process.env.NEXT_PUBLIC_AUTH_ME_URL ?? `${BASE_API_URL}/auth/me`,
  refreshTokens: `${BASE_API_URL}/auth/refresh-tokens`,
  logout: `${BASE_API_URL}/auth/logout`,
} as const;

export const ROUTES = {
  signIn: "/authentication/sign-in/",
  resetPassword: "/authentication/reset-password/reset-cover/",
  // After login, send users to the main dashboard, not the CRM dashboard.
  defaultAfterLogin: "/dashboard/",
  roles: "/roles/",
  rolesAdd: "/roles/add/",
  rolesEdit: (id: string) => `/roles/edit/?id=${encodeURIComponent(id)}`,
  // Settings (proper paths)
  settings: "/settings/",
  settingsRoles: "/settings/roles/",
  settingsRolesAdd: "/settings/roles/add/",
  settingsRolesEdit: (id: string) => `/settings/roles/edit/?id=${encodeURIComponent(id)}`,
  settingsUsers: "/settings/users/",
  settingsUsersAdd: "/settings/users/add/",
  settingsUsersEdit: (id: string) => `/settings/users/edit/?id=${encodeURIComponent(id)}`,
  settingsPersonalInfo: "/settings/personal-information/",
} as const;
