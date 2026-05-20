"use client";

import React from "react";
import { useTaskUI } from "../hooks/useTaskUI";
import { trackTaskBoard } from "../lib/telemetry";
import styles from "../../../kanban-board.module.css";

export function ViewToggle(): React.JSX.Element {
  const { viewMode, setViewMode } = useTaskUI();
  return (
    <div className="inline-flex rounded-full border border-slate-200 p-0.5 dark:border-white/10">
      <button
        type="button"
        className={`${styles.kbToggleBtn} ${viewMode === "board" ? styles.kbToggleBtnActive : "!rounded-full !border-0"}`}
        aria-pressed={viewMode === "board"}
        onClick={() => { setViewMode("board"); trackTaskBoard("taskboard.list_view_toggled", { view: "board" }); }}
      >
        <i className="ri-layout-column-line" aria-hidden />
        Board
      </button>
      <button
        type="button"
        className={`${styles.kbToggleBtn} ${viewMode === "list" ? styles.kbToggleBtnActive : "!rounded-full !border-0"}`}
        aria-pressed={viewMode === "list"}
        onClick={() => { setViewMode("list"); trackTaskBoard("taskboard.list_view_toggled", { view: "list" }); }}
      >
        <i className="ri-list-check" aria-hidden />
        List
      </button>
    </div>
  );
}
