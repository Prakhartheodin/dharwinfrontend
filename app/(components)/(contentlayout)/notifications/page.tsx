"use client";

import Seo from "@/shared/layout-components/seo/seo";
import { useRouter } from "next/navigation";
import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
  type Notification,
  type NotificationType,
} from "@/shared/lib/api/notifications";
import { useNotificationContext } from "@/shared/contexts/NotificationContext";

const TYPE_LABELS: Record<NotificationType | "all", string> = {
  all: "All",
  leave: "Leave",
  task: "Tasks",
  offer: "Offers",
  meeting: "Meetings",
  meeting_reminder: "Reminders",
  course: "Course",
  certificate: "Certificates",
  job_application: "Applications",
  project: "Projects",
  account: "Account",
  recruiter: "Recruiter",
  assignment: "Assignment",
  sop: "Onboarding SOP",
  support_ticket: "Support",
  chat_message: "Chat",
  joining_reminder: "Joining",
  placement_update: "Placement",
  onboarding_reminder: "Onboarding",
  system: "System",
  general: "General",
};

const TYPE_CHIPS: { value: NotificationType | "all"; label: string }[] = [
  { value: "all", label: TYPE_LABELS.all },
  { value: "leave", label: TYPE_LABELS.leave },
  { value: "task", label: TYPE_LABELS.task },
  { value: "offer", label: TYPE_LABELS.offer },
  { value: "meeting", label: TYPE_LABELS.meeting },
  { value: "meeting_reminder", label: TYPE_LABELS.meeting_reminder },
  { value: "course", label: TYPE_LABELS.course },
  { value: "project", label: TYPE_LABELS.project },
  { value: "account", label: TYPE_LABELS.account },
  { value: "recruiter", label: TYPE_LABELS.recruiter },
  { value: "sop", label: TYPE_LABELS.sop },
  { value: "general", label: TYPE_LABELS.general },
];

const TYPE_BADGE_MAP: Record<NotificationType, string> = {
  leave: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  task: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  offer: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  meeting: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  meeting_reminder: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  course: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  certificate: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  job_application: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300",
  project: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  account: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  recruiter: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  assignment: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  sop: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  support_ticket: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  chat_message: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  joining_reminder: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  placement_update: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  onboarding_reminder: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  system: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  general: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
};

const getTypeBadgeClass = (type: NotificationType): string =>
  TYPE_BADGE_MAP[type] ?? TYPE_BADGE_MAP.general;

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
};

const formatTimeAgo = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} mins ago`;
  if (hrs < 24) return `${hrs} hrs ago`;
  if (days < 7) return `${days} days ago`;
  return formatDate(dateStr);
};

const Notifications = () => {
  const router = useRouter();
  const { markRead: ctxMarkRead, markAllRead: ctxMarkAllRead, openNotification } = useNotificationContext();

  const [list, setList] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");
  const [onlyUnread, setOnlyUnread] = useState(false);

  const unreadCount = useMemo(() => list.filter((n) => !n.read).length, [list]);
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: list.length };
    for (const n of list) counts[n.type] = (counts[n.type] ?? 0) + 1;
    return counts;
  }, [list]);

  const load = useCallback(async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const res = await getNotifications({ page: pageNum, limit: 20 });
      setList((prev) => (append ? [...prev, ...(res.results || [])] : res.results || []));
      setTotalPages(res.totalPages || 1);
      setTotalResults(res.totalResults ?? 0);
      setPage(pageNum);
    } catch (_) {
      if (!append) setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredList = useMemo(() => {
    let out = list;
    if (typeFilter !== "all") out = out.filter((n) => n.type === typeFilter);
    if (onlyUnread) out = out.filter((n) => !n.read);
    return out;
  }, [list, typeFilter, onlyUnread]);

  const groupedList = useMemo(() => {
    const groups: { label: string; items: Notification[] }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const buckets: Record<string, Notification[]> = { Today: [], Yesterday: [], "This week": [], Earlier: [] };
    for (const n of filteredList) {
      const d = new Date(n.createdAt);
      const key = Number.isNaN(d.getTime())
        ? "Earlier"
        : d >= today
        ? "Today"
        : d >= yesterday
        ? "Yesterday"
        : d >= weekAgo
        ? "This week"
        : "Earlier";
      buckets[key].push(n);
    }
    for (const label of ["Today", "Yesterday", "This week", "Earlier"]) {
      if (buckets[label].length) groups.push({ label, items: buckets[label] });
    }
    return groups;
  }, [filteredList]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
      await ctxMarkAllRead();
      await load(1);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await markAsRead(id);
      setList((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      await ctxMarkRead(id);
    } catch (_) {}
  };

  const handleNotificationClick = useCallback(
    async (n: Notification) => {
      const route = await openNotification(n);
      setList((prev) => prev.map((p) => (p._id === n._id ? { ...p, read: true } : p)));
      router.push(route);
    },
    [openNotification, router]
  );

  return (
    <Fragment>
      <Seo title={"Notifications"} />
      <div className="pt-6 md:pt-8 space-y-5">
        <div className="box overflow-hidden border-0 shadow-sm">
          <div className="relative px-5 py-5 md:px-6 md:py-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-defaultborder/60">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="inline-flex items-center justify-center h-9 w-9 rounded-xl bg-primary/15 text-primary">
                    <i className="ri-notification-3-line text-lg" />
                  </span>
                  <h1 className="text-[1.25rem] md:text-[1.375rem] font-semibold text-defaulttextcolor leading-none">
                    Notifications
                  </h1>
                  {unreadCount > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary text-white text-[0.6875rem] font-semibold px-2 py-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 ms-12">
                  {totalResults > 0
                    ? `${totalResults} total · ${unreadCount} unread`
                    : "You're all caught up."}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOnlyUnread((v) => !v)}
                  className={`ti-btn ti-btn-sm !w-auto !h-auto !min-h-[2rem] py-1.5 px-3 whitespace-nowrap ${
                    onlyUnread ? "ti-btn-primary" : "ti-btn-light"
                  }`}
                >
                  <i className={`ri-${onlyUnread ? "filter-fill" : "filter-line"} me-1`} />
                  Unread only
                </button>
                {list.length > 0 && unreadCount > 0 && (
                  <button
                    type="button"
                    className="ti-btn ti-btn-sm ti-btn-primary !w-auto !h-auto !min-h-[2rem] py-1.5 px-3 whitespace-nowrap"
                    disabled={markingAll}
                    onClick={handleMarkAllRead}
                  >
                    {markingAll ? (
                      <>
                        <span className="ti-spinner !h-4 !w-4 inline-block align-middle me-1" role="status" />
                        Marking
                      </>
                    ) : (
                      <>
                        <i className="ri-check-double-line me-1" />
                        Mark all read
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="box-body !p-5 md:!p-6">
            <div className="flex flex-wrap gap-2 mb-5 -mx-1 px-1 overflow-x-auto pb-1">
              {TYPE_CHIPS.map((chip) => {
                const isActive = typeFilter === chip.value;
                const count = typeCounts[chip.value] ?? 0;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setTypeFilter(chip.value)}
                    className={`group inline-flex items-center gap-1.5 rounded-full !w-auto !h-auto !min-h-[1.875rem] py-1.5 px-3 text-[0.75rem] font-medium whitespace-nowrap shrink-0 transition-all duration-200 border ${
                      isActive
                        ? "bg-primary text-white border-primary shadow-sm"
                        : "bg-white dark:bg-bodybg2 text-defaulttextcolor border-defaultborder hover:border-primary/40 hover:text-primary"
                    }`}
                  >
                    {chip.label}
                    <span
                      className={`inline-flex items-center justify-center min-w-[1.25rem] h-[1.125rem] px-1 rounded-full text-[0.625rem] font-semibold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-defaultborder/60 dark:bg-white/10 text-defaulttextcolor group-hover:bg-primary/10 group-hover:text-primary"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {loading && list.length === 0 ? (
              <div className="text-center py-16">
                <i className="ri-loader-4-line animate-spin text-4xl text-primary mb-3 block" />
                <p className="text-[0.875rem] text-defaulttextcolor/70">Loading notifications…</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-16 px-4">
                <span className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 text-primary mb-4">
                  <i className="ri-inbox-line text-3xl" />
                </span>
                <p className="text-[0.95rem] font-semibold text-defaulttextcolor mb-1">
                  {list.length === 0 ? "Inbox zero" : "Nothing here"}
                </p>
                <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50">
                  {list.length === 0
                    ? "New notifications will appear here."
                    : `No ${
                        typeFilter === "all" ? "" : TYPE_LABELS[typeFilter].toLowerCase() + " "
                      }${onlyUnread ? "unread " : ""}notifications.`}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {groupedList.map((group) => (
                  <section key={group.label}>
                    <div className="flex items-center gap-3 mb-3">
                      <h2 className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-[#8c9097] dark:text-white/50">
                        {group.label}
                      </h2>
                      <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/40">
                        {group.items.length}
                      </span>
                      <div className="flex-1 h-px bg-defaultborder/60" />
                    </div>
                    <ul className="list-none mb-0 space-y-2">
                      {group.items.map((n) => (
                          <li key={n._id}>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => handleNotificationClick(n)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleNotificationClick(n);
                                }
                              }}
                              aria-label={`${n.title} — open notification`}
                              className={`group relative rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.998] ${
                                n.read
                                  ? "border-defaultborder/70 bg-white dark:bg-bodybg2"
                                  : "un-read border-primary/30 bg-primary/[0.04] dark:bg-primary/[0.08]"
                              }`}
                            >
                              {!n.read && (
                                <span className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-primary" />
                              )}
                              <div className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className="flex-grow min-w-0 flex items-start gap-3">
                                    <span className="relative shrink-0">
                                      <span className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary !text-[.95rem] font-bold uppercase">
                                        {n.title.charAt(0) || "N"}
                                      </span>
                                      {!n.read && (
                                        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-white dark:ring-bodybg2" />
                                      )}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                                        <span
                                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[0.6875rem] font-medium ${getTypeBadgeClass(
                                            n.type
                                          )}`}
                                        >
                                          {TYPE_LABELS[n.type] ?? n.type}
                                        </span>
                                        <span className="text-[0.7rem] text-[#8c9097] dark:text-white/50">
                                          {formatTimeAgo(n.createdAt)}
                                        </span>
                                      </div>
                                      <p className={`mb-0.5 text-[.875rem] leading-snug ${n.read ? "font-medium text-defaulttextcolor" : "font-semibold text-defaulttextcolor"}`}>
                                        {n.title}
                                      </p>
                                      <p className="mb-0 text-[#8c9097] dark:text-white/50 text-[0.8125rem] leading-relaxed whitespace-pre-line line-clamp-2">
                                        {n.message}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2 shrink-0">
                                    <span className="text-[0.6875rem] text-[#8c9097] dark:text-white/40 whitespace-nowrap">
                                      {formatDate(n.createdAt)}
                                    </span>
                                    {!n.read && (
                                      <button
                                        type="button"
                                        title="Mark as read"
                                        className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleMarkOneRead(n._id);
                                        }}
                                      >
                                        <i className="ri-check-line text-[0.95rem]" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}

            {!loading && list.length > 0 && totalPages > 1 && page < totalPages && (
              <div className="!text-center mt-6">
                <button
                  type="button"
                  className="ti-btn ti-btn-light !w-auto !h-auto !min-h-[2.25rem] py-2 px-5 whitespace-nowrap"
                  disabled={loading}
                  onClick={() => load(page + 1, true)}
                >
                  {loading ? (
                    <>
                      <span className="ti-spinner !h-4 !w-4 inline-block align-middle me-2" role="status" />
                      Loading
                    </>
                  ) : (
                    <>
                      <i className="ri-arrow-down-line me-1" />
                      Load more
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default Notifications;
