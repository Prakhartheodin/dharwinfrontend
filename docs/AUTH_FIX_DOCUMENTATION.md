# Authentication Fix — iOS Login Loop & Cross-Device Robustness

**Date:** February 19, 2026
**Issue:** Users (particularly on iOS devices) see "Checking access..." after entering credentials, then get redirected back to the sign-in page in an infinite loop.

---

## Problem

When deployed on Render/AWS, the frontend and backend live on **different domains** (e.g., `frontend.onrender.com` and `backend.onrender.com`). The browser API client was sending requests directly to the backend (cross-origin). Auth cookies were set with `SameSite=None; Secure`.

iOS Safari's **Intelligent Tracking Prevention (ITP)** blocks or partitions third-party (cross-site) cookies. After login:

1. Login succeeds — backend returns `Set-Cookie` headers
2. iOS Safari **refuses to store** the cross-site cookies
3. Next page load calls `getMe()` — no cookie sent — 401 Unauthorized
4. Refresh token also fails (same cookie issue)
5. `onSessionExpired` fires — redirect to sign-in — **infinite loop**

This also affected some Android WebViews and privacy-focused browsers.

---

## Solution Overview

Route **all browser API requests** through a same-origin Next.js rewrite proxy (`/api/v1 → backend`). From the browser's perspective, cookies are now first-party (same domain), so ITP does not interfere.

Three layers of defense:

| Layer | What | Why |
|-------|------|-----|
| **Same-origin proxy** | All HTTP requests go through `/api/v1` on the frontend domain | Cookies are first-party; ITP does not block them |
| **SameSite=Lax cookies** | Changed from `None` to `Lax` | `Lax` is the most compatible setting for same-site cookies |
| **In-memory token fallback** | Access token stored in JS memory + sent via `Authorization` header | Safety net for edge cases where cookies still fail (e.g., very old WebViews) |
| **Refresh deduplication** | Only one refresh request at a time; others queue | Prevents race condition where parallel refreshes invalidate each other |

---

## Files Changed

### Frontend (`uat.dharwin.frontend`)

#### 1. `shared/lib/api/client.ts` — API Client (REWRITTEN)

**Before:**
```typescript
const baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "/api/v1" : "");

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

function isAuthEndpoint(url: string): boolean {
  const path = url.split("?")[0];
  return (
    path.endsWith("/auth/login") ||
    path.endsWith("/auth/refresh-tokens") ||
    path.endsWith("/auth/logout")
  );
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status !== 401 || config._retry || isAuthEndpoint(config?.url ?? "")) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      await apiClient.post(AUTH_ENDPOINTS.refreshTokens, {});
      return apiClient(config);
    } catch {
      onSessionExpired?.();
      return Promise.reject(error);
    }
  }
);
```

**After:** See current file — key changes:
- `baseURL` is now always `/api/v1` in the browser (same-origin proxy)
- Added `getApiBaseUrl()` exported helper for modules using raw `fetch`
- Added `setInMemoryToken()` + request interceptor for Authorization header fallback
- Added refresh-token deduplication via shared `refreshPromise`

---

#### 2. `shared/lib/constants.ts` — Auth Endpoints

**Before:**
```typescript
const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const AUTH_ENDPOINTS = {
  login: `${BASE_API_URL}/auth/login`,
  register: `${BASE_API_URL}/auth/register`,
  registerStudent: `${BASE_API_URL}/auth/register-student`,
  registerMentor: `${BASE_API_URL}/auth/register-mentor`,
  registerRecruiter: `${BASE_API_URL}/auth/register-recruiter`,
  publicRegister: `${BASE_API_URL}/public/register`,
  publicRegisterCandidate: `${BASE_API_URL}/public/register-candidate`,
  me: process.env.NEXT_PUBLIC_AUTH_ME_URL ?? `${BASE_API_URL}/auth/me`,
  myPermissions: `${BASE_API_URL}/auth/my-permissions`,
  refreshTokens: `${BASE_API_URL}/auth/refresh-tokens`,
  logout: `${BASE_API_URL}/auth/logout`,
  impersonate: `${BASE_API_URL}/auth/impersonate`,
  stopImpersonation: `${BASE_API_URL}/auth/stop-impersonation`,
  changePassword: `${BASE_API_URL}/auth/change-password`,
  forgotPassword: `${BASE_API_URL}/auth/forgot-password`,
  resetPassword: `${BASE_API_URL}/auth/reset-password`,
  sendCandidateInvitation: `${BASE_API_URL}/auth/send-candidate-invitation`,
} as const;
```

**After:** All endpoints are **relative paths** (e.g., `/auth/login` instead of `https://backend.com/v1/auth/login`). The `BASE_API_URL` variable was removed. Endpoints resolve against `apiClient.baseURL` (`/api/v1`).

---

#### 3. `shared/contexts/auth-context.tsx` — Auth Context

**Changes:**
- Added import: `import { setInMemoryToken } from "@/shared/lib/api/client";`
- `login()` — stores access token in memory after successful login: `setInMemoryToken(res.tokens.access.token)`
- `logout()` — clears in-memory token: `setInMemoryToken(null)`
- `handleSessionExpired()` — clears in-memory token: `setInMemoryToken(null)`
- `startImpersonation()` — stores token: `setInMemoryToken(res.tokens.access.token)`
- `stopImpersonation()` — stores token: `setInMemoryToken(res.tokens.access.token)`

---

#### 4. `next.config.js` — Rewrite Proxy

**Before:**
```javascript
async rewrites() {
  const backend =
    process.env.NEXT_PUBLIC_API_BACKEND_URL ||
    process.env.BACKEND_URL ||
    "http://localhost:3000";
  return [{ source: "/api/v1/:path*", destination: `${backend}/v1/:path*` }];
},
```

**After:** Added `deriveBackendUrl()` helper that auto-extracts the backend origin from `NEXT_PUBLIC_API_URL` as a fallback, so the proxy works even without a separate `NEXT_PUBLIC_API_BACKEND_URL` env var.

---

#### 5. `shared/lib/api/jobs.ts` — Public Job API

**Before:**
```typescript
const baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "/api/v1" : "");
const publicApiClient = axios.create({ baseURL, ... });
```

**After:**
```typescript
import { getApiBaseUrl } from "@/shared/lib/api/client";
const publicApiClient = axios.create({ baseURL: getApiBaseUrl(), ... });
```

---

#### 6. `shared/lib/api/email.ts` — Attachment URL

**Before:**
```typescript
const base = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "/api/v1" : "");
```

**After:**
```typescript
const base = typeof window !== "undefined" ? "/api/v1" : (process.env.NEXT_PUBLIC_API_URL || "/api/v1");
```

---

#### 7. `shared/lib/api/training-modules.ts` — SSE Streams (3 locations)

Same pattern change in `processDocument()`, `generateModuleFromTitle()`, `generateModuleWithAI()`:

**Before:** `process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "/api/v1" : "")`
**After:** `typeof window !== "undefined" ? "/api/v1" : (process.env.NEXT_PUBLIC_API_URL || "/api/v1")`

---

#### 8. `shared/lib/api/blog.ts` — Blog Base URL

**Before:** `const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? "";`
**After:** `const getBaseUrl = () => typeof window !== "undefined" ? "/api/v1" : (process.env.NEXT_PUBLIC_API_URL ?? "/api/v1");`

---

#### 9. `.env.example` — Updated documentation

Added comments explaining the proxy architecture and `NEXT_PUBLIC_API_BACKEND_URL`.

---

### Backend (`uat.dharwin.backend`)

#### 10. `src/controllers/auth.controller.js` — Cookie Options

**Before:**
```javascript
const cookieOptions = (expires) => ({
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: config.env === 'production' ? 'none' : 'lax',
  path: '/',
  ...(expires && { expires }),
});
```

**After:**
```javascript
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'lax';
const cookieOptions = (expires) => ({
  httpOnly: true,
  secure: config.env === 'production' || COOKIE_SAMESITE === 'none',
  sameSite: COOKIE_SAMESITE,
  path: '/',
  ...(expires && { expires }),
});
```

---

## How to Revert All Changes

If these changes cause issues and you need to go back to the previous behavior, follow these steps:

### Step 1: Revert `shared/lib/constants.ts`

Replace the AUTH_ENDPOINTS block with:

```typescript
const BASE_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Auth API – JWT + HttpOnly cookies; frontend does not store tokens.
 * GET /v1/auth/me restores user state on app load (e.g. after refresh) when cookies are valid.
 * Override me URL via NEXT_PUBLIC_AUTH_ME_URL if your backend uses a different path.
 */
export const AUTH_ENDPOINTS = {
  login: `${BASE_API_URL}/auth/login`,
  register: `${BASE_API_URL}/auth/register`,
  registerStudent: `${BASE_API_URL}/auth/register-student`,
  registerMentor: `${BASE_API_URL}/auth/register-mentor`,
  registerRecruiter: `${BASE_API_URL}/auth/register-recruiter`,
  publicRegister: `${BASE_API_URL}/public/register`,
  publicRegisterCandidate: `${BASE_API_URL}/public/register-candidate`,
  me: process.env.NEXT_PUBLIC_AUTH_ME_URL ?? `${BASE_API_URL}/auth/me`,
  myPermissions: `${BASE_API_URL}/auth/my-permissions`,
  refreshTokens: `${BASE_API_URL}/auth/refresh-tokens`,
  logout: `${BASE_API_URL}/auth/logout`,
  impersonate: `${BASE_API_URL}/auth/impersonate`,
  stopImpersonation: `${BASE_API_URL}/auth/stop-impersonation`,
  changePassword: `${BASE_API_URL}/auth/change-password`,
  forgotPassword: `${BASE_API_URL}/auth/forgot-password`,
  resetPassword: `${BASE_API_URL}/auth/reset-password`,
  sendCandidateInvitation: `${BASE_API_URL}/auth/send-candidate-invitation`,
} as const;
```

### Step 2: Revert `shared/lib/api/client.ts`

Replace the entire file with:

```typescript
"use client";

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { AUTH_ENDPOINTS } from "@/shared/lib/constants";

const baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "/api/v1" : "");

export const apiClient = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

let onSessionExpired: (() => void) | null = null;

export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

function isAuthEndpoint(url: string): boolean {
  const path = url.split("?")[0];
  return (
    path.endsWith("/auth/login") ||
    path.endsWith("/auth/refresh-tokens") ||
    path.endsWith("/auth/logout")
  );
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status !== 401 || config._retry || isAuthEndpoint(config?.url ?? "")) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      await apiClient.post(AUTH_ENDPOINTS.refreshTokens, {});
      return apiClient(config);
    } catch {
      onSessionExpired?.();
      return Promise.reject(error);
    }
  }
);
```

### Step 3: Revert `shared/contexts/auth-context.tsx`

- Change import back to: `import { setSessionExpiredHandler } from "@/shared/lib/api/client";`
- Remove all `setInMemoryToken(...)` calls (5 total: in `login`, `logout`, `handleSessionExpired`, `startImpersonation`, `stopImpersonation`)
- Remove the comment about storing access token in the `login` function

### Step 4: Revert `next.config.js`

Replace the entire file with:

```javascript
/**@type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  basePath: "",
  assetPrefix: "",
  images: {
    loader: "imgix",
    path: "/",
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const backend =
      process.env.NEXT_PUBLIC_API_BACKEND_URL ||
      process.env.BACKEND_URL ||
      "http://localhost:3000";
    return [{ source: "/api/v1/:path*", destination: `${backend}/v1/:path*` }];
  },
};

module.exports = nextConfig;
```

### Step 5: Revert `shared/lib/api/jobs.ts`

Replace:
```typescript
import { getApiBaseUrl } from "@/shared/lib/api/client";
const publicApiClient = axios.create({ baseURL: getApiBaseUrl(), ... });
```

With:
```typescript
const baseURL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "/api/v1" : "");
const publicApiClient = axios.create({ baseURL, ... });
```

And remove the `getApiBaseUrl` import.

### Step 6: Revert `shared/lib/api/email.ts`

In `getAttachmentUrl()`, change:
```typescript
const base = typeof window !== "undefined" ? "/api/v1" : (process.env.NEXT_PUBLIC_API_URL || "/api/v1");
```

Back to:
```typescript
const base = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "/api/v1" : "");
```

### Step 7: Revert `shared/lib/api/training-modules.ts` (3 locations)

In `processDocument()`, `generateModuleFromTitle()`, and `generateModuleWithAI()`, change:
```typescript
const baseURL = typeof window !== "undefined" ? "/api/v1" : (process.env.NEXT_PUBLIC_API_URL || "/api/v1")
```

Back to:
```typescript
const baseURL = process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? "/api/v1" : "")
```

### Step 8: Revert `shared/lib/api/blog.ts`

Change:
```typescript
const getBaseUrl = () => typeof window !== "undefined" ? "/api/v1" : (process.env.NEXT_PUBLIC_API_URL ?? "/api/v1");
```

Back to:
```typescript
const getBaseUrl = () => process.env.NEXT_PUBLIC_API_URL ?? "";
```

### Step 9: Revert Backend `src/controllers/auth.controller.js`

Replace:
```javascript
const COOKIE_SAMESITE = process.env.COOKIE_SAMESITE || 'lax';
const cookieOptions = (expires) => ({
  httpOnly: true,
  secure: config.env === 'production' || COOKIE_SAMESITE === 'none',
  sameSite: COOKIE_SAMESITE,
  path: '/',
  ...(expires && { expires }),
});
```

With:
```javascript
const cookieOptions = (expires) => ({
  httpOnly: true,
  secure: config.env === 'production',
  sameSite: config.env === 'production' ? 'none' : 'lax',
  path: '/',
  ...(expires && { expires }),
});
```

Also remove the JSDoc comment above it.

### Step 10: Revert `.env.example`

Replace with:
```
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3000/v1/
#NEXT_PUBLIC_API_URL=https://uat-dharwin-backend.onrender.com/v1

# LiveKit Configuration - must match backend (use Cloud URL when using LiveKit Cloud)
NEXT_PUBLIC_LIVEKIT_URL=wss://dharwin-w82omxlx.livekit.cloud

# Frontend URL for generating share links (used for public job URLs, emails, etc.)
# Important: Update this to your production URL when deploying
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3001
#NEXT_PUBLIC_FRONTEND_URL=https://your-production-domain.com
```

---

## Testing After Deployment

1. **Desktop Chrome/Firefox:** Login, refresh page, verify session persists
2. **iOS Safari:** Login, verify no redirect loop; refresh page, verify session persists
3. **iOS in-app WebView (e.g., Slack/WhatsApp link):** Open app link, login, verify it works
4. **Android Chrome:** Login, refresh, verify session persists
5. **Multiple tabs:** Open 3+ tabs simultaneously, verify no "session expired" race condition
6. **Impersonation:** Start/stop impersonation, verify session persists
7. **Token expiry:** Wait 30+ minutes (access token expiry), make a request, verify silent refresh works

---

## Environment Variables Reference

| Variable | Where | Required | Example | Purpose |
|----------|-------|----------|---------|---------|
| `NEXT_PUBLIC_API_URL` | Frontend | Yes | `https://backend.onrender.com/v1` | WebSocket URL + proxy fallback |
| `NEXT_PUBLIC_API_BACKEND_URL` | Frontend | No | `https://backend.onrender.com` | Explicit proxy target (auto-derived from above if not set) |
| `BACKEND_URL` | Frontend | No | `https://backend.onrender.com` | Alternative to above |
| `COOKIE_SAMESITE` | Backend | No | `lax` (default) | Cookie SameSite attribute; only change to `none` if direct cross-origin API access needed |
