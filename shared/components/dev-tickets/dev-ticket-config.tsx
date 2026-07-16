import React from "react";
import type { DevTicket, DevTicketAttachment, DevTicketLabel } from "@/shared/lib/api/devTickets";

export const STATUS_CONFIG: Record<string, { dot: string; badge: string; icon: string; color: string }> = {
  Open: { dot: "bg-primary", badge: "bg-primary/10 text-primary", icon: "ri-radio-button-line", color: "#6366f1" },
  "In Progress": { dot: "bg-warning", badge: "bg-warning/10 text-warning", icon: "ri-loader-4-line", color: "#f59e0b" },
  Resolved: { dot: "bg-success", badge: "bg-success/10 text-success", icon: "ri-checkbox-circle-line", color: "#10b981" },
  Closed: { dot: "bg-gray-400", badge: "bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-white/50", icon: "ri-lock-line", color: "#94a3b8" },
};

export const PRIORITY_CONFIG: Record<string, { badge: string; icon: string }> = {
  Low: { badge: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/50", icon: "ri-arrow-down-line" },
  Medium: { badge: "bg-info/10 text-info", icon: "ri-subtract-line" },
  High: { badge: "bg-warning/10 text-warning", icon: "ri-arrow-up-line" },
  Urgent: { badge: "bg-danger/10 text-danger", icon: "ri-fire-line" },
};

export const SEVERITY_CONFIG: Record<string, { badge: string; dot: string; color: string }> = {
  Minor: { badge: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/50", dot: "bg-slate-400", color: "#94a3b8" },
  Major: { badge: "bg-info/10 text-info", dot: "bg-info", color: "#06b6d4" },
  Critical: { badge: "bg-warning/10 text-warning", dot: "bg-warning", color: "#f59e0b" },
  Blocker: { badge: "bg-danger/10 text-danger", dot: "bg-danger", color: "#ef4444" },
};

export const LABEL_CONFIG: Record<DevTicketLabel, { badge: string; label: string }> = {
  regression: { badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400", label: "regression" },
  "needs-repro": { badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400", label: "needs-repro" },
  "good-first-bug": { badge: "bg-green-500/10 text-green-600 dark:text-green-400", label: "good-first-bug" },
  performance: { badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400", label: "performance" },
  security: { badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400", label: "security" },
  ui: { badge: "bg-primary/10 text-primary", label: "ui" },
};

export const BOARD_COLUMNS = ["Open", "In Progress", "Resolved", "Closed"] as const;
export type BoardColumn = (typeof BOARD_COLUMNS)[number];

export function getTicketDbId(ticket: DevTicket): string {
  return String(ticket.id ?? ticket._id ?? "");
}

export function getDevTicketDisplayId(ticket: DevTicket): string {
  const tid = getTicketDbId(ticket);
  return ticket.ticketId ?? tid.slice(-8).toUpperCase();
}

export function computeAgeDays(createdAt?: string): number {
  if (!createdAt) return 0;
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/** Ticket-level attachments plus any files uploaded on comments (deduped by S3 key). */
export function getAllTicketAttachments(ticket: DevTicket): DevTicketAttachment[] {
  const seen = new Set<string>();
  const out: DevTicketAttachment[] = [];
  const push = (att: DevTicketAttachment) => {
    const id = att.key || `${att.originalName}:${att.url}`;
    if (seen.has(id)) return;
    seen.add(id);
    out.push(att);
  };
  (ticket.attachments ?? []).forEach(push);
  (ticket.comments ?? []).forEach((c) => (c.attachments ?? []).forEach(push));
  return out;
}

export function formatDate(s?: string): string {
  if (!s) return "N/A";
  return new Date(s).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(s?: string): string {
  if (!s) return "";
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(s);
}

export function isImage(mime?: string): boolean {
  return Boolean(mime?.startsWith("image/"));
}

export function isVideo(mime?: string): boolean {
  return Boolean(mime?.startsWith("video/"));
}

export function canEditDevTicket(
  ticket: DevTicket,
  userId?: string,
  isAdmin?: boolean
): boolean {
  if (isAdmin) return true;
  if (!userId) return false;
  const creatorId = ticket.createdBy?.id ?? ticket.createdBy?._id;
  const assigneeId = ticket.assignedTo?.id ?? ticket.assignedTo?._id;
  return String(creatorId) === String(userId) || String(assigneeId) === String(userId);
}

export function getInitials(name?: string, email?: string): string {
  return ((name ?? email ?? "?")[0] || "?").toUpperCase();
}

export function highlightMentions(text: string): React.ReactNode[] {
  const parts = text.split(/(@[\w\s.-]+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-semibold text-primary">
        {part}
      </span>
    ) : (
      part
    )
  );
}
