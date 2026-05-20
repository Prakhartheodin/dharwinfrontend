"use client";

import React from "react";
import styles from "../../../kanban-board.module.css";

export interface TaskFilterChipProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function TaskFilterChip({
  label,
  active,
  onClick,
}: TaskFilterChipProps): React.JSX.Element {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`${styles.kbFilterChip} ${active ? styles.kbFilterChipActive : ""}`}
    >
      {label}
    </button>
  );
}
