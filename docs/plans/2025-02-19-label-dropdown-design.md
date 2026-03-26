# Label Dropdown (Email) — Design Document

**Date:** 2025-02-19  
**Status:** Approved  
**Approach:** 2 — Minimal + Visual Refresh

---

## Goal

Improve the label dropdown UI so it feels less cramped and more clear: better spacing, typography, and interactions, with a collapsed "Create label" section.

---

## Approach Summary

- Collapsed "+ Create label" row that expands on click
- Light background for the create section (or clear border)
- Clearer hover/focus states on list items
- Optional: small icon tweaks for applied vs not applied
- Keep the scrollable label list as-is (no search/grouping)

---

## Structure & Layout

1. **Apply label** — Section header
2. **Label list** — Scrollable list, unchanged behavior; improved spacing and tap targets
3. **Create section** — Collapsed by default; "+ Create label" row expands to show input + Create button on click

---

## Styling

| Area | Changes |
|------|---------|
| Dropdown | More padding; clearer divider between list and create section |
| Label items | Larger touch targets (`py-2.5` or similar); clearer hover (`hover:bg-primary/5`) |
| Create section | Light background (`bg-light` / `dark:bg-black/5`) or clear border |
| Icons | Applied: `ri-check-line text-primary`; Not applied: `ri-add-line` with muted color |
| Create row (collapsed) | "+" icon, "Create label" text; matches other dropdown item style |

---

## Interaction

- Click "+ Create label" → expand to show input + Create button
- Enter name + Create → create label, optionally apply to current message, collapse section
- Escape or click outside → close dropdown (existing behavior)

---

## File to Modify

- `uat.dharwin.frontend/app/(components)/(contentlayout)/communication/email/page.tsx`
