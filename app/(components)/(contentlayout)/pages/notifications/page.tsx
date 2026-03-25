"use client"
import Pageheader from '@/shared/layout-components/page-header/pageheader'
import Seo from '@/shared/layout-components/seo/seo'
import Link from 'next/link'
import React, { Fragment, useEffect, useMemo, useState } from 'react'
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, type Notification, type NotificationType } from '@/shared/lib/api/notifications'

const NOTIFICATIONS_UNREAD_EVENT = 'dharwin:notifications-unread-count'

const notifyUnreadCount = async () => {
  try {
    const count = await getUnreadCount()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UNREAD_EVENT, { detail: { count } }))
    }
  } catch (_) {}
}

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatTimeAgo = (dateStr: string) => {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 60) return `${mins} mins ago`;
  if (hrs < 24) return `${hrs} hrs ago`;
  if (days < 7) return `${days} days ago`;
  return formatDate(dateStr);
};

const TYPE_LABELS: Record<NotificationType | 'all', string> = {
  all: 'All',
  leave: 'Leave',
  task: 'Tasks',
  offer: 'Offers',
  meeting: 'Meetings',
  meeting_reminder: 'Reminders',
  course: 'Course',
  certificate: 'Certificates',
  job_application: 'Applications',
  project: 'Projects',
  account: 'Account',
  recruiter: 'Recruiter',
  assignment: 'Assignment',
  sop: 'Onboarding SOP',
  general: 'General',
};

const TYPE_CHIPS: { value: NotificationType | 'all'; label: string }[] = [
  { value: 'all', label: TYPE_LABELS.all },
  { value: 'leave', label: TYPE_LABELS.leave },
  { value: 'task', label: TYPE_LABELS.task },
  { value: 'offer', label: TYPE_LABELS.offer },
  { value: 'meeting', label: TYPE_LABELS.meeting },
  { value: 'meeting_reminder', label: TYPE_LABELS.meeting_reminder },
  { value: 'course', label: TYPE_LABELS.course },
  { value: 'certificate', label: TYPE_LABELS.certificate },
  { value: 'job_application', label: TYPE_LABELS.job_application },
  { value: 'project', label: TYPE_LABELS.project },
  { value: 'account', label: TYPE_LABELS.account },
  { value: 'recruiter', label: TYPE_LABELS.recruiter },
  { value: 'sop', label: TYPE_LABELS.sop },
  { value: 'general', label: TYPE_LABELS.general },
];

const getTypeBadgeClass = (type: NotificationType): string => {
  const map: Record<NotificationType, string> = {
    leave: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    task: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    offer: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
    meeting: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400',
    meeting_reminder: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    course: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
    certificate: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    job_application: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    project: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
    account: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    recruiter: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
    assignment: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
    sop: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
    general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };
  return map[type] ?? map.general;
};

const Notifications = () => {
  const [list, setList] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');

  const load = async (pageNum = 1, append = false) => {
    setLoading(true);
    try {
      const res = await getNotifications({ page: pageNum, limit: 20 });
      setList((prev) => (append ? [...prev, ...(res.results || [])] : (res.results || [])));
      setTotalPages(res.totalPages || 1);
      setTotalResults(res.totalResults ?? 0);
      setPage(pageNum);
    } catch (_) {
      if (!append) setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredList = useMemo(() => {
    if (typeFilter === 'all') return list;
    return list.filter((n) => n.type === typeFilter);
  }, [list, typeFilter]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
      await load(1);
      await notifyUnreadCount();
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await markAsRead(id);
      setList((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
      await notifyUnreadCount();
    } catch (_) {}
  };

  return (
    <Fragment>
      <Seo title={'Notifications'} />
      <Pageheader currentpage="Notifications" activepage="Pages" mainpage="Notifications" />
      <div className="space-y-6 mt-3">
        <div className="box">
          <div className="box-header flex items-center justify-between gap-3 overflow-visible">
            <div className="box-title min-w-0 flex-1 overflow-hidden">
              <span className="block truncate text-defaulttextcolor">
                Notifications{totalResults > 0 ? ` (${totalResults} total)` : ''}
              </span>
            </div>
            {list.length > 0 && (
              <button
                type="button"
                className="ti-btn ti-btn-sm ti-btn-soft-primary !w-auto !h-auto !min-h-[1.75rem] py-1.5 px-3 shrink-0 whitespace-nowrap me-4"
                disabled={markingAll}
                onClick={handleMarkAllRead}
              >
                {markingAll ? (
                  <>
                    <span className="ti-spinner !h-4 !w-4 inline-block align-middle me-1" role="status" />
                    Loading
                  </>
                ) : (
                  'Mark all as read'
                )}
              </button>
            )}
          </div>
          <div className="box-body">
            {/* Type filter chips - override ti-btn-sm fixed size so labels don't overlap */}
            <div className="flex flex-wrap gap-2 mb-4">
              {TYPE_CHIPS.map((chip) => {
                const isActive = typeFilter === chip.value;
                return (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => setTypeFilter(chip.value)}
                    className={`ti-btn ti-btn-sm !w-auto !h-auto !min-h-[1.75rem] py-1.5 px-3 shrink-0 whitespace-nowrap ${isActive ? 'ti-btn-primary' : 'ti-btn-light'}`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {loading && list.length === 0 ? (
              <div className="text-center py-12">
                <i className="ri-loader-4-line animate-spin text-4xl text-primary mb-4" />
                <p className="text-defaulttextcolor">Loading notifications...</p>
              </div>
            ) : filteredList.length === 0 ? (
              <div className="text-center py-12">
                <i className="ri-inbox-line text-5xl text-defaulttextcolor/50 mb-4" />
                <p className="text-defaulttextcolor">
                  {list.length === 0 ? 'No notifications yet.' : `No ${typeFilter === 'all' ? '' : TYPE_LABELS[typeFilter].toLowerCase() + ' '}notifications.`}
                </p>
              </div>
            ) : (
              <ul className="list-none mb-0 space-y-3">
                {filteredList.map((n) => (
                  <li key={n._id}>
                    <div
                      className={`box border rounded-lg ${n.read ? 'border-defaultborder' : 'un-read border-primary/30 bg-primary/5'}`}
                    >
                      <div className="box-body !p-4">
                        <div className="flex items-start gap-4">
                          <Link href={n.link || '#!'} scroll={false} className="flex-grow min-w-0">
                            <div className="flex items-start gap-3">
                              <span className="avatar avatar-md avatar-rounded bg-primary/10 text-primary !text-[.875rem] font-semibold shrink-0">
                                {n.title.charAt(0) || 'N'}
                              </span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span
                                    className={`badge text-[0.6875rem] font-medium ${getTypeBadgeClass(n.type)}`}
                                  >
                                    {TYPE_LABELS[n.type]}
                                  </span>
                                </div>
                                <p className="mb-0 text-[.875rem] font-semibold">{n.title}</p>
                                <p className="mb-0 text-[#8c9097] dark:text-white/50 text-[0.8125rem] whitespace-pre-line">{n.message}</p>
                                <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                                  {formatTimeAgo(n.createdAt)}
                                </span>
                              </div>
                            </div>
                          </Link>
                          <div className="flex flex-col items-start gap-2 shrink-0">
                            <span className="badge bg-light text-[#8c9097] dark:text-white/50 text-[0.75rem] whitespace-nowrap">
                              {formatDate(n.createdAt)}
                            </span>
                            {!n.read && (
                              <button
                                type="button"
                                className="ti-btn ti-btn-sm ti-btn-soft-primary whitespace-nowrap"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleMarkOneRead(n._id);
                                }}
                              >
                                Mark as read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {!loading && list.length > 0 && totalPages > 1 && page < totalPages && (
              <div className="!text-center mt-4">
                <button
                  type="button"
                  className="ti-btn ti-btn-info"
                  disabled={loading}
                  onClick={() => load(page + 1, true)}
                >
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Fragment>
  )
}

export default Notifications
