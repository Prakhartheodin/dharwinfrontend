# ATS Workflow Stabilization Session - 2026-05-21

## Context

This note captures the current state of the ATS workflow stabilization effort so work can resume tomorrow without re-discovery.

Scope requested:
- workflow orchestration stabilization
- backend architecture cleanup
- candidate workflow integration
- notification reliability hardening
- status normalization

Phase completed today: **Phase 1 - Architecture Inspection (no implementation edits for this initiative yet)**.

---

## High-Level Findings

### 1) Workflow logic is distributed, not orchestrated

ATS state mutations are spread across:
- meetings
- job applications
- offers
- placements
- schedulers

Only placement currently has a strong transition graph and gate checks.

### 2) Recruiter trust boundary is still weak

- UI removed manual recruiter picker in interview create/edit.
- Backend still accepts recruiter-like payload fields and persists snapshots.
- Server-side authoritative derivation is not fully enforced in one central path.

### 3) Notification reliability is inconsistent

Major issues identified:
- notification type mismatches in emitters vs enum (`placement` vs `placement_update`, `application` vs `job_application`)
- multiple silent `.catch(() => {})` paths
- trigger coverage varies by mutation path
- no unified changed-only dedupe policy across all workflow events

### 4) Candidate interview visibility is only partial

My Applications currently shows status progression but not consistently actionable interview details end-to-end (time/timezone/link/cancelled context path is incomplete).

### 5) Status duplication/drift exists across backend + frontend

Examples:
- offer status drift (`Active` inconsistency)
- application status subset drift in some UI maps/analytics/helper paths (`Shortlisted` handling inconsistency)
- multiple local constants/maps with overlapping semantics

### 6) Candidate-facing status mapping is not centralized

- No universal API-boundary mapper (`toCandidateStatus`) currently applied across candidate surfaces and candidate-facing notification copy.

---

## Current Architecture Snapshot

Canonical flow target:

Interview -> Offer -> Pre-Boarding -> Onboarding

Current implementation reality:
- meeting `interviewResult` and meeting `status` are separate from job-application pipeline status
- offer acceptance is a major side-effect boundary (placement creation / updates)
- placement has strongest transition validation
- application pipeline can still be patched more freely than desired

---

## Risks (Prioritized)

### P0 (blockers)
1. Backend still allows recruiter-related payload trust in paths where derivation should be server-controlled.
2. Notification enum mismatch + silent catches can drop production notifications.
3. Workflow mutation logic is not centralized, so behavior differs by entry point.

### P1
1. Candidate interview UX not fully actionable in candidate workflow surfaces.
2. Transition validation is inconsistent across entities (placement strong, others weaker).

### P2
1. Enum duplication creates drift risk.
2. Internal labels can leak to candidate surfaces due to missing centralized mapping layer.

---

## Migration and Backward Compatibility Constraints

1. Existing records contain legacy/embedded values and denormalized snapshots.
2. Existing clients may still send older payload shapes; rollout should be additive then restrictive.
3. Notification type normalization must preserve historical records.
4. Meeting linkage changes should be additive first to avoid breakage.
5. Candidate mapping should add `candidateStatus` while preserving internal status for admin and analytics consumers.

---

## Agreed Implementation Order (Next Session)

1. **Phase 2**: Centralize workflow constants (`backend/src/constants/atsPipeline.js`)
2. **Phase 3**: Add orchestrator (`backend/src/services/workflowOrchestrator.service.js`)
3. **Phase 4**: Recruiter derivation hardening (server authoritative, no payload trust)
4. **Phase 6**: Central transition validation for application + offer (placement parity)
5. **Phase 7**: Candidate status mapping at API boundary (`toCandidateStatus`)
6. **Phase 5**: Candidate interview architecture (`GET /v1/meetings/my-interviews` + UI cards)
7. **Phase 8**: Notification reliability hardening
8. **Phase 9**: Remove dead/stale states and route/status drift
9. **Phase 10**: End-to-end tests for orchestrated flow

---

## Concrete Tomorrow Start Checklist

1. Create `backend/src/constants/atsPipeline.js` with:
   - `APPLICATION_STATUSES`
   - `INTERVIEW_STATUSES`
   - `OFFER_STATUSES`
   - `PLACEMENT_STATUSES`
   - `ALLOWED_TRANSITIONS`
   - `CANDIDATE_STATUS_MAP`
2. Replace obvious duplicated status arrays in backend services/validators with imports from the new constants.
3. Add initial tests verifying constants and transition tables.
4. Do not switch behavior yet until compatibility checks are in place.

---

## Session Notes

- This handoff intentionally captures architecture and sequencing, not rushed edits.
- Keep changes incremental and test-backed phase by phase.
- Avoid frontend-only patches for workflow integrity items.
