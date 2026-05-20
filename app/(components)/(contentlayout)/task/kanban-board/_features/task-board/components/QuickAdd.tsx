"use client";

import React from "react";
import styles from "../../../kanban-board.module.css";

export interface QuickAddProps {
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
}

export function QuickAdd({
  label = "Quick add",
  onClick,
  disabled,
}: QuickAddProps): React.JSX.Element {
  return (
    <button
      type="button"
      className={styles.kbQuickAdd}
      onClick={onClick}
      disabled={disabled}
    >
      <i className="ri-add-line" aria-hidden />
      {label}
    </button>
  );
}
