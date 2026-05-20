# Task board (`_features/task-board`)

Modular kanban task board for `/task/kanban-board`. V1 (`KanbanBoardV1`) was removed; this module is the only implementation.

## Layout

- `TaskBoardPage.tsx` — hydration gate, error boundary, font variables, provider root
- `TaskBoardShell.tsx` — toolbar, board/list, bulk bar, drawer wiring
- `providers/` — filters (URL + localStorage), UI state, data fetching, selection, realtime stub
- `components/` — board columns, cards, filters, saved views, drawer CRUD
- `hooks/` — DnD, virtualization, keyboard, telemetry, saved views
- `lib/` — URL state, filter predicates, errors, toast, safe storage

## Running locally

```bash
cd uat.dharwin.frontend
npm run dev
# http://localhost:3001/task/kanban-board
```

## Tests

```bash
npm run test:taskboard
npm run e2e:taskboard
```

Covers URL filter serialization, client filter predicates, and board shell behavior.

## P1 completion notes

- **F/G/H/I/J** implemented per plan (see `docs/superpowers/specs/taskboard-manual-a11y-signoff.md` for manual SR/HC checks).
- **Tests:** `npm run test:taskboard` (coverage), `npm run e2e:taskboard` (Playwright), `npm run lhci:taskboard`.
