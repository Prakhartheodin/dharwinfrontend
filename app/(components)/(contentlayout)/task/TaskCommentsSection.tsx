"use client";

import React, { useEffect, useState } from "react";
import {
  getTaskComments,
  addTaskComment,
  type TaskComment,
} from "@/shared/lib/api/tasks";

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
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    setError(null);
    getTaskComments(taskId)
      .then(setComments)
      .catch(() => setError("Failed to load comments."))
      .finally(() => setLoading(false));
  }, [taskId]);

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

  return (
    <div className="mt-0">
      <div className="mb-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted dark:text-white/45">
        Comments
      </div>
      {error ? <div className="mb-2 text-[0.8125rem] text-danger">{error}</div> : null}
      {loading ? (
        <div className="space-y-2 py-1" role="status" aria-label="Loading comments">
          <div className="h-3 w-3/4 max-w-[12rem] rounded-md bg-defaultborder/45 motion-safe:animate-pulse motion-reduce:animate-none" />
          <div className="h-3 w-full max-w-[18rem] rounded-md bg-defaultborder/35 motion-safe:animate-pulse motion-reduce:animate-none" />
        </div>
      ) : (
        <div className="mb-2 max-h-40 space-y-2 overflow-y-auto pe-0.5">
          {comments.length === 0 ? (
            <div className="rounded-lg border border-dashed border-defaultborder/60 bg-defaultbackground/40 px-2.5 py-2 text-[0.8125rem] leading-snug text-muted dark:border-white/10 dark:bg-white/[0.02] dark:text-white/50">
              No comments yet — be the first to leave a note.
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c._id ?? (c as TaskComment & { id?: string }).id ?? c.content}
                className="rounded-lg border border-defaultborder/50 bg-defaultbackground/50 p-2 text-[0.8125rem] shadow-sm transition-shadow duration-200 hover:border-primary/15 hover:shadow-sm dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className="mb-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="font-semibold text-defaulttextcolor">
                    {c.commentedBy?.name ?? c.commentedBy?.email ?? "Unknown"}
                  </span>
                  <span className="text-[0.75rem] text-muted dark:text-white/45">{formatCommentDate(c.createdAt)}</span>
                </div>
                <p className="mb-0 whitespace-pre-wrap text-defaulttextcolor/90">{c.content}</p>
              </div>
            ))
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment…"
          maxLength={2000}
          className="form-control min-h-[2.5rem] flex-1 !rounded-xl !py-2 !text-[0.8125rem] shadow-sm transition-[border-color,box-shadow] duration-200 focus:border-primary/40 dark:focus:border-primary/35"
          disabled={adding}
        />
        <button
          type="submit"
          className="ti-btn ti-btn-primary flex min-h-[2.5rem] shrink-0 items-center justify-center !rounded-xl !px-5 !py-0 !text-[0.8125rem] font-semibold transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:!min-w-[5.5rem]"
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
      </form>
    </div>
  );
}
