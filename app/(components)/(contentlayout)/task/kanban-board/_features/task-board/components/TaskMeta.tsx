"use client";

import React, { memo } from "react";
import styles from "../../../kanban-board.module.css";

export interface TaskMetaProps {
  /** Initials or short labels */
  avatars?: string[];
  dueLabel?: string | null;
  commentsCount?: number;
  attachmentsCount?: number;
  className?: string;
}

export const TaskMeta = memo(function TaskMeta({
  avatars = [],
  dueLabel,
  commentsCount,
  attachmentsCount,
  className,
}: TaskMetaProps): React.JSX.Element | null {
  const showMeta =
    avatars.length > 0 ||
    !!dueLabel ||
    (commentsCount ?? 0) > 0 ||
    (attachmentsCount ?? 0) > 0;

  if (!showMeta) return null;

  return (
    <div className={`${styles.kbMetaRow} ${className ?? ""}`}>
      {avatars.length > 0 && (
        <div className={styles.kbAvatarStack} aria-label="Assignees">
          {avatars.slice(0, 4).map((a, i) => (
            <span key={`${a}-${i}`} className={styles.kbAvatar}>
              {a.slice(0, 2).toUpperCase()}
            </span>
          ))}
        </div>
      )}
      {dueLabel ? (
        <span className="inline-flex items-center gap-1">
          <i className="ri-calendar-event-line" aria-hidden />
          <span>{dueLabel}</span>
        </span>
      ) : null}
      {(commentsCount ?? 0) > 0 ? (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <i className="ri-chat-3-line" aria-hidden />
          {commentsCount}
        </span>
      ) : null}
      {(attachmentsCount ?? 0) > 0 ? (
        <span className="inline-flex items-center gap-1 tabular-nums">
          <i className="ri-attachment-2" aria-hidden />
          {attachmentsCount}
        </span>
      ) : null}
    </div>
  );
});
