"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * react-select renders its control + menu with emotion inline styles in a body portal, so the
 * app's CSS `.dark` rules can't reach it. This hook returns a dark-aware `styles` object (and the
 * body portal target) so the PM/task-board selects match the app theme. The MutationObserver keeps
 * it correct if the user toggles theme while a drawer/menu is open.
 *
 * @param zIndex menu/menuPortal stacking — match the host overlay (drawers use higher values).
 */
export function usePmReactSelectStyles(zIndex = 9999) {
  const menuPortalTarget = useMemo(
    () => (typeof window === "undefined" ? null : document.body),
    []
  );

  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains("dark"));
    update();
    const obs = new MutationObserver(update);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const styles = useMemo(() => {
    const portal = {
      menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex }),
      menu: (base: Record<string, unknown>) => ({ ...base, zIndex }),
    };
    if (!isDark) return portal;
    return {
      menuPortal: (base: Record<string, unknown>) => ({ ...base, zIndex }),
      menu: (base: Record<string, unknown>) => ({
        ...base,
        zIndex,
        background: "#1e293b",
        border: "1px solid rgba(148, 163, 184, 0.22)",
      }),
      control: (base: Record<string, unknown>, state: { isFocused: boolean }) => ({
        ...base,
        background: "rgba(15, 23, 42, 0.55)",
        borderColor: state.isFocused ? "#6366f1" : "rgba(148, 163, 184, 0.25)",
        boxShadow: "none",
      }),
      singleValue: (base: Record<string, unknown>) => ({ ...base, color: "#e2e8f0" }),
      input: (base: Record<string, unknown>) => ({ ...base, color: "#e2e8f0" }),
      placeholder: (base: Record<string, unknown>) => ({ ...base, color: "#94a3b8" }),
      multiValue: (base: Record<string, unknown>) => ({
        ...base,
        background: "rgba(99, 102, 241, 0.22)",
      }),
      multiValueLabel: (base: Record<string, unknown>) => ({ ...base, color: "#e2e8f0" }),
      option: (
        base: Record<string, unknown>,
        state: { isSelected: boolean; isFocused: boolean }
      ) => ({
        ...base,
        background: state.isSelected
          ? "rgba(99, 102, 241, 0.35)"
          : state.isFocused
            ? "rgba(148, 163, 184, 0.15)"
            : "transparent",
        color: "#e2e8f0",
      }),
    };
  }, [isDark, zIndex]);

  return { menuPortalTarget, styles };
}
