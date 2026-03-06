const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Auth API – JWT + HttpOnly cookies; frontend does not store tokens.
 * GET /v1/auth/me restores user state on app load (e.g. after refresh) when cookies are valid.
 * Override me URL via NEXT_PUBLIC_AUTH_ME_URL if your backend uses a different path.
 */
export const AUTH_ENDPOINTS = {
  login: `${BASE_API_URL}/auth/login`,
  register: `${BASE_API_URL}/auth/register`,
  /** Student registration – creates User + Student profile, auto-assigns Student role. */
  registerStudent: `${BASE_API_URL}/auth/register-student`,
  /** Mentor registration – creates User + Mentor profile, auto-assigns Mentor role. */
  registerMentor: `${BASE_API_URL}/auth/register-mentor`,
  /** Public registration – no auth; user created with status pending. */
  publicRegister: `${BASE_API_URL}/public/register`,
  me: process.env.NEXT_PUBLIC_AUTH_ME_URL ?? `${BASE_API_URL}/auth/me`,
  refreshTokens: `${BASE_API_URL}/auth/refresh-tokens`,
  logout: `${BASE_API_URL}/auth/logout`,
  impersonate: `${BASE_API_URL}/auth/impersonate`,
  stopImpersonation: `${BASE_API_URL}/auth/stop-impersonation`,
  changePassword: `${BASE_API_URL}/auth/change-password`,
  /** Forgot password – request reset link by email (no auth). */
  forgotPassword: `${BASE_API_URL}/auth/forgot-password`,
  /** Reset password – use token from email link to set a new password. */
  resetPassword: `${BASE_API_URL}/auth/reset-password`,
} as const;

export const ROUTES = {
  signIn: "/authentication/sign-in/",
  /** Public registration – no auth required; shareable URL. */
  register: "/authentication/register/",
  resetPassword: "/authentication/reset-password/",
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
  settingsAttendance: "/settings/attendance/",
  settingsAttendanceWeekOff: "/settings/attendance/week-off/",
  settingsAttendanceHolidays: "/settings/attendance/holidays/",
  settingsAttendanceAssignHolidays: "/settings/attendance/assign-holidays/",
  settingsAttendanceCandidateGroups: "/settings/attendance/candidate-groups/",
  settingsAttendanceManageShifts: "/settings/attendance/manage-shifts/",
  settingsAttendanceAssignShift: "/settings/attendance/assign-shift/",
  settingsAttendanceAssignLeave: "/settings/attendance/assign-leave/",
  settingsAttendanceLeaveRequests: "/settings/attendance/leave-requests/",
  settingsAttendanceBackdated: "/settings/attendance/backdated-attendance-requests/",
  settingsPersonalInfo: "/settings/personal-information/",
} as const;
