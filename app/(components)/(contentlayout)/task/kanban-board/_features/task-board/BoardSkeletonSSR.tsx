import React from "react";
import styles from "../../kanban-board.module.css";

export function BoardSkeletonSSR(): React.JSX.Element {
  return (
    <div
      className={styles.kbRoot}
      data-density="compact"
      data-low-perf="false"
      aria-busy="true"
      aria-label="Loading task board"
    >
      <div className={styles.kbToolbarPlaceholder} />
      <div className={styles.kbBoard}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.kbColumnSkeleton}>
            <div className={styles.kbSkeletonLine} style={{ width: "42%" }} />
            <div className={styles.kbSkeletonCard} />
            <div className={styles.kbSkeletonCard} />
            <div className={styles.kbSkeletonCard} />
          </div>
        ))}
      </div>
    </div>
  );
}
