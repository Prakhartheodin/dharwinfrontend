"use client";

import React from "react";
import styles from "../../../kanban-board.module.css";

export function DnDInstructions(): React.JSX.Element {
  return (
    <div id="dnd-instructions" className={styles.kbDndInstructions}>
      Press Space to pick up a task. Use arrow keys to move. Space to drop.
      Escape to cancel. Press N to create a new task. Press slash to search.
      Press left bracket for previous page or right bracket for next page.
    </div>
  );
}
