"use client";

import React from "react";
import styles from "../../../kanban-board.module.css";

export function SkipLinks(): React.JSX.Element {
  return (
    <div className={styles.kbSkipLinks}>
      <a className={styles.kbSkipLink} href="#task-board-main">
        Skip to board
      </a>
      <a className={styles.kbSkipLink} href="#task-board-filters">
        Skip to filters
      </a>
    </div>
  );
}
