"use client";

import React from "react";
import styles from "../../../kanban-board.module.css";

export interface TaskFilterPillProps {
  label: string;
  active?: boolean;
  iconClass: string;
  onClick: () => void;
}

export function TaskFilterPill({
  label,
  active,
  iconClass,
  onClick,
}: TaskFilterPillProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${styles.kbFilterPill} ${active ? styles.kbFilterPillActive : ""}`}
    >
      <i className={iconClass} aria-hidden />
      {label}
    </button>
  );
}
