# Candidate → Employee — implementation inventory (rolling)

**Generated:** 2026-04-22. **Scope:** no DB mutations; Phase A routes + copy (partial) + Phase B API alias and clients.

## Backend (`uat.dharwin.backend`)

| Area | File / path | Phase |
|------|-------------|--------|
| Express | `src/routes/v1/index.js` — `path: '/employees'` mounts same `candidateRoute` as `/candidates` | B |
| Hot spots (later / Phase C) | `candidate.service.js`, `candidate.model.js`, `config/permissions.js` | C |

## Frontend — routes & constants

| Item | Path | Phase |
|------|------|--------|
| Canonical ATS list | `app/.../ats/employees/**` (moved from `ats/candidates`) | A |
| Redirects | `next.config.js` — `/ats/candidates` → `/ats/employees` | A |
| `ROUTES` | `shared/lib/constants.ts` — `atsEmployees`, `atsCandidates` (alias) | A |
| Permission map | `shared/lib/route-permissions.ts` — `/ats/employees` + legacy `/ats/candidates` | A |

## Frontend — API (Phase B)

| Module | Notes |
|--------|--------|
| `shared/lib/api/candidates.ts` | REST paths use `/employees` (alias on backend) |
| `shared/lib/api/candidateSop.ts` | idem |
| `shared/lib/api/attendance.ts` | `GET .../employees/:id/attendance` |
| `shared/lib/api/client.ts` | Download URL rewrite accepts `/v1/employees/...` |

## Cross-links still saying “candidate” in code (intentional for now)

- Module/file names: `candidates.ts`, `CandidateListItem`, hooks `use-is-candidate`, component names `Candidate*`.
- Settings path: `settings/candidates/sop` (not renamed in this tranche).
- `candidateId` in JSON and query params unchanged.

## PM / attendance / dashboard (touched for URLs only)

- `dashboard/page.tsx`, `ats/onboarding|pre-boarding`, `project-management/teams`, `settings/.../sop`, `training/courses`, `JobPreviewPanel`, etc. — link targets updated to `/ats/employees/...` where they pointed at ATS.
