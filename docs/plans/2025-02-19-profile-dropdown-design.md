# Profile Dropdown (Header) — Design Document

**Date:** 2025-02-19  
**Status:** Approved  
**Approach:** B — Minimal with subtle hierarchy

---

## Goal

Redesign the profile dropdown in the header to be sleeker, with clear visual hierarchy via grouped sections and dividers, while fitting the existing Dharwin UI.

---

## Approach Summary

- No profile card at top
- Flat list grouped by purpose with thin dividers
- Reuse existing hs-dropdown, ti-dropdown, and design tokens
- Keep current width (~11rem) and behavior

---

## Structure & Grouping

**Account section**
- My Profile
- Inbox (if applicable)
- Task Manager (if applicable)
- Settings

**Support section** (optional)
- Support
- Balance (if applicable)

**Log Out**
- Placed at bottom, visually separated by divider

---

## Styling

| Property | Value |
|----------|-------|
| Background | `bg-white` (light), `dark:bg-bodybg2` (dark) |
| Border | `border-defaultborder`, 1px |
| Item padding | `p-[0.65rem]` (match current) |
| Icons | Tabler (`ti ti-*`), opacity 0.7 or `text-defaulttextcolor` |
| Hover | Use existing `ti-dropdown-item` / `list-hover-focus-bg` |
| Log Out | Same row style; optionally `text-danger` for emphasis |
| Width | ~11rem (unchanged) |

---

## Implementation Notes

- Reuse existing `hs-dropdown` / Preline behavior
- No section headers (dividers only)
- Preserve `useAuth()` (user, logout) and `ROUTES`
- Keep avatar trigger and open/close behavior
- Ensure dark mode via Tailwind `dark:` classes

---

## File to Modify

- `uat.dharwin.frontend/shared/layout-components/header/header.tsx`
