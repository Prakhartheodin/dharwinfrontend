"use client";

import React, { useEffect, useState } from "react";
import { Plus_Jakarta_Sans, Syne } from "next/font/google";
import { TaskBoardErrorBoundary } from "./TaskBoardErrorBoundary";
import { BoardSkeletonSSR } from "./BoardSkeletonSSR";
import { TaskBoardProvider } from "./providers/TaskBoardProvider";
import { TaskBoardShell } from "./TaskBoardShell";
import { SkipLinks } from "./components/SkipLinks";
import styles from "../../kanban-board.module.css";

const kbSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--kb-font-body",
  display: "swap",
});
const kbDisplay = Syne({
  subsets: ["latin"],
  variable: "--kb-font-display",
  weight: ["600", "700", "800"],
  display: "swap",
});

function BoardLoadFailed({ onReload }: { onReload: () => void }): React.JSX.Element {
  return (
    <div role="alert" style={{ padding: "2rem", textAlign: "center" }}>
      <h2 className="mb-3 text-lg font-semibold">Board failed to load.</h2>
      <button type="button" className="ti-btn ti-btn-primary" onClick={onReload}>
        Reload
      </button>
    </div>
  );
}

export default function TaskBoardPage(): React.JSX.Element {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return <BoardSkeletonSSR />;
  }

  return (
    <TaskBoardErrorBoundary
      fallback={<BoardLoadFailed onReload={() => globalThis.location?.reload()} />}
    >
      <div className={`${kbSans.variable} ${kbDisplay.variable}`}>
        <main
          aria-label="Task board"
          className={styles.kbRoot}
          data-kb-root
          data-density="comfortable"
          data-low-perf="false"
        >
          <SkipLinks />
          <TaskBoardProvider>
            <TaskBoardShell />
          </TaskBoardProvider>
        </main>
      </div>
    </TaskBoardErrorBoundary>
  );
}
