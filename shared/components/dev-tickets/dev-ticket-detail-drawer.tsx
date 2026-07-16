"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import {
  addComment,
  getDevTicket,
  linkTicket,
  react,
  removeReaction,
  unlinkTicket,
  updateDevTicket,
  watch,
  unwatch,
  type DevTicket,
  type DevTicketLabel,
  type DevTicketLinkRel,
  DEV_TICKET_LABELS,
  DEV_TICKET_LINK_RELS,
} from "@/shared/lib/api/devTickets";
import {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  SEVERITY_CONFIG,
  LABEL_CONFIG,
  computeAgeDays,
  formatDate,
  formatFileSize,
  formatRelative,
  getDevTicketDisplayId,
  getAllTicketAttachments,
  getInitials,
  getTicketDbId,
  highlightMentions,
  isImage,
  isVideo,
} from "./dev-ticket-config";
import DevTicketModulePageFields from "./dev-ticket-module-page-fields";
import { formatDevTicketModuleLabel } from "./dev-ticket-modules";

const REACTION_EMOJIS = ["👍", "👎", "❤️", "🎉", "😕"];

const EDIT_FIELD =
  "form-control w-full min-w-0 !min-h-[2.75rem] !rounded-lg !border-defaultborder/70 !bg-white !px-3 !text-[0.8125rem] shadow-sm dark:!border-white/10 dark:!bg-bodybg";
const EDIT_TEXTAREA =
  "form-control w-full min-w-0 !min-h-0 !rounded-lg !border-defaultborder/70 !bg-white !px-3 !py-2.5 !text-[0.8125rem] shadow-sm dark:!border-white/10 dark:!bg-bodybg";
const EDIT_LABEL =
  "form-label !mb-1.5 block !text-[0.6875rem] !font-semibold uppercase tracking-wide text-slate-500 dark:text-white/50";

export interface DevTicketDetailDrawerProps {
  ticket: DevTicket | null;
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  isAdmin: boolean;
  canEdit: boolean;
  onTicketUpdated: (ticket: DevTicket) => void;
  usersList?: { id: string; name?: string; email: string }[];
  onOpenLinkedTicket?: (ticketDbId: string) => void;
}

export function DevTicketDetailDrawer({
  open,
  ticket,
  onClose,
  onTicketUpdated,
  onOpenLinkedTicket,
  currentUserId,
  isAdmin,
  canEdit,
  usersList = [],
}: DevTicketDetailDrawerProps) {
  const [detail, setDetail] = useState<DevTicket | null>(ticket);
  const [commentText, setCommentText] = useState("");
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  const [addingComment, setAddingComment] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    title: "",
    description: "",
    stepsToReproduce: "",
    status: "",
    priority: "",
    severity: "",
    module: "",
    pageUrl: "",
    environment: "",
    assignedTo: "",
    labels: [] as DevTicketLabel[],
  });
  const [updating, setUpdating] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [linkRel, setLinkRel] = useState<DevTicketLinkRel>("relates-to");
  const [linkTicketId, setLinkTicketId] = useState("");
  const [linking, setLinking] = useState(false);
  const [watching, setWatching] = useState(false);
  const commentFileRef = useRef<HTMLInputElement>(null);
  const commentTextareaRef = useRef<HTMLTextAreaElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  // Parent may pass a fresh onTicketUpdated each render; keep it in a ref so the
  // reset/refetch effect below runs only when a new ticket opens — not on every
  // parent render (which would re-render mid-interaction and close open dropdowns).
  const onTicketUpdatedRef = useRef(onTicketUpdated);
  onTicketUpdatedRef.current = onTicketUpdated;
  const commentTextRef = useRef(commentText);
  commentTextRef.current = commentText;
  const openedTicketIdRef = useRef<string | null>(null);

  const ticketId = detail ? getTicketDbId(detail) : "";

  const syncUpdateForm = useCallback((t: DevTicket) => {
    setUpdateForm({
      title: t.title ?? "",
      description: t.description ?? "",
      stepsToReproduce: t.stepsToReproduce ?? "",
      status: t.status ?? "Open",
      priority: t.priority ?? "Medium",
      severity: t.severity ?? "Major",
      module: t.module ?? "",
      pageUrl: t.pageUrl ?? "",
      environment: t.environment ?? "Staging",
      assignedTo: t.assignedTo?.id ?? t.assignedTo?._id ?? "",
      labels: t.labels ?? [],
    });
  }, []);

  useEffect(() => {
    if (!ticket) {
      setDetail(null);
      openedTicketIdRef.current = null;
      return;
    }

    const id = getTicketDbId(ticket);
    const isNewTicket = id !== openedTicketIdRef.current;
    openedTicketIdRef.current = id;

    setDetail(ticket);
    syncUpdateForm(ticket);

    if (isNewTicket) {
      setCommentText("");
      setCommentAttachments([]);
      setEditMode(false);
      setActivityOpen(false);
      if (id) {
        getDevTicket(id)
          .then((latest) => {
            if (openedTicketIdRef.current !== id) return;
            setDetail(latest);
            syncUpdateForm(latest);
            onTicketUpdatedRef.current(latest);
          })
          .catch(() => {});
      }
    }
  }, [ticket, syncUpdateForm]);

  const handleClose = useCallback(async () => {
    if (commentTextRef.current.trim()) {
      const result = await Swal.fire({
        title: "Discard comment?",
        text: "You have unsent text in the comment box.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Discard",
        cancelButtonText: "Keep editing",
      });
      if (!result.isConfirmed) return;
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void handleClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, [open, handleClose]);

  const handleAddComment = async () => {
    if (!detail || !ticketId || commentText.trim().length < 5) return;
    try {
      setAddingComment(true);
      const latest = await addComment(
        ticketId,
        commentText.trim(),
        commentAttachments.length ? commentAttachments : undefined
      );
      setDetail(latest);
      onTicketUpdated(latest);
      setCommentText("");
      setCommentAttachments([]);
      if (commentFileRef.current) commentFileRef.current.value = "";
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      await Swal.fire({ icon: "error", title: "Failed", text: e?.response?.data?.message ?? e?.message ?? "Could not add comment." });
    } finally {
      setAddingComment(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!detail || !ticketId) return;
    try {
      setUpdating(true);
      const body: Parameters<typeof updateDevTicket>[1] = {
        title: updateForm.title.trim(),
        description: updateForm.description.trim(),
        stepsToReproduce: updateForm.stepsToReproduce.trim() || undefined,
        status: updateForm.status as DevTicket["status"],
        priority: updateForm.priority as DevTicket["priority"],
        severity: updateForm.severity as DevTicket["severity"],
        module: updateForm.module.trim() || undefined,
        pageUrl: updateForm.pageUrl.trim() || undefined,
        environment: updateForm.environment as DevTicket["environment"],
        labels: updateForm.labels,
        assignedTo: updateForm.assignedTo || null,
      };
      const latest = await updateDevTicket(ticketId, body);
      setDetail(latest);
      onTicketUpdated(latest);
      setEditMode(false);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      await Swal.fire({ icon: "error", title: "Failed", text: e?.response?.data?.message ?? e?.message ?? "Could not update ticket." });
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleWatch = async () => {
    if (!ticketId || !detail) return;
    const watcherIds = (detail.watchers ?? []).map((w) => w.id ?? w._id);
    const isWatching = currentUserId && watcherIds.some((id) => String(id) === String(currentUserId));
    try {
      setWatching(true);
      const latest = isWatching ? await unwatch(ticketId) : await watch(ticketId);
      setDetail(latest);
      onTicketUpdated(latest);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      await Swal.fire({ icon: "error", title: "Failed", text: e?.response?.data?.message ?? e?.message ?? "Could not update watch status." });
    } finally {
      setWatching(false);
    }
  };

  const handleLinkTicket = async () => {
    if (!ticketId || !linkTicketId.trim()) return;
    try {
      setLinking(true);
      const latest = await linkTicket(ticketId, { rel: linkRel, ticketId: linkTicketId.trim() });
      setDetail(latest);
      onTicketUpdated(latest);
      setLinkTicketId("");
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      await Swal.fire({ icon: "error", title: "Failed", text: e?.response?.data?.message ?? e?.message ?? "Could not link ticket." });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async (linkId: string) => {
    if (!ticketId) return;
    try {
      const latest = await unlinkTicket(ticketId, linkId);
      setDetail(latest);
      onTicketUpdated(latest);
    } catch {
      await Swal.fire({ icon: "error", title: "Failed", text: "Could not remove link." });
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    if (!ticketId) return;
    const comment = detail?.comments?.find((c) => (c.id ?? c._id) === commentId);
    const already = comment?.reactions?.find((r) => r.emoji === emoji)?.users?.some((u) => String(u) === String(currentUserId));
    try {
      const latest = already
        ? await removeReaction(ticketId, { commentId, emoji })
        : await react(ticketId, { commentId, emoji });
      setDetail(latest);
      onTicketUpdated(latest);
    } catch {
      /* ignore */
    }
  };

  if (!open || !detail) return null;

  const sc = STATUS_CONFIG[detail.status] ?? STATUS_CONFIG.Open;
  const pc = PRIORITY_CONFIG[detail.priority] ?? PRIORITY_CONFIG.Medium;
  const sev = SEVERITY_CONFIG[detail.severity] ?? SEVERITY_CONFIG.Major;
  const ageDays = computeAgeDays(detail.createdAt);
  const isOpen = detail.status !== "Resolved" && detail.status !== "Closed";
  const watcherIds = (detail.watchers ?? []).map((w) => w.id ?? w._id);
  const isWatching = Boolean(currentUserId && watcherIds.some((id) => String(id) === String(currentUserId)));
  const allAttachments = getAllTicketAttachments(detail);

  return (
    <>
      <div
        className="fixed inset-0 z-[104] bg-black/40 backdrop-blur-[1px]"
        onClick={handleClose}
        aria-hidden
      />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dev-ticket-drawer-title"
        className="fixed inset-y-0 right-0 z-[105] flex h-dvh max-h-dvh w-full max-w-[42rem] flex-col overflow-hidden bg-white shadow-[-24px_0_64px_rgba(0,0,0,0.15)] dark:bg-bodybg motion-safe:animate-[slideInRight_0.25s_ease] motion-reduce:animate-none"
      >
        <div className="h-1 shrink-0" style={{ background: `linear-gradient(90deg, ${sc.color}, ${sc.color}88)` }} />

        {/* Header */}
        <div className="shrink-0 border-b border-defaultborder px-5 py-4 dark:border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-slate-600 dark:bg-white/[0.06] dark:text-white/70">
                  {getDevTicketDisplayId(detail)}
                </span>
                {isOpen && ageDays > 0 && (
                  <span className={`badge !rounded-full !text-[0.625rem] ${ageDays > 28 ? "bg-rose-500/10 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
                    {ageDays}d old
                  </span>
                )}
                <span className={`badge !rounded-full !text-[0.6875rem] ${sc.badge}`}>{detail.status}</span>
                <span className={`badge !rounded-full !text-[0.6875rem] ${sev.badge}`}>{detail.severity}</span>
                <span className={`badge !rounded-full !text-[0.6875rem] ${pc.badge}`}>
                  <i className={`${pc.icon} me-0.5 text-[0.55rem]`} />
                  {detail.priority}
                </span>
              </div>
              <h2 id="dev-ticket-drawer-title" className="text-[1.0625rem] font-bold leading-snug text-defaulttextcolor dark:text-white">
                {detail.title}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setEditMode((v) => !v)}
                  className="ti-btn ti-btn-icon ti-btn-sm ti-btn-soft-primary"
                  aria-label={editMode ? "Cancel edit" : "Edit ticket"}
                >
                  <i className={editMode ? "ri-close-line" : "ri-edit-line"} />
                </button>
              )}
              <button
                ref={closeBtnRef}
                type="button"
                onClick={handleClose}
                className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light"
                aria-label="Close drawer"
              >
                <i className="ri-close-line" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-5 py-4 pb-6" style={{ scrollbarWidth: "thin" }}>
          {/* Watchers */}
          <section className="mb-5 rounded-xl border border-defaultborder/60 bg-slate-50/40 p-3.5 dark:border-white/10 dark:bg-black/10">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h3 className="mb-0 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">Watchers</h3>
              <button
                type="button"
                onClick={handleToggleWatch}
                disabled={watching}
                className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-[0.6875rem] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50 ${
                  isWatching
                    ? "bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
                    : "bg-primary/10 text-primary hover:bg-primary/15"
                }`}
              >
                {watching ? (
                  <i className="ri-loader-4-line animate-spin" />
                ) : isWatching ? (
                  <>
                    <i className="ri-eye-off-line" /> Unwatch
                  </>
                ) : (
                  <>
                    <i className="ri-eye-line" /> Watch
                  </>
                )}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(detail.watchers ?? []).length === 0 ? (
                <span className="text-[0.75rem] text-slate-400 dark:text-white/40">No watchers yet — watch to get updates</span>
              ) : (
                detail.watchers!.map((w, i) => (
                  <span
                    key={w.id ?? w._id ?? i}
                    title={w.name ?? w.email}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white py-0.5 pl-0.5 pr-2.5 ring-1 ring-defaultborder/80 dark:bg-bodybg dark:ring-white/10"
                  >
                    <span className="avatar avatar-xs avatar-rounded bg-primary/10 text-primary text-[0.55rem] font-bold">
                      {getInitials(w.name, w.email)}
                    </span>
                    <span className="max-w-[8rem] truncate text-[0.6875rem] font-medium text-defaulttextcolor dark:text-white/80">
                      {w.name || w.email}
                    </span>
                  </span>
                ))
              )}
            </div>
          </section>

          {/* Meta grid */}
          <section className="mb-5 grid grid-cols-2 gap-3 rounded-lg border border-defaultborder/60 bg-slate-50/50 p-3 dark:border-white/10 dark:bg-black/10 sm:grid-cols-3">
            {[
              { label: "Module", value: detail.module ? formatDevTicketModuleLabel(detail.module) : "—" },
              { label: "Environment", value: detail.environment || "—" },
              { label: "Priority", value: detail.priority },
              { label: "Assignee", value: detail.assignedTo?.name ?? detail.assignedTo?.email ?? "Unassigned" },
              { label: "Reporter", value: detail.createdBy?.name ?? detail.createdBy?.email ?? "—" },
              { label: "Created", value: formatDate(detail.createdAt) },
            ].map((item) => (
              <div key={item.label}>
                <p className="mb-0.5 text-[0.625rem] font-semibold uppercase tracking-wide text-[#8c9097]">{item.label}</p>
                <p className="mb-0 text-[0.8125rem] font-medium text-defaulttextcolor dark:text-white">{item.value}</p>
              </div>
            ))}
          </section>

          {/* Labels */}
          {(detail.labels?.length ?? 0) > 0 && (
            <section className="mb-5">
              <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-[#8c9097]">Labels</h3>
              <div className="flex flex-wrap gap-1.5">
                {detail.labels!.map((lbl) => {
                  const cfg = LABEL_CONFIG[lbl];
                  return (
                    <span key={lbl} className={`badge !rounded-full !text-[0.6875rem] ${cfg?.badge ?? ""}`}>
                      {cfg?.label ?? lbl}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {editMode && canEdit ? (
            <section className="mb-5 overflow-hidden rounded-xl border border-defaultborder/70 bg-white shadow-sm dark:border-white/10 dark:bg-bodybg">
              <div className="border-b border-defaultborder/60 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                <h3 className="mb-0 text-[0.875rem] font-semibold text-defaulttextcolor dark:text-white">Edit ticket</h3>
                <p className="mb-0 mt-0.5 text-[0.6875rem] text-defaulttextcolor/50">Update details and workflow fields.</p>
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <label className={EDIT_LABEL}>Title</label>
                  <input className={EDIT_FIELD} value={updateForm.title} onChange={(e) => setUpdateForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div>
                  <label className={EDIT_LABEL}>Description</label>
                  <textarea className={EDIT_TEXTAREA} rows={4} value={updateForm.description} onChange={(e) => setUpdateForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className={EDIT_LABEL}>Steps to reproduce</label>
                  <textarea className={EDIT_TEXTAREA} rows={3} value={updateForm.stepsToReproduce} onChange={(e) => setUpdateForm((f) => ({ ...f, stepsToReproduce: e.target.value }))} />
                </div>

                <DevTicketModulePageFields
                  module={updateForm.module}
                  pageUrl={updateForm.pageUrl}
                  onModuleChange={(module) => setUpdateForm((f) => ({ ...f, module }))}
                  onPageUrlChange={(pageUrl) => setUpdateForm((f) => ({ ...f, pageUrl }))}
                  selectClassName={EDIT_FIELD}
                  layout="stack"
                />

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <label className={EDIT_LABEL}>Status</label>
                    <select className={EDIT_FIELD} value={updateForm.status} onChange={(e) => setUpdateForm((f) => ({ ...f, status: e.target.value }))}>
                      {Object.keys(STATUS_CONFIG).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className={EDIT_LABEL}>Severity</label>
                    <select className={EDIT_FIELD} value={updateForm.severity} onChange={(e) => setUpdateForm((f) => ({ ...f, severity: e.target.value }))}>
                      {Object.keys(SEVERITY_CONFIG).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className={EDIT_LABEL}>Priority</label>
                    <select className={EDIT_FIELD} value={updateForm.priority} onChange={(e) => setUpdateForm((f) => ({ ...f, priority: e.target.value }))}>
                      {Object.keys(PRIORITY_CONFIG).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className={EDIT_LABEL}>Assignee</label>
                    <select className={EDIT_FIELD} value={updateForm.assignedTo} onChange={(e) => setUpdateForm((f) => ({ ...f, assignedTo: e.target.value }))}>
                      <option value="">Unassigned</option>
                      {usersList.map((u) => (
                        <option key={u.id} value={u.id}>{u.name || u.email}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={EDIT_LABEL}>Labels</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DEV_TICKET_LABELS.map((lbl) => {
                      const selected = updateForm.labels.includes(lbl);
                      const cfg = LABEL_CONFIG[lbl];
                      return (
                        <button
                          key={lbl}
                          type="button"
                          onClick={() =>
                            setUpdateForm((f) => ({
                              ...f,
                              labels: selected ? f.labels.filter((l) => l !== lbl) : [...f.labels, lbl],
                            }))
                          }
                          className={`badge !rounded-full !text-[0.6875rem] cursor-pointer transition-colors ${selected ? cfg.badge : "bg-slate-100 text-slate-500 hover:bg-slate-200/80 dark:bg-white/10 dark:text-white/50"}`}
                        >
                          {lbl}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-defaultborder/60 bg-slate-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-end dark:border-white/10 dark:bg-white/[0.02]">
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => {
                    if (detail) syncUpdateForm(detail);
                    setEditMode(false);
                  }}
                  className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-lg border border-defaultborder/70 bg-white px-4 text-[0.8125rem] font-medium text-defaulttextcolor transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50 sm:w-auto dark:border-white/10 dark:bg-bodybg dark:hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={updating}
                  className="inline-flex min-h-[2.75rem] w-full min-w-[10.5rem] items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-5 text-[0.8125rem] font-semibold text-white shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {updating ? (
                    <>
                      <i className="ri-loader-4-line animate-spin text-[1rem]" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    <>
                      <i className="ri-save-line text-[1rem]" aria-hidden />
                      Save changes
                    </>
                  )}
                </button>
              </div>
            </section>
          ) : (
            <>
              {/* Description */}
              <section className="mb-5">
                <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-[#8c9097]">Description</h3>
                <div className="whitespace-pre-wrap rounded-lg border border-defaultborder/60 bg-slate-50/50 p-3 text-[0.8125rem] leading-relaxed dark:border-white/10 dark:bg-black/10">
                  {detail.description}
                </div>
              </section>

              {detail.stepsToReproduce && (
                <section className="mb-5">
                  <h3 className="mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-[#8c9097]">Steps to reproduce</h3>
                  <div className="whitespace-pre-wrap rounded-lg border border-defaultborder/60 bg-slate-50/50 p-3 text-[0.8125rem] dark:border-white/10 dark:bg-black/10">
                    {detail.stepsToReproduce}
                  </div>
                </section>
              )}
            </>
          )}

          {/* Linked tickets */}
          <section className="mb-5">
            <h3 className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">Linked tickets</h3>
            {(detail.links ?? []).length === 0 && !canEdit && (
              <p className="rounded-lg border border-dashed border-defaultborder/70 px-3 py-4 text-center text-[0.75rem] text-slate-400 dark:border-white/10 dark:text-white/40">
                No linked tickets
              </p>
            )}
            <div className="space-y-2">
            {(detail.links ?? []).map((link) => {
              const linked = link.ticket as { id?: string; _id?: string; ticketId?: string; title?: string } | undefined;
              const linkDbId = linked?.id ?? linked?._id ?? "";
              return (
                <div key={link.id ?? link._id} className="flex items-center gap-2 rounded-lg border border-defaultborder/70 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-bodybg">
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-slate-600 dark:bg-white/10 dark:text-white/60">{link.rel}</span>
                  <button
                    type="button"
                    onClick={() => linkDbId && onOpenLinkedTicket?.(String(linkDbId))}
                    className="min-w-0 flex-1 truncate text-left text-[0.8125rem] font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    {link.ticket?.ticketId} — {link.ticket?.title}
                  </button>
                  {canEdit && (
                    <button type="button" onClick={() => handleUnlink(String(link.id ?? link._id))} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rose-600 transition-colors hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30" aria-label="Remove link">
                      <i className="ri-link-unlink" />
                    </button>
                  )}
                </div>
              );
            })}
            </div>
            {canEdit && (
              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-defaultborder/60 bg-slate-50/50 p-3 dark:border-white/10 dark:bg-black/10 sm:flex-row sm:items-center">
                <select className="form-control shrink-0 !h-10 !rounded-lg !border-defaultborder/70 !py-0 !text-[0.75rem] sm:max-w-[9rem]" value={linkRel} onChange={(e) => setLinkRel(e.target.value as DevTicketLinkRel)}>
                  {DEV_TICKET_LINK_RELS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <input
                  className="form-control min-w-0 flex-1 !h-10 !rounded-lg !border-defaultborder/70 !py-0 !text-[0.75rem]"
                  placeholder="DEV-… ticket ID"
                  value={linkTicketId}
                  onChange={(e) => setLinkTicketId(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !linking) handleLinkTicket(); }}
                />
                <button
                  type="button"
                  onClick={handleLinkTicket}
                  disabled={linking || !linkTicketId.trim()}
                  className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-[0.75rem] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 sm:min-w-[5rem]"
                >
                  {linking ? "Linking…" : "Link"}
                </button>
              </div>
            )}
          </section>

          {/* Attachments gallery */}
          <section className="mb-5">
            <h3 className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
              Attachments{allAttachments.length > 0 ? ` (${allAttachments.length})` : ""}
            </h3>
            {allAttachments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-defaultborder/70 px-3 py-4 text-center text-[0.75rem] text-slate-400 dark:border-white/10 dark:text-white/40">
                Files attached to comments will appear here
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {allAttachments.map((att, i) => (
                  <a
                    key={att.key ?? i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={att.originalName}
                    className="group relative block overflow-hidden rounded-xl border border-defaultborder/70 bg-white transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-white/10 dark:bg-bodybg"
                  >
                    {isImage(att.mimeType) ? (
                      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-black/20">
                        <img src={att.url} alt={att.originalName} loading="lazy" className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-[0.75rem] font-medium text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">View</span>
                      </div>
                    ) : isVideo(att.mimeType) ? (
                      <div className="relative flex aspect-[4/3] flex-col items-center justify-center gap-1 bg-slate-900">
                        <i className="ri-play-circle-line text-[2rem] text-white/80" />
                        <span className="text-[0.625rem] font-medium uppercase tracking-wide text-white/50">Video</span>
                      </div>
                    ) : (
                      <div className="relative flex aspect-[4/3] flex-col items-center justify-center gap-1.5 bg-gradient-to-b from-slate-50 to-slate-100 dark:from-black/20 dark:to-black/30">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm dark:bg-white/10">
                          <i className="ri-file-text-line text-[1.25rem] text-primary" />
                        </span>
                        <span className="text-[0.625rem] font-medium uppercase tracking-wide text-slate-400">Document</span>
                      </div>
                    )}
                    <div className="border-t border-defaultborder/60 px-2.5 py-2 dark:border-white/10">
                      <p className="mb-0 truncate text-[0.6875rem] font-medium text-defaulttextcolor dark:text-white/90">{att.originalName}</p>
                      {att.size > 0 && <p className="mb-0 text-[0.625rem] tabular-nums text-slate-400">{formatFileSize(att.size)}</p>}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* Comments */}
          <section className="mb-5">
            <h3 className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
              Comments{(detail.comments ?? []).length > 0 ? ` (${detail.comments!.length})` : ""}
            </h3>
            <div className="space-y-4">
              {(detail.comments ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-defaultborder/70 px-4 py-8 text-center dark:border-white/10">
                  <i className="ri-chat-3-line mb-2 block text-[1.5rem] text-slate-300 dark:text-white/20" />
                  <p className="mb-0 text-[0.8125rem] font-medium text-slate-500 dark:text-white/50">No comments yet</p>
                  <p className="mb-0 mt-1 text-[0.75rem] text-slate-400 dark:text-white/35">Be the first to add context or updates</p>
                </div>
              ) : (
                detail.comments!.map((c, i) => {
                  const cid = String(c.id ?? c._id ?? i);
                  const authorId = c.commentedBy?.id ?? c.commentedBy?._id;
                  const isOwn = currentUserId && String(authorId) === String(currentUserId);
                  const hasAttachments = (c.attachments ?? []).length > 0;
                  const hasText = Boolean(c.content?.trim());
                  const imageAttachments = (c.attachments ?? []).filter((a) => isImage(a.mimeType));
                  const fileAttachments = (c.attachments ?? []).filter((a) => !isImage(a.mimeType));
                  return (
                    <div key={cid} className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                      <span className="avatar avatar-sm avatar-rounded shrink-0 bg-primary/10 text-primary text-[0.6rem] font-bold">
                        {getInitials(c.commentedBy?.name, c.commentedBy?.email)}
                      </span>
                      <div className={`flex max-w-[85%] flex-col gap-2 overflow-visible ${isOwn ? "items-end" : "items-start"}`}>
                        <span className="text-[0.8125rem] font-semibold text-defaulttextcolor dark:text-white">
                          {c.commentedBy?.name || c.commentedBy?.email}
                        </span>

                        {hasAttachments && (
                          <div className={`flex flex-col gap-2 overflow-visible ${isOwn ? "items-end" : "items-start"}`}>
                            {imageAttachments.length > 0 && (
                              <div className={`grid gap-2 ${imageAttachments.length > 1 ? "grid-cols-2" : "grid-cols-1"} max-w-[16rem]`}>
                                {imageAttachments.map((att, ai) => (
                                  <a
                                    key={att.key ?? ai}
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full overflow-hidden rounded-2xl border border-defaultborder/60 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-white/10"
                                  >
                                    <img src={att.url} alt={att.originalName} loading="lazy" className="aspect-[4/3] w-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            )}
                            {fileAttachments.map((att, ai) => (
                              <a
                                key={att.key ?? ai}
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={att.originalName}
                                className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-defaultborder/70 bg-white px-3 py-2.5 text-[0.6875rem] shadow-sm transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-white/10 dark:bg-bodybg"
                              >
                                <i className={`${isVideo(att.mimeType) ? "ri-video-line" : "ri-file-line"} shrink-0 text-primary`} />
                                <span className="min-w-0 truncate font-medium">{att.originalName}</span>
                                {att.size > 0 && <span className="shrink-0 text-slate-400">{formatFileSize(att.size)}</span>}
                              </a>
                            ))}
                          </div>
                        )}

                        {(hasText || c.createdAt) && (
                          <div className={`flex flex-col gap-1 overflow-visible ${isOwn ? "items-end" : "items-start"}`}>
                            {hasText && (
                              <div
                                className={`box-border max-w-[min(100%,22rem)] overflow-visible px-4 py-3 text-left text-[0.875rem] leading-[1.55] tracking-normal break-words whitespace-pre-wrap shadow-[0_1px_2px_rgba(15,23,42,0.08)] ${
                                  isOwn
                                    ? "rounded-[1.125rem] rounded-br-[0.375rem] bg-primary text-white dark:shadow-[0_1px_3px_rgba(0,0,0,0.25)] [&_span]:!font-semibold [&_span]:!text-white/95"
                                    : "rounded-[1.125rem] rounded-bl-[0.375rem] bg-slate-100 text-defaulttextcolor dark:bg-white/[0.08] dark:text-white/90"
                                }`}
                              >
                                {highlightMentions(c.content)}
                              </div>
                            )}
                            <time
                              dateTime={c.createdAt}
                              className="px-1 text-[0.6875rem] text-slate-400 dark:text-white/40"
                              title={formatDate(c.createdAt)}
                            >
                              {formatRelative(c.createdAt)}
                            </time>
                          </div>
                        )}

                        <div className={`flex flex-wrap items-center gap-1 ${isOwn ? "justify-end" : ""}`}>
                          {(c.reactions ?? []).map((r) => (
                            <button
                              key={r.emoji}
                              type="button"
                              onClick={() => handleReaction(cid, r.emoji)}
                              className="inline-flex h-8 min-w-[2rem] items-center justify-center gap-0.5 rounded-full border border-defaultborder bg-white px-2 text-[0.6875rem] transition hover:border-primary/40 dark:border-white/10 dark:bg-bodybg"
                            >
                              {r.emoji} <span className="tabular-nums">{r.users.length}</span>
                            </button>
                          ))}
                          {REACTION_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleReaction(cid, emoji)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[0.8rem] text-slate-400 transition hover:bg-slate-100 hover:text-defaulttextcolor focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:hover:bg-white/10"
                              aria-label={`React with ${emoji}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Activity log */}
          <section className="mb-2">
            <button
              type="button"
              onClick={() => setActivityOpen((v) => !v)}
              className="flex w-full items-center justify-between rounded-xl border border-defaultborder/70 bg-white px-3.5 py-2.5 text-[0.8125rem] font-semibold transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-white/10 dark:bg-bodybg dark:hover:bg-white/[0.04]"
              aria-expanded={activityOpen}
            >
              <span className="flex items-center gap-2 text-defaulttextcolor dark:text-white/90">
                <i className="ri-history-line text-primary" />
                Activity log
                {(detail.activityLog ?? []).length > 0 && (
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[0.625rem] font-medium tabular-nums text-slate-500 dark:bg-white/10 dark:text-white/50">
                    {detail.activityLog!.length}
                  </span>
                )}
              </span>
              <i className={`ri-arrow-${activityOpen ? "up" : "down"}-s-line text-slate-400`} />
            </button>
            {activityOpen && (
              <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-defaultborder/60 bg-slate-50/40 p-2 dark:border-white/10 dark:bg-black/10">
                {(detail.activityLog ?? []).length === 0 ? (
                  <p className="py-4 text-center text-[0.75rem] text-slate-400">No activity recorded</p>
                ) : (
                  [...(detail.activityLog ?? [])].reverse().map((entry, i) => (
                    <div key={i} className="relative border-l-2 border-primary/20 py-2 pl-3 pr-1 last:pb-1">
                      <p className="mb-0 text-[0.75rem] font-medium capitalize text-defaulttextcolor dark:text-white/90">
                        {entry.action.replace(/_/g, " ")}
                        {entry.from && entry.to && (
                          <span className="ms-1 font-normal text-slate-400">
                            {entry.from} → {entry.to}
                          </span>
                        )}
                      </p>
                      <p className="mb-0 text-[0.6875rem] text-slate-400">
                        {entry.performedBy?.name || entry.performedBy?.email || "System"} · {formatRelative(entry.createdAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </div>

        {/* Footer composer */}
        {detail.status !== "Closed" && (
          <div className="min-w-0 shrink-0 border-t border-defaultborder bg-white px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.06)] dark:border-white/10 dark:bg-bodybg dark:shadow-[0_-8px_24px_rgba(0,0,0,0.25)] sm:px-5" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
            <label htmlFor="dev-ticket-comment" className="mb-2 block text-[0.6875rem] font-semibold uppercase tracking-wider text-slate-500 dark:text-white/50">
              Add a comment
            </label>
            <div className="min-w-0 w-full overflow-hidden rounded-xl border border-defaultborder/80 bg-slate-50/50 transition-shadow focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 dark:border-white/10 dark:bg-black/20">
              <textarea
                ref={commentTextareaRef}
                id="dev-ticket-comment"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write your comment here…"
                rows={3}
                maxLength={2000}
                aria-describedby="dev-ticket-comment-hint"
                className="block min-h-[5.5rem] w-full min-w-0 max-w-full resize-none border-0 bg-transparent px-3.5 py-3 text-[0.875rem] leading-relaxed text-defaulttextcolor placeholder:text-slate-400 focus:outline-none focus:ring-0 dark:text-white dark:placeholder:text-white/35"
              />
              {commentAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t border-defaultborder/60 px-3 py-2.5 dark:border-white/10">
                  {commentAttachments.map((f, i) => (
                    <span
                      key={`${f.name}-${i}`}
                      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-defaultborder/70 bg-white py-1 pl-2 pr-1 text-[0.6875rem] dark:border-white/10 dark:bg-bodybg"
                    >
                      <i className={`${f.type.startsWith("image/") ? "ri-image-line" : f.type.startsWith("video/") ? "ri-video-line" : "ri-file-line"} shrink-0 text-primary`} />
                      <span className="max-w-[10rem] truncate font-medium">{f.name}</span>
                      <button
                        type="button"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:hover:bg-white/10"
                        onClick={() => setCommentAttachments((a) => a.filter((_, j) => j !== i))}
                        aria-label={`Remove ${f.name}`}
                      >
                        <i className="ri-close-line text-[0.875rem]" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <input
                ref={commentFileRef}
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.log,.txt"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  if (files.length) setCommentAttachments((prev) => [...prev, ...files]);
                  e.target.value = "";
                }}
              />
              <div className="flex items-center gap-2 border-t border-defaultborder/60 px-3 py-2 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => commentFileRef.current?.click()}
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:hover:bg-white/10"
                  aria-label="Attach files"
                >
                  <i className="ri-attachment-2 text-[1.125rem]" />
                </button>
                <p id="dev-ticket-comment-hint" className="mb-0 min-w-0 flex-1 truncate text-[0.6875rem] text-slate-400 dark:text-white/40">
                  Type @ to mention someone
                </p>
                <span
                  className="shrink-0 text-[0.625rem] tabular-nums text-slate-400"
                  aria-live="polite"
                >
                  {commentText.length > 0 ? `${commentText.length}/2000` : ""}
                </span>
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={addingComment || commentText.trim().length < 5}
                  className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-4 text-[0.8125rem] font-medium text-white shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-busy={addingComment}
                >
                  {addingComment ? (
                    <>
                      <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Sending</span>
                    </>
                  ) : (
                    <>
                      <i className="ri-send-plane-2-line text-[0.875rem]" aria-hidden />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

export default DevTicketDetailDrawer;
