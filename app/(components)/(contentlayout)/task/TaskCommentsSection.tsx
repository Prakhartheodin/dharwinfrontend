"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  getTaskComments,
  addTaskComment,
  type TaskComment,
} from "@/shared/lib/api/tasks";

/** Show expand + clamp in list when comment is long enough to feel cramped. */
const COMMENT_POPOUT_THRESHOLD = 200;

export interface TaskCommentsSectionProps {
  taskId: string;
  initialComments?: TaskComment[];
  /** Called after a comment is added; parent can refetch task to update commentsCount */
  onCommentAdded?: () => void;
}

function formatCommentDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const datePart = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timePart = d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

export function TaskCommentsSection({
  taskId,
  initialComments = [],
  onCommentAdded,
}: TaskCommentsSectionProps) {
  const [comments, setComments] = useState<TaskComment[]>(initialComments ?? []);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [popoutComment, setPopoutComment] = useState<TaskComment | null>(null);
  const popoutCloseRef = useRef<HTMLButtonElement>(null);
  const focusBeforePopoutRef = useRef<HTMLElement | null>(null);

  const closePopout = useCallback(() => {
    setPopoutComment(null);
    requestAnimationFrame(() => {
      focusBeforePopoutRef.current?.focus?.();
      focusBeforePopoutRef.current = null;
    });
  }, []);

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    getTaskComments(taskId)
      .then(setComments)
      .catch(() => setError("Failed to load comments."))
      .finally(() => setLoading(false));
  }, [taskId]);

  useEffect(() => {
    if (!popoutComment) return;
    focusBeforePopoutRef.current = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => popoutCloseRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      closePopout();
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [popoutComment, closePopout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || adding) return;
    setAdding(true);
    setError(null);
    try {
      const newComment = await addTaskComment(taskId, trimmed);
      setComments((prev) => [...prev, newComment]);
      setContent("");
      onCommentAdded?.();
    } catch {
      setError("Failed to add comment.");
    } finally {
      setAdding(false);
    }
  };

  const popoutAuthor =
    popoutComment?.commentedBy?.name ?? popoutComment?.commentedBy?.email ?? "Unknown";
  const popoutDomSuffix =
    popoutComment?._id ?? (popoutComment as TaskComment & { id?: string })?.id ?? "comment";

  return (
    <div className="mt-0">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted dark:text-white/45">
          Comments
        </div>
        <div className="rounded-full bg-primary/[0.08] px-2 py-0.5 text-[0.69rem] font-semibold text-primary dark:bg-primary/20">
          {comments.length}
        </div>
      </div>
      {error ? <div className="mb-2 text-[0.8125rem] text-danger">{error}</div> : null}
      {loading ? (
        <div className="space-y-2 py-1.5" role="status" aria-label="Loading comments">
          <div className="h-3 w-3/4 max-w-[12rem] rounded-md bg-defaultborder/45 motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="h-3 w-full max-w-[18rem] rounded-md bg-defaultborder/35 motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="h-3 w-[88%] max-w-[22rem] rounded-md bg-defaultborder/30 motion-safe:animate-pulse motion-reduce:animate-none" />
        </div>
      ) : (
        <div className="mb-3 max-h-52 space-y-2.5 overflow-y-auto pe-0.5">
          {comments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-defaultborder/60 bg-gradient-to-br from-defaultbackground/70 to-defaultbackground/40 px-3 py-2.5 text-[0.8125rem] leading-snug text-muted dark:border-white/10 dark:from-white/[0.03] dark:to-white/[0.01] dark:text-white/50">
              No comments yet — be the first to leave a note.
            </div>
          ) : (
            comments.map((c) => {
              const long = (c.content?.length ?? 0) > COMMENT_POPOUT_THRESHOLD;
              return (
              <div
                key={c._id ?? (c as TaskComment & { id?: string }).id ?? c.content}
                className="rounded-xl border border-defaultborder/55 bg-gradient-to-br from-white to-defaultbackground/60 p-3 text-[0.8125rem] shadow-sm transition-[transform,box-shadow,border-color] duration-200 motion-safe:animate-pm-panel-in hover:-translate-y-[1px] hover:border-primary/25 hover:shadow-md dark:border-white/10 dark:from-white/[0.05] dark:to-white/[0.025]"
              >
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-start gap-2.5">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/[0.12] text-[0.72rem] font-bold text-primary">
                      {(c.commentedBy?.name ?? c.commentedBy?.email ?? "U").trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-[0.8rem] font-semibold text-defaulttextcolor">
                        {c.commentedBy?.name ?? c.commentedBy?.email ?? "Unknown"}
                      </div>
                      <div className="text-[0.72rem] text-muted dark:text-white/45">
                        {formatCommentDate(c.createdAt)}
                      </div>
                    </div>
                  </div>
                  {long ? (
                    <button
                      type="button"
                      className="ti-btn ti-btn-light !mb-0 shrink-0 !rounded-lg !py-1 !px-2 text-defaulttextcolor transition-transform duration-150 hover:border-primary/30 hover:text-primary active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
                      aria-label="Open comment in full view"
                      title="Expand to read"
                      onClick={() => setPopoutComment(c)}
                    >
                      <i className="ri-fullscreen-line text-[1.05rem]" aria-hidden />
                    </button>
                  ) : null}
                </div>
                <p
                  className={`mb-0 whitespace-pre-wrap break-words text-[0.82rem] leading-relaxed text-defaulttextcolor/90 ${long ? "line-clamp-8" : ""}`}
                  style={{ overflowWrap: "anywhere" }}
                >
                  {c.content}
                </p>
              </div>
            );
            })
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="rounded-xl border border-defaultborder/60 bg-white/90 p-2 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
        <textarea
          id={`task-comment-input-${taskId}`}
          aria-label="Add comment"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment…"
          maxLength={2000}
          rows={2}
          className="form-control min-h-[4.25rem] max-h-36 w-full resize-none overflow-y-auto !rounded-lg !border-defaultborder/70 !bg-transparent !px-3 !py-2.5 !text-[0.8125rem] leading-relaxed shadow-none transition-[border-color,box-shadow] duration-200 focus:!border-primary/45 focus:!ring-2 focus:!ring-primary/15 dark:!border-white/10 dark:focus:!border-primary/35"
          disabled={adding}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[0.72rem] text-muted dark:text-white/45">
            {content.length}/2000
          </span>
          <button
            type="submit"
            className="ti-btn ti-btn-primary flex min-h-[2.35rem] shrink-0 items-center justify-center !rounded-lg !px-4 !py-0 !text-[0.8125rem] font-semibold transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:!min-w-[6rem]"
            disabled={adding || !content.trim()}
          >
            {adding ? (
              <>
                <i className="ri-loader-4-line me-1 inline-block animate-spin motion-reduce:animate-none" aria-hidden />
                Posting
              </>
            ) : (
              "Post"
            )}
          </button>
        </div>
      </form>

      {popoutComment && typeof document !== "undefined"
        ? createPortal(
            <div
              role="presentation"
              className="fixed inset-0 z-[140] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px] motion-safe:transition-opacity motion-reduce:backdrop-blur-none"
              onClick={closePopout}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`comment-popout-title-${taskId}-${popoutDomSuffix}`}
                className="flex max-h-[88vh] w-[96vw] max-w-3xl flex-col overflow-hidden rounded-2xl border border-defaultborder/80 bg-bodybg shadow-2xl motion-safe:animate-pm-panel-in motion-reduce:animate-none dark:border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-defaultborder/60 bg-gradient-to-r from-slate-50/90 to-white px-4 py-3 dark:border-white/10 dark:from-white/[0.04] dark:to-transparent sm:px-5">
                  <div className="min-w-0 pr-2">
                    <div
                      id={`comment-popout-title-${taskId}-${popoutDomSuffix}`}
                      className="truncate text-[0.95rem] font-semibold text-defaulttextcolor"
                    >
                      Comment
                    </div>
                    <div className="truncate text-[0.78rem] text-muted dark:text-white/50">
                      {popoutAuthor} · {formatCommentDate(popoutComment.createdAt)}
                    </div>
                  </div>
                  <button
                    ref={popoutCloseRef}
                    type="button"
                    className="ti-btn ti-btn-light !mb-0 shrink-0 !rounded-lg !py-1.5 !px-2.5"
                    onClick={closePopout}
                    aria-label="Close expanded comment"
                  >
                    <i className="ri-close-line text-lg" aria-hidden />
                  </button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
                  <pre
                    className="m-0 whitespace-pre-wrap break-words font-sans text-[0.875rem] leading-relaxed text-defaulttextcolor/95"
                    style={{ overflowWrap: "anywhere" }}
                  >
                    {popoutComment.content}
                  </pre>
                </div>
                <div className="flex justify-end border-t border-defaultborder/60 bg-gradient-to-r from-transparent to-slate-50/80 px-4 py-3 dark:border-white/10 dark:to-white/[0.02] sm:px-5">
                  <button type="button" className="ti-btn ti-btn-light !mb-0" onClick={closePopout}>
                    Close
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
