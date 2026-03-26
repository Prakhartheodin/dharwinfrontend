# Personal Information & User Profile Consistency — Deepened Plan

## Enhancement Summary

**Deepened on:** 2026-03-20 (initial), **2026-03-20 (gap-fill pass)**  
**Original prompt:** Improve Personal Information further; use the same user data everywhere with no discrepancy.  
**Sections enhanced:** 8 + **10 (gap analysis)** + expanded touchpoints / testing  
**Research sources:** Web (SSoT / cross-client consistency), codebase scan (`getMe`, `getMeWithCandidate`, `my-profile`, `personal-information`, `header`), `docs/solutions` (none — see §10.6)

### Key Improvements (from research + code review)

1. **Declare an explicit precedence model** — Document which fields are authoritative (`User` vs `Candidate` vs `Student`) and in which order UI should read them, so every screen implements the same merge rules.
2. **Centralize read path in the frontend** — Introduce a single hook or selector (e.g. `useResolvedProfile()`) that returns merged `displayName`, `phone`, `bio`, `avatar`, `employeeId`, etc., instead of re-implementing `candidate ?? user` in each page.
3. **Align write paths** — After any PATCH, invalidate or refresh the same canonical payload (`GET /auth/me/with-candidate` when candidate-linked, else `GET /auth/me`) so header, settings, and ATS views all re-read identical data.
4. **Backend invariants** — Enforce or document sync rules (e.g. `name` ↔ `fullName`, profile picture on both User and Candidate when applicable) and add tests or lint notes for regressions.

### New Considerations Discovered

- **Dual storage** is inherent: `User` (auth, staff fields) and `Candidate` (ATS) both hold overlapping columns (name, phone, bio-like fields). Discrepancy is a **product/design** issue unless merge rules are centralized.
- **Hybrid roles** (e.g. Agent + Candidate) must use the same merge rules as candidate-only users on every surface.
- **Read-your-writes**: After saving Personal Information, all consumers should see updates immediately (React state + `checkAuth` / `refreshUser` or query invalidation) to avoid “I saved but header still shows old name” issues.

### Gap-fill pass — Key additions (2026-03-20)

- **§10 Gap analysis** — Concrete UI gaps (header uses `user.name` only + legacy `user.role` string), bootstrap split (`getMe` vs `getMeWithCandidate`), avatar rules, Student/Mentor, email precedence, admin-vs-session, testing matrix.
- **Expanded inventory** — `header.tsx` line-level notes; role label inconsistency called out.

---

## Section Manifest (Research Targets)

| Section | What to research / apply |
|--------|---------------------------|
| 1. Problem & goals | Root causes of mismatch in this repo |
| 2. Single source of truth model | Industry hub/spoke + UI merge patterns |
| 3. Field-level ownership | User vs Candidate vs Student |
| 4. Frontend architecture | One hook, one cache, invalidation |
| 5. Backend contracts | APIs and sync behavior |
| 6. Surfaces to audit | Where data is shown today |
| 7. Edge cases | Hybrids, pending users, impersonation |
| 8. Acceptance criteria & rollout | Test matrix, phased rollout |
| 10. Gap analysis | Bootstrap, avatar, header role, Student/Mentor, testing matrix |

---

## 1. Problem Statement

**User-visible issue:** Name, phone, bio, avatar, or employee ID can differ between **Settings → Personal Information**, **ATS → My Profile**, **header / dropdown**, and **admin user views**, because:

- Some screens read **`User`** only (`auth` context from `GET /auth/me`).
- Some read **`User` + `Candidate`** from **`GET /auth/me/with-candidate`** with hand-written fallbacks (e.g. `candidate?.fullName ?? user?.name`).
- Staff-only users use **`User`** fields (`phoneNumber`, `profileSummary`, …) while candidates use **`Candidate`** fields for the same concepts (phone, short bio).

**Goal:** One **consistent mental model** and **one implementation path** so “what I see” matches everywhere after save.

---

## 2. Proposed Solution (High Level)

1. **Document a “resolved profile” contract** — A single JSON shape (or TypeScript type) the app uses for display, built from API responses using fixed rules.
2. **Implement that contract in one module** — e.g. `resolveUserProfile(user, candidate | null)` + optional `student` later.
3. **Route all UI through it** — Header, Personal Information summary card, My Profile, PDFs/emails if any duplicate display logic.
4. **Keep writes explicit** — `PATCH /auth/me/with-candidate` for candidate-linked users; `PATCH /auth/me` or `PATCH /users/:id` for staff; backend already syncs some fields in transactions where applicable.

---

## 3. Technical Approach / Architecture

### 3.1 Single source of truth (industry pattern)

**Research insights**

- **Hub-and-spoke identity** reduces drift: one authority for identity, apps consume it rather than each inventing fields ([Next.js / central user hub narrative](https://dev.to/kaigrammm/stop-managing-users-manually-building-a-single-source-of-truth-with-nextjs-6k0)).
- **Internal consistency**: the same logical user should present the same attributes across surfaces ([cross-client consistency patterns](https://nostr-ux.com/docs/patterns/06-cross-client-consistency/)).
- **Read-your-writes**: after updating profile, the client should refresh canonical state so the user never sees stale header vs form ([eventual consistency / read-your-writes](https://oneuptime.com/blog/post/2026-01-30-eventual-consistency-patterns/view)).

**Application to this codebase**

- The **authority** is not one table—it is **the combination of `User` + optional `Candidate`** with explicit **merge precedence**. Treat **`resolveUserProfile`** (or equivalent) as the **single source for display**, not either document alone.

### 3.2 Recommended precedence (field-level)

| Concept | Candidate-linked user | Staff-only (no Candidate) |
|--------|------------------------|-----------------------------|
| Display name | `candidate.fullName` → `user.name` → email | `user.name` → email |
| Email (display) | `user.email` (canonical login) — `candidate.email` should stay in sync via backend; UI reads **`user.email`** unless comparing ATS record | `user.email` |
| Phone | `candidate.phoneNumber` → `user.phoneNumber` | `user.phoneNumber` |
| Country code | `candidate.countryCode` → `user.countryCode` | `user.countryCode` |
| Bio / summary | `candidate.shortBio` → `user.profileSummary` | `user.profileSummary` |
| Avatar | **`user.profilePicture`** for global chrome (header); optional **`candidate.profilePicture`** for ATS-only views if product differs — **default: always prefer `user.profilePicture`** after sync on save | `user.profilePicture` |
| Employee ID | `candidate.employeeId` only | N/A |
| Address | `candidate.address` (structured) | `user.location` (single line) — **not interchangeable**; resolver exposes `locationLine` vs `addressFormatted` separately |
| Role label (UI) | Resolve **`roleIds` → role names** (same as Personal Information / My Profile), **not** legacy `user.role` string | Same |

**Note:** This table must match **My Profile** (`my-profile/page.tsx`) and **Personal Information** after refactor; today My Profile already uses a similar fallback chain for name/phone/bio—formalize it once.

**Gap addressed:** Header (`header.tsx` ~580) uses `user?.name` only for the visible name and **`user?.role`** (legacy string) for the subtitle — it does **not** use `candidate.fullName` or resolved role names from `roleIds`, so **candidates can see a different “display name” in the header vs My Profile** until the resolver is wired into the header.

### 3.3 Frontend: one module, many consumers

- Add **`shared/lib/profile/resolveUserProfile.ts`** (or `hooks/useResolvedProfile.ts`) that:
  - Accepts `User` and `CandidateWithProfile | null`.
  - Returns **stable keys** used by layout + pages (`displayName`, `phoneDisplay`, `avatarUrl`, …).
- **Header / profile dropdown:** use resolved profile for label + avatar.
- **Personal Information:** summary card at top uses same resolver (not duplicate `staffPhone` vs `candidate` logic inline).

### 3.4 Cache / refresh

- After **any** successful profile PATCH, call **`checkAuth()`** / **`refreshUser()`** and, if candidate, **re-fetch `getMeWithCandidate()`** where that state is held—or invalidate a single React Query key if migrated to TanStack Query.
- Ensure **layout** and **page** share the same **AuthProvider** state so header updates without full reload.

### 3.5 Backend

- **Already exists:** `updateUserAndCandidateForMe` syncs `name` → `fullName` and profile picture in a transaction for candidate self-service.
- **Staff PATCH /auth/me** now supports extra **User** fields (phone, location, etc.)—keep **Candidate** and **User** updates consistent when a user has both (e.g. consider syncing phone to both on PATCH if product requires strict equality).

**Optional hardening (phase 2):**

- Server-side **normalization endpoint** `GET /auth/me/profile-resolved` returning the merged shape (one round-trip, no client drift). Useful if mobile or third clients join later.

---

## 4. Implementation Phases

### Phase A — Inventory (no UX change)

- [ ] List every component that shows **name, email, phone, avatar, role, employee ID**.
- [ ] Mark data source: `useAuth().user`, `getMeWithCandidate`, props, or API list rows.
- [ ] Document current mismatches (e.g. header uses `user.name` while My Profile uses `candidate.fullName`).

**Concrete checklist (must not miss chrome):**

| Surface | What to capture |
|---------|-----------------|
| **Header / layout** | `header.tsx` — display name, avatar, **role subtitle** (`user.role` vs `roleIds`), notifications area if it shows a name |
| **Personal Information** | Summary card + forms — staff vs candidate branches |
| **My Profile** | Full merge chain today |
| **Sign-in / post-auth** | Any “Welcome, …” or error surfaces using `user` only |
| **Admin Users** | List row, detail/edit — **other-user** DTO (note: not session resolver) |
| **ATS** | Candidates table, row drawer, **self** row if highlighted |
| **Training / Student** | Any banner or header showing Student name vs User — flag for Phase E |

### Phase B — Resolver + refactor reads

- [ ] Implement `resolveUserProfile` + unit tests (pure function).
- [ ] Replace inline fallbacks in **My Profile**, **Personal Information** summary, **header** (and any other high-traffic components).

### Phase C — Write + refresh consistency

- [ ] After save from Personal Information / My Profile, guarantee **single refresh path** updates auth + candidate state.
- [ ] Verify **Agent + Candidate** and **Administrator** (staff fields only) both show consistent post-save UI.

### Phase D — Optional API

- [ ] Evaluate `GET /auth/me/profile-resolved` if client complexity grows.

### Phase E — Student / Mentor (optional)

- [ ] Only if the same person is shown as **Student** or **Mentor** and **User** on different screens with conflicting labels — extend resolver or add parallel `useTrainingProfile()` (see §10.4, §10.9).

---

## 5. Codebase Touchpoints (from scan)

| Area | File / pattern | Risk |
|------|----------------|------|
| My Profile display | `ats/my-profile/page.tsx` — `candidate?.fullName ?? u?.name` | Good fallback; should delegate to resolver |
| Personal Information | `settings/personal-information/page.tsx` — dual paths (candidate vs staff) | Must align summary + forms with resolver output |
| Auth | `shared/contexts/auth-context.tsx` — `user` from `getMe` | Header uses this; **no `candidate`** in context → header cannot show merged name without extra fetch or lifted state |
| Header / chrome | `shared/layout-components/header/header.tsx` — `user?.name`, `user?.profilePicture`, **`user?.role`** | **High:** name not merged with `candidate.fullName`; role string may not match `roleIds` resolution |
| API | `auth.ts` — `getMe`, `getMeWithCandidate`, `updateMyProfile`, `updateMeWithCandidate` | Canonical refresh targets |
| Settings users (admin) | `settings/users/edit`, `users` list | **Different problem:** displays **other** users by id — not the session resolver; still use one **admin user DTO** shape for list/detail to avoid internal inconsistency |
| ATS candidates table | `ats/candidates/page.tsx` | Shows **Candidate** rows, not “current user merge” — out of scope for `resolveUserProfile` except when row is **self** |
| Training / Student UI | student attendance, etc. | May use **Student** + **User** + **Candidate** — add **Phase E** if same person appears under multiple shapes |

---

## 6. Edge Cases

| Case | Handling |
|------|----------|
| Candidate role loading / null candidate | Block save with message; don’t show mixed stale data |
| Resigned candidate | `getMe` / `getMeWithCandidate` may 403 — UI should not show partial profile |
| Impersonation | Display “viewing as” user; resolver runs on **impersonated** user + candidate |
| Admin edits user in **Users** screen | User list may show different fields than self-profile — resolver should apply only to **current session** user unless admin views “as user” |
| Phone on User vs Candidate | Precedence table; optional server sync to duplicate phone on both |

---

## 7. Acceptance Criteria

1. After changing **name** (or fullName path) in Personal Information or My Profile, **header name** matches within the same session without manual refresh.
2. **Phone / bio** display identically on My Profile and Personal Information **summary** for the same account (per precedence rules).
3. **Staff-only** users: location, education, domains, profile summary appear consistently anywhere those fields are shown (if only on Personal Information today, document “only shown here” to avoid false expectation).
4. **Candidate** users: Employee ID appears wherever product promises (My Profile, ATS row) using same `candidate.employeeId`.
5. No duplicate ad-hoc `candidate?.x ?? user?.y` in new code—only inside resolver.
6. **Header** display name and **role subtitle** match **Personal Information** / **My Profile** for the same session (merged name + **`roleDisplayLabel`** from `roleIds`, not legacy `user.role`).

---

## 8. Research Insights (Consolidated)

**Best practices**

- Centralize merge logic; avoid N copies of fallback chains.
- Refresh canonical state after mutation (read-your-writes).
- Document ownership of each field for PM/engineering alignment.

**Performance**

- Resolver is pure O(1); negligible. Prefer one `getMeWithCandidate` where needed rather than double network calls per page—cache in context or React Query.

**Security / privacy**

- Do not leak **salary** or **visa** fields to components that only need **display name**—resolver can expose **redacted** or **role-scoped** views in a later phase.

**References**

- [Stop Managing Users Manually: Single Source of Truth (Next.js)](https://dev.to/kaigrammm/stop-managing-users-manually-building-a-single-source-of-truth-with-nextjs-6k0)
- [Cross-client consistency (UX patterns)](https://nostr-ux.com/docs/patterns/06-cross-client-consistency/)
- [Read-your-writes / eventual consistency](https://oneuptime.com/blog/post/2026-01-30-eventual-consistency-patterns/view)

---

## 9. Out of Scope (unless product expands)

- Migrating to a literal single DB row for all profile data (large migration).
- Real-time sync across tabs (BroadcastChannel) — nice-to-have.

---

## 10. Gap analysis & fill-ins (second pass)

This section records **known gaps** in the earlier plan and **fills them** with concrete items—still **no implementation code** here.

### 10.1 Bootstrap & data availability gap

| Issue | Detail | Mitigation in plan |
|--------|--------|---------------------|
| **Split fetches** | `AuthProvider` bootstraps with **`GET /auth/me`** only. Pages like My Profile additionally call **`getMeWithCandidate()`** into **local state**, not global context. | **Option A:** Extend auth context with optional `candidate: Candidate \| null` populated when user has candidate profile (single fetch or lazy load). **Option B:** Keep context minimal but pass **resolved profile** from a React Query `['me','with-candidate']` query shared by layout + pages. |
| **Stale header after save** | After `updateMeWithCandidate`, `refreshUser()` refreshes **user**; **candidate** may still live only in page state until re-fetch. | **Single refresh routine:** `refreshUser()` + `queryClient.invalidateQueries(['meWithCandidate'])` or callback to update context `candidate`. Document in Phase C. |

### 10.2 Avatar gap

| Issue | Detail | Mitigation |
|--------|--------|------------|
| Two profile pictures | **User** and **Candidate** each have `profilePicture` in the schema. | **Rule:** Default UI (header, settings) uses **`user.profilePicture`**. Backend already syncs picture in `updateUserAndCandidateForMe` for candidate self-service — **verify** PATCH paths always set both when user uploads from **Settings**. Resolver exposes `avatarUrl` from User only unless product explicitly wants ATS-specific image. |

### 10.3 Role / label gap (header)

- **Header** shows `user?.role` (legacy **string**), while **Personal Information** builds labels from **`roleIds` + `listRoles()`** — **different sources for “what role am I?”**
- **Fill-in:** Resolver should expose **`roleDisplayLabel`** (string) from `roleIds` + role map, matching settings. Header subtitle should use **`roleDisplayLabel`**, not `user.role`.

### 10.4 Student & Mentor (missing from v1 table)

| Persona | Data source for “my training identity” | Plan note |
|---------|----------------------------------------|----------|
| **Student** (no Candidate) | `Student` doc + `User` | Not covered by v1 `resolveUserProfile(user, candidate)` — add **`resolveUserProfile(user, candidate, student?)`** or separate **`useTrainingStudentProfile()`** when consolidating Student attendance / profile with User. |
| **Mentor** | `Mentor` doc + `User` | Same — **Phase E** only if product shows “one profile” across training + mentor screens. |

### 10.5 Email editing gap

- **Non-admin** cannot change email via `PATCH /auth/me`; **candidate** `email` may exist on Candidate document — **precedence for display** is `user.email`; if ATS shows `candidate.email` anywhere, **must** match `user.email` or document exception.

### 10.6 Institutional learnings repo

- **`docs/solutions/`** at the monorepo root does not exist yet — no **project-specific** learnings to merge. **Recommendation:** when the first postmortem is written, add `docs/solutions/README.md` at the **monorepo root** (same level as `uat.dharwin.backend/` and `uat.dharwin.frontend/`); tag entries with `profile`, `auth`, `sso`.

### 10.7 Security / privacy gap (filled)

- Resolver **public API** should expose **two tiers** if needed: **`ResolvedProfilePublic`** (name, avatar, role label) for header vs **`ResolvedProfilePrivate`** (phone, address, visa) for settings — prevents accidental use of sensitive fields in chrome components.

### 10.8 Testing matrix (filled)

| Test | Expected |
|------|----------|
| Unit: `resolveUserProfile` | Given mock `User` + `Candidate`, output matches precedence table (name, phone, bio, avatar). |
| Unit: edge cases | Missing `candidate`, empty strings, hybrid Agent+Candidate. |
| Manual: header vs My Profile | Change name in **Personal Information** → header and **My Profile** show same display name **without reload** (after refresh routine). |
| Manual: role label | Header subtitle matches **Settings** role line for multi-role users. |
| Regression: resigned | `getMeWithCandidate` 403 — no partial merge. |

### 10.9 Phase E (optional — Student/Mentor convergence)

- [ ] Inventory **Student** and **Mentor** profile UIs that show name/phone/email.
- [ ] Decide if same resolver extends with optional `student` / `mentor` or stays candidate-centric.

---

## Next Steps

1. Implement Phase A inventory in a short checklist issue or sub-doc.
2. Implement `resolveUserProfile` + refactor My Profile + header + Personal Information summary.
3. Add manual QA script: “edit name → verify header + My Profile + settings summary.”

---

*This file deepens the intent “improve Personal Information and eliminate discrepancy everywhere” into an actionable, research-grounded plan. No implementation code was written in this document.*
