/**
 * Auth API – JWT + HttpOnly cookies; frontend does not store tokens.
 * Paths are relative to `apiClient` baseURL (e.g. `/api/v1` via Next rewrite, or full `.../v1`).
 * Override me URL via NEXT_PUBLIC_AUTH_ME_URL if your backend uses a different path (absolute URL ok).
 */
export const AUTH_ENDPOINTS = {
  login: "auth/login",
  register: "auth/register",
  /** Student registration – creates User + Student profile, auto-assigns Student role. */
  registerStudent: "auth/register-student",
  /** Mentor registration – creates User + Mentor profile, auto-assigns Mentor role. */
  registerMentor: "auth/register-mentor",
  /** Recruiter registration (Admin only) – creates User with Recruiter role. */
  registerRecruiter: "auth/register-recruiter",
  /** Public registration – no auth; user created with status pending. */
  publicRegister: "public/register",
  /** Public candidate onboarding – no auth; creates User + Candidate for ATS list. */
  publicRegisterCandidate: "public/register-candidate",
  me: process.env.NEXT_PUBLIC_AUTH_ME_URL ?? "auth/me",
  /** User + Candidate merged for candidates (GET/PATCH). Single source for Personal Information and My Profile. */
  meWithCandidate: "auth/me/with-candidate",
  /** Request verification email for the current user (auth only; no permission required). */
  sendMyVerificationEmail: "auth/me/send-verification-email",
  /** Current user's resolved permissions (auth only, no permission required). */
  myPermissions: "auth/my-permissions",
  refreshTokens: "auth/refresh-tokens",
  logout: "auth/logout",
  impersonate: "auth/impersonate",
  stopImpersonation: "auth/stop-impersonation",
  changePassword: "auth/change-password",
  /** Forgot password – request reset link by email (no auth). */
  forgotPassword: "auth/forgot-password",
  /** Reset password – use token from email link to set a new password. */
  resetPassword: "auth/reset-password",
  /** Send candidate onboarding/preboarding invitation(s). Auth required. Single: { email, onboardUrl }. Bulk: { invitations: [{ email, onboardUrl }] }. */
  sendCandidateInvitation: "auth/send-candidate-invitation",
} as const;

export const ROUTES = {
  signIn: "/authentication/sign-in/",
  /** Public registration – no auth required; shareable URL. */
  register: "/authentication/register/",
  resetPassword: "/authentication/reset-password/",
  // After login, send users to the main dashboard, not the CRM dashboard.
  defaultAfterLogin: "/dashboard/",
  /** Candidate profile (for users with role 'user' from share-candidate-form). Redirects to edit form. */
  candidateProfile: "/ats/my-profile/",
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
  /** Administrator only — assign training students to Agent users */
  settingsAgents: "/settings/agents/",
  // Settings > Attendance
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
} as const;
