# Changelog

## [Unreleased]

### Added — Task Board V2 (flag-gated: `taskboard-v2`)
- Modular `/task/kanban-board` rewrite under `_features/task-board/`:
  - Split context providers (filters, data, UI, selection, realtime stub) and 21 components.
  - `@dnd-kit` for drag-and-drop with announcements, drag overlay ghost, and optimistic rollback.
  - `@tanstack/react-virtual` per-column virtualization with safe-mode fallback for low-perf devices.
  - URL-synced filter state (debounced) + localStorage saved views (local-only adapter; backend in P3).
  - Drawer-based create/edit, list view toggle, density (compact/comfortable), bulk-action scaffold.
  - Hard-corner board-scoped CSS (`kanban-board.module.css`) with density tokens, responsive 1→2→5 grid, dark-mode, RTL, reduced-motion, and forced-colors support.
  - Inter / Plus Jakarta Sans / Syne typography via `next/font/google` scoped to board.
- Shared `useFeatureFlag` hook (`shared/hooks/useFeatureFlag.ts`) with sync session-cache + background revalidation + env default.
- Telemetry: `taskboard.viewed` (tagged `boardVersion: v1|v2`), `filter_applied`, `view_saved/loaded`, `task_created`, `task_status_changed`, `density_changed`, `list_view_toggled`, `optimistic_rollback`, `mutation_failed`, `localStorage_unavailable`, `feature_flag_fetch_failed`, `url_param_invalid`, `first_drag`.
- Performance marks: `taskboard.first_paint`, `taskboard.first_interactive`, `taskboard.first_drag`.
- Accessibility: skip links, `role="grid"`, drag announcements (throttled), keyboard shortcuts (`n` new, `/` focus search, `Esc` close drawer), WCAG 2.2 AA target.
- Tests: Vitest unit (`npm run test:taskboard` with coverage), Playwright E2E (`npm run e2e:taskboard` — load, scenarios, a11y, memory-leak), Lighthouse CI (`npm run lhci:taskboard`), bundle budget (`scripts/check-taskboard-bundle.mjs`).
- Tooling: `scripts/verify-legacy-deps.mjs` checks that `dragula` / `react-perfect-scrollbar` only live under `_legacy/`.

### Changed
- `/task/kanban-board/page.tsx` is now a 14-line flag-gated shell that dynamically loads `_legacy/KanbanBoardV1` or `_features/task-board/TaskBoardPage`.
- V1 implementation preserved verbatim under `_legacy/` with isolated `v1-styles.module.css`; V1 now also emits `taskboard.viewed` tagged `boardVersion: "v1"` for rollout comparison.

### Retained (until V2 default in production)
- `dragula`, `react-perfect-scrollbar` — referenced only from `_legacy/`. Removal queued for the P1-default rollout cut.

