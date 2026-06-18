"use client";

import React from "react";
import { useTaskUI } from "../hooks/useTaskUI";
import { trackTaskBoard } from "../lib/telemetry";

export function DensityToggle(): React.JSX.Element {
  const { density, setDensity } = useTaskUI();
  const comfortable = density === "comfortable";
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 transition hover:border-slate-900 hover:text-slate-900 dark:border-white/10 dark:bg-bodybg2 dark:text-slate-300 dark:hover:border-white dark:hover:text-white"
      onClick={() => {
        const next = comfortable ? "compact" : "comfortable";
        setDensity(next);
        trackTaskBoard("taskboard.density_changed", { density: next });
      }}
      aria-label={comfortable ? "Switch to compact density" : "Switch to comfortable density"}
    >
      {comfortable ? "Compact" : "Comfortable"}
    </button>
  );
}
