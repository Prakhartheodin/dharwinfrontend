# Task board V2 (`/task/kanban-board`)

Enable with `NEXT_PUBLIC_TASKBOARD_V2=true` (see `.env.example`). The route still renders **V1** (`KanbanBoardV1`) when the flag is off.

## What V2 includes

- **Data**: `listTasks`, `listProjects`, `listUsers` — same query shape as V1 (limit 200, search, optional `projectId`, `assignedToMe`).
- **Filters & URL**: `q`, `project`, `assignedToMe=1` stay in sync with the address bar (debounced search).
- **Drag & drop**: `@dnd-kit/core` moves tasks between columns; persists via `updateTaskStatus` and refetches.
- **UI parity**: Reuses `KanbanTaskCard`, V1 column styles (`v1-styles.module.css`), add/edit modals, `TaskDetailModal`, permissions, `editTaskId` query handling, `PM_DATA_MUTATED_EVENT` / `emitPmDataMutated` after writes.
- **Extras**: Optional **compact** density (`data-density`, persisted under `taskboard:v2:density:<userId>`).

## File map

| Path | Role |
|------|------|
| `page.tsx` | Feature flag: V1 vs `TaskBoardPage` |
| `_features/task-board/TaskBoardPage.tsx` | Hydration gate, fonts, error boundary, provider root |
| `_features/task-board/TaskBoardShell.tsx` | Toolbar + board/list switch + bulk bar + drawer |
| `_features/task-board/providers/*` | Filters, data, UI, selection, realtime stub |
| `_features/task-board/components/*` | TaskBoard, TaskColumn, TaskCard, TaskFilters, TaskDrawer, SavedViewsMenu, … |
| `_features/task-board/hooks/*` | DnD, virtualization, keyboard, saved views, telemetry |
| `_features/task-board/lib/*` | constants, url-state, safe-storage, errors, filter-predicates, telemetry, toast |
| `_features/task-board/types.ts` | Filters, SavedView, OptimisticPatch, RealtimeEvent |
| `_legacy/KanbanBoardV1.tsx` | Legacy board when flag off |

## Tests

- `npm run test:taskboard` — Vitest + coverage
- `npm run e2e:taskboard` — Playwright (load, scenarios, a11y, memory-leak)
- `npm run lhci:taskboard` — Lighthouse CI
- `npm run verify:legacy-deps` — guards `dragula` / `react-perfect-scrollbar` against re-entering V2

## Follow-ups (P2–P4)

- Backend-persisted saved views (P3) — current adapter is localStorage-only.
- WebSocket realtime updates (P4) — `TaskRealtimeProvider` is a noop in P1.
- Per-task drag reordering within a column (P3).
