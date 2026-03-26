# Profile Dropdown (Minimal Hierarchy) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the header profile dropdown to use Approach B (minimal with subtle hierarchy): grouped sections with dividers, no profile card, cleaner visual structure.

**Architecture:** Modify the existing profile dropdown markup in `header.tsx`. Reorganize `<li>` items into logical groups (Account, Support, Log Out) and add `<div>` dividers between groups. Reuse existing hs-dropdown/ti-dropdown classes; add divider styles via Tailwind.

**Tech Stack:** React, Next.js, Tailwind CSS, Preline (hs-dropdown), Tabler icons

**Design reference:** `docs/plans/2025-02-19-profile-dropdown-design.md`

---

## Task 1: Add dividers between profile dropdown groups

**Files:**
- Modify: `uat.dharwin.frontend/shared/layout-components/header/header.tsx` (profile dropdown region, ~lines 382–410)

**Step 1: Locate the profile dropdown markup**

Find the `<ul>` inside the dropdown with id `dropdown-profile`. It currently contains all items in a flat list.

**Step 2: Wrap items in groups and add dividers**

- **Account group:** My Profile, Inbox, Task Manager, Settings
- **Divider:** `<div className="border-t border-defaultborder my-1" />`
- **Support group:** Balance (or remove if placeholder), Support
- **Divider:** `<div className="border-t border-defaultborder my-1" />`
- **Log Out:** Single item at bottom

Replace the flat `<ul><li>...</li></ul>` structure with grouped structure. Keep each `<li>` as `ti-dropdown-item` with same padding and icons.

**Step 3: Verify dark mode**

Ensure `border-defaultborder` works in dark mode (project uses `dark:` class on root). If needed, add `dark:border-defaultborder/50` or similar.

**Step 4: Manually test**

1. Run `npm run dev` in `uat.dharwin.frontend`
2. Open app, click profile avatar in header
3. Confirm dropdown opens, groups are visually separated, hover states work
4. Toggle dark mode, confirm dividers visible

**Step 5: Commit**

```bash
cd uat.dharwin.frontend
git add shared/layout-components/header/header.tsx docs/plans/
git commit -m "feat(header): add minimal hierarchy to profile dropdown with grouped sections"
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2025-02-19-profile-dropdown.md`.

**Execution options:**

1. **Subagent-driven (this session)** — Dispatch a subagent per task, review between tasks, fast iteration.
2. **Manual (you implement)** — Follow the plan steps in order.

Which approach do you prefer?
