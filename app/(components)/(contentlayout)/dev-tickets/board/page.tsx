"use client";

import Seo from "@/shared/layout-components/seo/seo";
import DevTicketAccessDenied from "@/shared/components/dev-tickets/dev-ticket-access-denied";
import DevTicketTabBar from "@/shared/components/dev-tickets/dev-ticket-tab-bar";
import DevTicketDetailDrawer from "@/shared/components/dev-tickets/dev-ticket-detail-drawer";
import {
  BOARD_COLUMNS,
  LABEL_CONFIG,
  PRIORITY_CONFIG,
  SEVERITY_CONFIG,
  STATUS_CONFIG,
  canEditDevTicket,
  computeAgeDays,
  getDevTicketDisplayId,
  getInitials,
  getTicketDbId,
  type BoardColumn,
} from "@/shared/components/dev-tickets/dev-ticket-config";
import { formatDevTicketModuleLabel } from "@/shared/components/dev-tickets/dev-ticket-modules";
import {
  getDevTicket,
  hasDevTicketsView,
  listDevTickets,
  updateStatus,
  type DevTicket,
} from "@/shared/lib/api/devTickets";
import { listUsers } from "@/shared/lib/api/users";
import { useAuth } from "@/shared/contexts/auth-context";
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div aria-live="polite" className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-[0.8125rem] text-white shadow-lg dark:bg-white dark:text-slate-900">
      {message}
    </div>
  );
}

export default function DevTicketsBoardPage() {
  const { user, permissions, isPlatformSuperUser, isAdministrator, permissionsLoaded } = useAuth();
  const canView = hasDevTicketsView(permissions, isPlatformSuperUser);
  const isAdmin = Boolean(isAdministrator || isPlatformSuperUser);
  const userId = user?.id;

  const [tickets, setTickets] = useState<DevTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<BoardColumn | null>(null);
  const [drawerTicket, setDrawerTicket] = useState<DevTicket | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [usersList, setUsersList] = useState<{ id: string; name?: string; email: string }[]>([]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchBoard = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listDevTickets({ limit: 500, sortBy: "createdAt:desc" });
      setTickets(data.results ?? []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to load board");
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  useEffect(() => {
    listUsers({ page: 1, limit: 500 })
      .then((res) => setUsersList((res.results ?? []).map((u) => ({ id: u.id ?? "", name: u.name, email: u.email ?? "" }))))
      .catch(() => {});
  }, []);

  const columns = useMemo(() => {
    const map: Record<BoardColumn, DevTicket[]> = {
      Open: [],
      "In Progress": [],
      Resolved: [],
      Closed: [],
    };
    tickets.forEach((t) => {
      const col = t.status as BoardColumn;
      if (map[col]) map[col].push(t);
    });
    return map;
  }, [tickets]);

  const openDrawer = async (ticket: DevTicket) => {
    setDrawerTicket(ticket);
    setDrawerOpen(true);
    const id = getTicketDbId(ticket);
    if (id) {
      try {
        setDrawerTicket(await getDevTicket(id));
      } catch {
        /* keep */
      }
    }
  };

  const handleDrop = async (targetStatus: BoardColumn, ticketId: string) => {
    const ticket = tickets.find((t) => getTicketDbId(t) === ticketId);
    if (!ticket || ticket.status === targetStatus) return;

    if (!canEditDevTicket(ticket, userId, isAdmin)) {
      showToast("You don't have permission to move this ticket");
      return;
    }

    const prevStatus = ticket.status;
    setTickets((prev) => prev.map((t) => (getTicketDbId(t) === ticketId ? { ...t, status: targetStatus } : t)));

    try {
      const updated = await updateStatus(ticketId, targetStatus);
      setTickets((prev) => prev.map((t) => (getTicketDbId(t) === ticketId ? updated : t)));
      if (drawerTicket && getTicketDbId(drawerTicket) === ticketId) setDrawerTicket(updated);
    } catch (err: unknown) {
      setTickets((prev) => prev.map((t) => (getTicketDbId(t) === ticketId ? { ...t, status: prevStatus } : t)));
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      showToast(e?.response?.data?.message ?? e?.message ?? "Failed to update status");
    }
  };

  if (!permissionsLoaded) {
    return <div className="container-fluid pt-6 py-16 text-center text-[#8c9097]">Loading…</div>;
  }

  if (!canView) {
    return (
      <Fragment>
        <Seo title="Board — Help & Support" />
        <DevTicketAccessDenied />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Board — Help & Support" />
      <Toast message={toast} />

      <div className="container-fluid pt-6">
        <div className="mb-4">
          <h1 className="flex items-center gap-2 text-[1.125rem] font-semibold">
            <i className="ri-layout-column-line text-primary" /> Board
          </h1>
        </div>

        <DevTicketTabBar />

        {error && (
          <div className="mb-4 flex items-center justify-between rounded-md border border-danger/30 bg-danger/5 px-4 py-3">
            <span className="text-danger text-[0.8125rem]">{error}</span>
            <button type="button" onClick={fetchBoard} className="ti-btn ti-btn-sm ti-btn-danger">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {BOARD_COLUMNS.map((col) => (
              <div key={col} className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-defaultborder/60 bg-slate-50/40 dark:border-white/10 dark:bg-black/10">
                <div className="h-1 animate-pulse bg-black/5 dark:bg-white/10" />
                <div className="border-b border-defaultborder/60 px-4 py-3.5 dark:border-white/10">
                  <div className="h-4 w-24 animate-pulse rounded bg-black/5 dark:bg-white/10" />
                </div>
                <div className="space-y-3 p-3">
                  <div className="h-28 animate-pulse rounded-xl bg-black/5 dark:bg-white/10" />
                  <div className="h-28 animate-pulse rounded-xl bg-black/5 dark:bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {BOARD_COLUMNS.map((col) => {
              const sc = STATUS_CONFIG[col] ?? STATUS_CONFIG.Open;
              const count = columns[col].length;
              const isDropTarget = dragOverCol === col && draggingId !== null;
              return (
              <div
                key={col}
                className={`flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border bg-slate-50/50 transition-colors dark:bg-black/10 ${
                  isDropTarget
                    ? "border-primary/40 bg-primary/[0.04] ring-2 ring-primary/20 dark:bg-primary/[0.06]"
                    : "border-defaultborder/70 dark:border-white/10"
                }`}
                onDragEnter={() => setDragOverCol(col)}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverCol(null);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/ticket-id");
                  if (id) void handleDrop(col, id);
                  setDraggingId(null);
                  setDragOverCol(null);
                }}
              >
                <div className="h-1 shrink-0" style={{ backgroundColor: sc.color }} />
                <div className="flex items-center justify-between gap-2 border-b border-defaultborder/60 px-4 py-3.5 dark:border-white/10">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${sc.dot}`} aria-hidden />
                    <h3 className="mb-0 truncate text-[0.8125rem] font-semibold text-defaulttextcolor dark:text-white">{col}</h3>
                  </div>
                  <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-white px-2 text-[0.6875rem] font-semibold tabular-nums text-slate-600 shadow-sm dark:bg-bodybg dark:text-white/70">
                    {count}
                  </span>
                </div>
                <div className="flex-1 space-y-2.5 overflow-y-auto p-3" style={{ scrollbarWidth: "thin" }}>
                  {count === 0 ? (
                    <div className={`flex min-h-[10rem] flex-col items-center justify-center rounded-xl border border-dashed px-4 py-8 text-center transition-colors ${
                      isDropTarget ? "border-primary/40 bg-primary/[0.03]" : "border-defaultborder/50 dark:border-white/10"
                    }`}>
                      <i className={`ri-inbox-line mb-2 text-[1.25rem] ${isDropTarget ? "text-primary" : "text-slate-300 dark:text-white/20"}`} />
                      <p className="mb-0 text-[0.75rem] font-medium text-slate-400 dark:text-white/40">
                        {isDropTarget ? "Drop to move here" : "No tickets"}
                      </p>
                    </div>
                  ) : (
                    columns[col].map((ticket) => {
                      const id = getTicketDbId(ticket);
                      const sev = SEVERITY_CONFIG[ticket.severity] ?? SEVERITY_CONFIG.Major;
                      const pri = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.Medium;
                      const age = computeAgeDays(ticket.createdAt);
                      const isDragging = draggingId === id;
                      const showPriority = ticket.priority === "Urgent" || ticket.priority === "High";
                      return (
                        <article
                          key={id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("text/ticket-id", id);
                            e.dataTransfer.effectAllowed = "move";
                            setDraggingId(id);
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setDragOverCol(null);
                          }}
                          onClick={() => openDrawer(ticket)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              openDrawer(ticket);
                            }
                          }}
                          role="button"
                          tabIndex={0}
                          aria-label={`${ticket.title}, ${col}, ${getDevTicketDisplayId(ticket)}`}
                          className={`group cursor-grab rounded-xl border bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all active:cursor-grabbing dark:bg-bodybg dark:shadow-[0_1px_3px_rgba(0,0,0,0.2)] ${
                            isDragging
                              ? "scale-[0.98] border-primary/30 opacity-50 shadow-none"
                              : "border-defaultborder/70 hover:-translate-y-px hover:border-primary/35 hover:shadow-md dark:border-white/10"
                          }`}
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-1.5">
                              <i className="ri-draggable shrink-0 text-[0.875rem] text-slate-300 transition-colors group-hover:text-slate-400 dark:text-white/20" aria-hidden />
                              <span className="truncate font-mono text-[0.625rem] font-semibold uppercase tracking-wide text-primary">
                                {getDevTicketDisplayId(ticket)}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              {showPriority && (
                                <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wide ${pri.badge}`}>
                                  <i className={`${pri.icon} text-[0.5rem]`} />
                                  {ticket.priority}
                                </span>
                              )}
                              <span className={`h-2.5 w-2.5 rounded-full ring-2 ring-white dark:ring-bodybg ${sev.dot}`} title={ticket.severity} />
                            </div>
                          </div>

                          <h4 className="mb-3 line-clamp-2 text-[0.875rem] font-semibold leading-snug text-defaulttextcolor dark:text-white">
                            {ticket.title}
                          </h4>

                          <div className="flex items-center justify-between gap-2 border-t border-defaultborder/50 pt-2.5 dark:border-white/10">
                            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.6875rem] text-slate-500 dark:text-white/45">
                              {ticket.module && (
                                <span className="font-medium text-slate-600 dark:text-white/60">{formatDevTicketModuleLabel(ticket.module)}</span>
                              )}
                              {ticket.module && <span className="text-slate-300 dark:text-white/20">·</span>}
                              <span className="tabular-nums">{age}d</span>
                            </div>
                            {ticket.assignedTo ? (
                              <span
                                className="avatar avatar-xs avatar-rounded shrink-0 bg-primary/10 text-primary text-[0.5rem] font-bold ring-2 ring-white dark:ring-bodybg"
                                title={ticket.assignedTo.name ?? ticket.assignedTo.email}
                              >
                                {getInitials(ticket.assignedTo.name, ticket.assignedTo.email)}
                              </span>
                            ) : (
                              <span className="text-[0.625rem] text-slate-300 dark:text-white/25" title="Unassigned">—</span>
                            )}
                          </div>

                          {ticket.labels && ticket.labels.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1">
                              {ticket.labels.slice(0, 3).map((lbl) => (
                                <span key={lbl} className={`inline-flex rounded-full px-2 py-0.5 text-[0.5625rem] font-medium ${LABEL_CONFIG[lbl]?.badge ?? "bg-slate-100 text-slate-600"}`}>
                                  {LABEL_CONFIG[lbl]?.label ?? lbl}
                                </span>
                              ))}
                              {ticket.labels.length > 3 && (
                                <span className="text-[0.5625rem] text-slate-400">+{ticket.labels.length - 3}</span>
                              )}
                            </div>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      <DevTicketDetailDrawer
        open={drawerOpen}
        ticket={drawerTicket}
        onClose={() => { setDrawerOpen(false); setDrawerTicket(null); }}
        onTicketUpdated={(updated) => {
          const uid = getTicketDbId(updated);
          setDrawerTicket(updated);
          setTickets((prev) => prev.map((t) => (getTicketDbId(t) === uid ? updated : t)));
        }}
        onOpenLinkedTicket={async (linkedId) => {
          try {
            setDrawerTicket(await getDevTicket(linkedId));
          } catch {
            showToast("Could not open linked ticket");
          }
        }}
        currentUserId={userId ?? ""}
        isAdmin={isAdmin}
        canEdit={drawerTicket ? canEditDevTicket(drawerTicket, userId, isAdmin) : false}
        usersList={usersList}
      />
    </Fragment>
  );
}
