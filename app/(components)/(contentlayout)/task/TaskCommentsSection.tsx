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
    <div className="border-t border-defaultborder pt-4 mt-4">
      <div className="font-semibold mb-2 text-[0.875rem]">Comments</div>
      {error && (
        <div className="text-danger text-[0.8125rem] mb-2">{error}</div>
      )}
      {loading ? (
        <div className="text-[#8c9097] dark:text-white/50 text-[0.8125rem] py-2">
          Loading comments...
        </div>
      ) : (
        <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
          {comments.length === 0 ? (
            <div className="text-[#8c9097] dark:text-white/50 text-[0.8125rem]">
              No comments yet.
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c._id ?? (c as TaskComment & { id?: string }).id ?? c.content}
                className="text-[0.8125rem] p-2 rounded bg-bodybg/50 dark:bg-white/5"
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium">
                    {c.commentedBy?.name ?? c.commentedBy?.email ?? "Unknown"}
                  </span>
                  <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem]">
                    {formatCommentDate(c.createdAt)}
                  </span>
                </div>
                <p className="text-defaulttextcolor/90 whitespace-pre-wrap mb-0">
                  {c.content}
                </p>
              </div>
            ))
          )}
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment..."
          maxLength={2000}
          className="form-control !py-2 !text-[0.8125rem] flex-1"
          disabled={adding}
        />
        <button
          type="submit"
          className="ti-btn ti-btn-primary !py-2 !px-3 !text-[0.8125rem]"
          disabled={adding || !content.trim()}
        >
          {adding ? "..." : "Post"}
        </button>
      </form>
    </div>
  );
}
