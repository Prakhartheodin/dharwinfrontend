"use client";

import React from "react";
import styles from "../../../kanban-board.module.css";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  title = "Nothing here yet",
  description,
  action,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div className={styles.kbEmptyState}>
      <p className="max-w-[14rem] leading-relaxed">{title}</p>
      {description ? (
        <p className="max-w-[16rem] text-[0.75rem] leading-relaxed opacity-90">
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}
