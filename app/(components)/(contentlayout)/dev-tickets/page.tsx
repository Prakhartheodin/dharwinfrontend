"use client";

import Seo from "@/shared/layout-components/seo/seo";
import DevTicketAccessDenied from "@/shared/components/dev-tickets/dev-ticket-access-denied";
import DevTicketTabBar from "@/shared/components/dev-tickets/dev-ticket-tab-bar";
import DevTicketDetailDrawer from "@/shared/components/dev-tickets/dev-ticket-detail-drawer";
import DevTicketModulePageFields from "@/shared/components/dev-tickets/dev-ticket-module-page-fields";
import { DEV_TICKET_MODULE_LABELS, formatDevTicketModuleLabel } from "@/shared/components/dev-tickets/dev-ticket-modules";
import {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  SEVERITY_CONFIG,
  LABEL_CONFIG,
  canEditDevTicket,
  computeAgeDays,
  formatFileSize,
  getDevTicketDisplayId,
  getInitials,
  getTicketDbId,
} from "@/shared/components/dev-tickets/dev-ticket-config";
import {
  bulkUpdate,
  createDevTicket,
  deleteDevTicket,
  getDevTicket,
  hasDevTicketsView,
  listDevTickets,
  updateDevTicket,
  DEV_TICKET_LABELS,
  type DevTicket,
  type DevTicketFilters,
  type DevTicketLabel,
} from "@/shared/lib/api/devTickets";
import { listUsers } from "@/shared/lib/api/users";
import { useAuth } from "@/shared/contexts/auth-context";
import Swal from "sweetalert2";
import { useRouter, useSearchParams } from "next/navigation";
import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";

type ScopeFilter = DevTicketFilters["scope"];

const SCOPES: { key: ScopeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mine", label: "Assigned to me" },
  { key: "reported", label: "Reported by me" },
  { key: "unassigned", label: "Unassigned" },
];

const TICKET_FILTER_SELECT_CLASS =
  "form-control min-w-[8.5rem] flex-1 sm:flex-none sm:w-auto !min-h-[2.375rem] !shrink-0 !py-1.5 !px-2 !text-[0.75rem]";

function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div aria-live="polite" className="fixed bottom-6 left-1/2 z-[200] -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-[0.8125rem] text-white shadow-lg dark:bg-white dark:text-slate-900">
      {message}
    </div>
  );
}

export default function DevTicketsPage() {
  const { user, permissions, isPlatformSuperUser, isAdministrator, permissionsLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const canView = hasDevTicketsView(permissions, isPlatformSuperUser);
  const isAdmin = Boolean(isAdministrator || isPlatformSuperUser);
  const userId = user?.id;

  const [tickets, setTickets] = useState<DevTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [scope, setScope] = useState<ScopeFilter>((searchParams.get("scope") as ScopeFilter) || "all");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") ?? "");
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get("priority") ?? "");
  const [severityFilter, setSeverityFilter] = useState(searchParams.get("severity") ?? "");
  const [labelFilter, setLabelFilter] = useState(searchParams.get("label") ?? "");
  const [moduleFilter, setModuleFilter] = useState(searchParams.get("module") ?? "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get("page") ?? 1));
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") ?? "createdAt:desc");
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [scopeCounts, setScopeCounts] = useState<Record<string, number>>({});

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [drawerTicket, setDrawerTicket] = useState<DevTicket | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [usersList, setUsersList] = useState<{ id: string; name?: string; email: string }[]>([]);
  const [bulkAssignUser, setBulkAssignUser] = useState("");
  const [bulkLabel, setBulkLabel] = useState<DevTicketLabel>("regression");
  const [showBulkBar, setShowBulkBar] = useState(false);

  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    stepsToReproduce: "",
    pageUrl: "",
    priority: "Medium" as DevTicket["priority"],
    severity: "Major" as DevTicket["severity"],
    module: "",
    environment: "Staging" as DevTicket["environment"],
    labels: [] as DevTicketLabel[],
    assignedTo: "",
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentErrors, setAttachmentErrors] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchAbortRef = useRef<AbortController | null>(null);
  const fetchGenerationRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);
  const prevDebouncedSearchRef = useRef(searchQuery);

  const [assignModalTicket, setAssignModalTicket] = useState<DevTicket | null>(null);
  const [assignUserId, setAssignUserId] = useState("");

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      const trimmedPrev = prevDebouncedSearchRef.current.trim();
      const trimmedNext = searchQuery.trim();
      if (trimmedPrev !== trimmedNext) {
        setCurrentPage(1);
      }
      prevDebouncedSearchRef.current = searchQuery;
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  const syncUrl = useCallback(
    (overrides: Record<string, string | number> = {}) => {
      const params = new URLSearchParams();
      const vals: Record<string, string | number> = {
        scope: scope ?? "all",
        status: statusFilter,
        priority: priorityFilter,
        severity: severityFilter,
        label: labelFilter,
        module: moduleFilter,
        search: debouncedSearch,
        page: currentPage,
        sortBy,
        ...overrides,
      };
      Object.entries(vals).forEach(([k, v]) => {
        if (v && v !== "all" && v !== 1 && v !== "createdAt:desc") params.set(k, String(v));
        else if (k === "page" && Number(v) > 1) params.set(k, String(v));
        else if (k === "scope" && v !== "all") params.set(k, String(v));
      });
      const qs = params.toString();
      router.replace(qs ? `/dev-tickets?${qs}` : "/dev-tickets", { scroll: false });
    },
    [scope, statusFilter, priorityFilter, severityFilter, labelFilter, moduleFilter, debouncedSearch, currentPage, sortBy, router]
  );

  const buildFilters = useCallback((): DevTicketFilters => {
    const f: DevTicketFilters = { page: currentPage, limit, sortBy, scope: scope ?? "all" };
    if (statusFilter) f.status = statusFilter as DevTicketFilters["status"];
    if (priorityFilter) f.priority = priorityFilter as DevTicketFilters["priority"];
    if (severityFilter) f.severity = severityFilter as DevTicketFilters["severity"];
    if (labelFilter) f.label = labelFilter as DevTicketLabel;
    if (moduleFilter.trim()) f.module = moduleFilter.trim();
    if (debouncedSearch.trim()) f.search = debouncedSearch.trim();
    return f;
  }, [currentPage, limit, sortBy, scope, statusFilter, priorityFilter, severityFilter, labelFilter, moduleFilter, debouncedSearch]);

  const fetchTickets = useCallback(async () => {
    if (!canView) {
      fetchAbortRef.current?.abort();
      fetchAbortRef.current = null;
      fetchGenerationRef.current += 1;
      setLoading(false);
      setRefreshing(false);
      return;
    }

    fetchAbortRef.current?.abort();
    const generation = ++fetchGenerationRef.current;
    const ac = new AbortController();
    fetchAbortRef.current = ac;

    const isInitial = !hasLoadedOnceRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const data = await listDevTickets(buildFilters(), { signal: ac.signal });
      if (generation !== fetchGenerationRef.current) return;
      setTickets(data.results ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotalResults(data.totalResults ?? 0);
      hasLoadedOnceRef.current = true;
    } catch (err: unknown) {
      if (generation !== fetchGenerationRef.current) return;
      const e = err as { response?: { data?: { message?: string } }; message?: string; code?: string; name?: string };
      if (e?.code === "ERR_CANCELED" || e?.name === "CanceledError") return;
      setError(e?.response?.data?.message ?? e?.message ?? "Failed to fetch tickets");
      setTickets([]);
      setTotalResults(0);
    } finally {
      if (generation === fetchGenerationRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [canView, buildFilters]);

  const fetchScopeCounts = useCallback(async () => {
    if (!canView) return;
    try {
      const scopes: ScopeFilter[] = ["all", "mine", "reported", "unassigned"];
      const results = await Promise.all(
        scopes.map((s) => listDevTickets({ scope: s, limit: 1, page: 1 }))
      );
      const counts: Record<string, number> = {};
      scopes.forEach((s, i) => {
        counts[s ?? "all"] = results[i]?.totalResults ?? 0;
      });
      setScopeCounts(counts);
    } catch {
      /* ignore */
    }
  }, [canView]);

  useEffect(() => {
    fetchTickets();
    return () => {
      fetchAbortRef.current?.abort();
      fetchGenerationRef.current += 1;
    };
  }, [fetchTickets]);

  useEffect(() => {
    syncUrl();
  }, [syncUrl]);

  useEffect(() => {
    fetchScopeCounts();
  }, [fetchScopeCounts]);

  useEffect(() => {
    const ticketParam = searchParams.get("ticket");
    if (!ticketParam || !canView) return;
    let cancelled = false;
    getDevTicket(ticketParam)
      .then((t) => {
        if (!cancelled) {
          setDrawerTicket(t);
          setDrawerOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled) showToast("Could not open ticket from link");
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, canView, showToast]);

  useEffect(() => {
    listUsers({ page: 1, limit: 500 })
      .then((res) => setUsersList((res.results ?? []).map((u) => ({ id: u.id ?? "", name: u.name, email: u.email ?? "" }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "c" && !e.metaKey && !e.ctrlKey && !drawerOpen && !showCreateModal) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        setShowCreateModal(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, showCreateModal]);

  const isSearchDebouncing = searchQuery.trim() !== debouncedSearch.trim();
  const isSearchBusy = isSearchDebouncing || refreshing;
  const activeFilterCount = [statusFilter, priorityFilter, severityFilter, labelFilter, moduleFilter, searchQuery.trim()].filter(Boolean).length;
  const hasActiveFilters = activeFilterCount > 0;
  const isListBusy = loading || refreshing || isSearchDebouncing;

  const pageStats = useMemo(
    () => ({
      open: tickets.filter((t) => t.status === "Open").length,
      inProgress: tickets.filter((t) => t.status === "In Progress").length,
      resolved: tickets.filter((t) => t.status === "Resolved").length,
      critical: tickets.filter((t) => t.severity === "Blocker" || t.severity === "Critical").length,
    }),
    [tickets]
  );

  const allPageSelected = tickets.length > 0 && tickets.every((t) => selectedIds.has(getTicketDbId(t)));
  const someSelected = tickets.some((t) => selectedIds.has(getTicketDbId(t)));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tickets.map((t) => getTicketDbId(t))));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openDrawer = async (ticket: DevTicket) => {
    setDrawerTicket(ticket);
    setDrawerOpen(true);
    const id = getTicketDbId(ticket);
    if (id) {
      try {
        const latest = await getDevTicket(id);
        setDrawerTicket(latest);
      } catch {
        /* keep */
      }
    }
  };

  const handleTicketUpdated = (updated: DevTicket) => {
    const id = getTicketDbId(updated);
    setDrawerTicket(updated);
    setTickets((prev) => prev.map((t) => (getTicketDbId(t) === id ? updated : t)));
    fetchScopeCounts();
  };

  const clearSearch = () => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    prevDebouncedSearchRef.current = "";
    setSearchQuery("");
    setDebouncedSearch("");
    setCurrentPage(1);
  };

  const clearFilters = () => {
    clearSearch();
    setStatusFilter("");
    setPriorityFilter("");
    setSeverityFilter("");
    setLabelFilter("");
    setModuleFilter("");
  };

  const addFiles = (files: File[]) => {
    const errors: string[] = [];
    const valid: File[] = [];
    const allowed = ["image/", "video/", "application/pdf", "text/plain", "text/log"];
    if (attachments.length + files.length > 10) {
      errors.push("Maximum 10 files allowed.");
      setAttachmentErrors(errors);
      return;
    }
    files.forEach((f) => {
      const ok = allowed.some((p) => f.type.startsWith(p) || f.name.endsWith(".log"));
      if (!ok) errors.push(`${f.name}: type not allowed`);
      else valid.push(f);
    });
    setAttachmentErrors(errors);
    setAttachments((prev) => [...prev, ...valid]);
  };

  const handleCreate = async () => {
    if (createForm.title.trim().length < 5) {
      await Swal.fire({ icon: "warning", title: "Title must be at least 5 characters." });
      return;
    }
    if (createForm.description.trim().length < 10) {
      await Swal.fire({ icon: "warning", title: "Description must be at least 10 characters." });
      return;
    }
    try {
      setCreating(true);
      await createDevTicket({
        ...createForm,
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        attachments: attachments.length ? attachments : undefined,
      });
      setShowCreateModal(false);
      setCreateForm({ title: "", description: "", stepsToReproduce: "", pageUrl: "", priority: "Medium", severity: "Major", module: "", environment: "Staging", labels: [], assignedTo: "" });
      setAttachments([]);
      showToast("Ticket created successfully");
      fetchTickets();
      fetchScopeCounts();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      await Swal.fire({ icon: "error", title: "Failed", text: e?.response?.data?.message ?? e?.message ?? "Could not create ticket." });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (ticket: DevTicket) => {
    const id = getTicketDbId(ticket);
    if (!id) return;
    const result = await Swal.fire({ title: "Delete ticket?", icon: "warning", showCancelButton: true, confirmButtonColor: "#d33", confirmButtonText: "Delete" });
    if (!result.isConfirmed) return;
    try {
      await deleteDevTicket(id);
      if (drawerTicket && getTicketDbId(drawerTicket) === id) {
        setDrawerOpen(false);
        setDrawerTicket(null);
      }
      showToast("Ticket deleted");
      fetchTickets();
      fetchScopeCounts();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      await Swal.fire({ icon: "error", title: "Delete failed", text: e?.response?.data?.message ?? e?.message });
    }
  };

  const handleBulkClose = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const result = await bulkUpdate(ids, { status: "Closed" });
    if (result.skipped.length) showToast(`${result.updated.length} closed, ${result.skipped.length} skipped (no permission)`);
    else showToast(`${result.updated.length} ticket(s) closed`);
    setSelectedIds(new Set());
    fetchTickets();
    fetchScopeCounts();
  };

  const handleBulkAssign = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length || !bulkAssignUser) return;
    const result = await bulkUpdate(ids, { assignedTo: bulkAssignUser });
    if (result.skipped.length) showToast(`${result.updated.length} assigned, ${result.skipped.length} skipped`);
    else showToast(`${result.updated.length} ticket(s) assigned`);
    setSelectedIds(new Set());
    setShowBulkBar(false);
    fetchTickets();
  };

  const handleBulkLabel = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    const result = await bulkUpdate(ids, { addLabel: bulkLabel });
    if (result.skipped.length) showToast(`${result.updated.length} labeled, ${result.skipped.length} skipped`);
    else showToast(`Label added to ${result.updated.length} ticket(s)`);
    setSelectedIds(new Set());
    fetchTickets();
  };

  const toggleSort = (field: string) => {
    const [curField, curDir] = sortBy.split(":");
    if (curField === field) {
      setSortBy(`${field}:${curDir === "asc" ? "desc" : "asc"}`);
    } else {
      setSortBy(`${field}:desc`);
    }
  };

  if (!permissionsLoaded) {
    return (
      <div className="container-fluid pt-6">
        <div className="py-16 text-center text-[#8c9097]">Loading…</div>
      </div>
    );
  }

  if (!canView) {
    return (
      <Fragment>
        <Seo title="Help & Support" />
        <DevTicketAccessDenied />
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Help & Support" />
      <Toast message={toast} />

      <div className="container-fluid pt-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-[1.125rem] font-semibold text-defaulttextcolor dark:text-white">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <i className="ri-lifebuoy-line text-[1rem]" />
              </span>
              Help &amp; Support
            </h1>
            <p className="mt-1 text-[0.8125rem] text-[#8c9097] dark:text-white/50">Internal dev &amp; bug tracker</p>
          </div>
          <button type="button" onClick={() => setShowCreateModal(true)} className="ti-btn ti-btn-primary ti-btn-wave inline-flex items-center gap-2 !px-4 !py-2 !text-[0.8125rem]">
            <i className="ri-add-line" /> Create Ticket
          </button>
        </div>

        <DevTicketTabBar />

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Open", count: pageStats.open, icon: "ri-radio-button-line", cls: "bg-primary/10 text-primary" },
            { label: "In Progress", count: pageStats.inProgress, icon: "ri-loader-4-line", cls: "bg-warning/10 text-warning" },
            { label: "Resolved", count: pageStats.resolved, icon: "ri-checkbox-circle-line", cls: "bg-success/10 text-success" },
            { label: "Blocker / Critical", count: pageStats.critical, icon: "ri-alarm-warning-line", cls: "bg-danger/10 text-danger" },
          ].map((s) => (
            <div key={s.label} className="box !mb-0">
              <div className="box-body !flex !items-center !gap-3 !p-4">
                <span className={`avatar avatar-sm rounded-md ${s.cls}`}><i className={`${s.icon} text-[1rem]`} /></span>
                <div>
                  <p className="mb-0 text-[0.6875rem] text-[#8c9097]">{s.label}</p>
                  <p className="mb-0 text-[1.125rem] font-semibold">{s.count}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scope tabs */}
        <div className="mb-4 inline-flex flex-wrap gap-1 rounded-lg border border-defaultborder p-1 dark:border-white/10">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => { setScope(s.key); setCurrentPage(1); }}
              className={`rounded-md px-3 py-1.5 text-[0.75rem] font-medium transition ${scope === s.key ? "bg-primary text-white" : "text-[#8c9097] hover:bg-slate-100 dark:hover:bg-white/5"}`}
            >
              {s.label}
              <span className="ms-1.5 tabular-nums opacity-70">({scopeCounts[s.key ?? "all"] ?? 0})</span>
            </button>
          ))}
        </div>

        <div className="box">
          <div className="box-header justify-between">
            <div className="box-title">All Tickets</div>
            <span className="text-[0.75rem] text-[#8c9097]">
              {error ? "—" : `${totalResults} results`}
              {!error && activeFilterCount > 0 && ` · ${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="box-body">
            <div className="mb-4 space-y-3">
              <div className="relative max-w-xl">
                <span
                  className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center"
                  aria-hidden
                >
                  {isSearchBusy ? (
                    <span className="flex h-4 w-4 items-center justify-center">
                      <i className="ri-loader-4-line animate-spin text-base leading-none text-primary" />
                    </span>
                  ) : (
                    <i className="ri-search-line text-base leading-none text-[#8c9097]" />
                  )}
                </span>
                <input
                  type="text"
                  role="searchbox"
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search ticket ID, title, description…"
                  aria-label="Search tickets"
                  aria-busy={isSearchBusy}
                  className={`form-control !rounded-md !ps-10 !text-[0.8125rem] ${searchQuery ? "!pe-10" : "!pe-3"}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[#8c9097] transition-colors hover:text-defaulttextcolor"
                    aria-label="Clear search"
                  >
                    <i className="ri-close-line text-base leading-none" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {[
                  { label: "Status", val: statusFilter, set: setStatusFilter, opts: Object.keys(STATUS_CONFIG) },
                  { label: "Priority", val: priorityFilter, set: setPriorityFilter, opts: Object.keys(PRIORITY_CONFIG) },
                  { label: "Severity", val: severityFilter, set: setSeverityFilter, opts: Object.keys(SEVERITY_CONFIG) },
                ].map((f) => (
                  <select key={f.label} value={f.val} onChange={(e) => { f.set(e.target.value); setCurrentPage(1); }} className={TICKET_FILTER_SELECT_CLASS}>
                    <option value="">{f.label}: All</option>
                    {f.opts.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ))}
                <select value={labelFilter} onChange={(e) => { setLabelFilter(e.target.value); setCurrentPage(1); }} className={TICKET_FILTER_SELECT_CLASS}>
                  <option value="">Label: All</option>
                  {DEV_TICKET_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                <select value={moduleFilter} onChange={(e) => { setModuleFilter(e.target.value); setCurrentPage(1); }} className={`${TICKET_FILTER_SELECT_CLASS} sm:max-w-[200px]`}>
                  <option value="">Module: All</option>
                  {DEV_TICKET_MODULE_LABELS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                {hasActiveFilters && (
                  <div className="w-full shrink-0 sm:w-auto">
                    <button
                      type="button"
                      onClick={clearFilters}
                      aria-label="Clear all filters"
                      className="ti-btn ti-btn-sm ti-btn-soft-danger !inline-flex !shrink-0 !flex-none !items-center !justify-center !gap-1.5 !whitespace-nowrap !px-3 !py-2 !min-h-[2.375rem] !h-auto !w-full !text-[0.75rem] sm:!w-auto"
                    >
                      <i className="ri-filter-off-line text-[0.875rem]" aria-hidden />
                      Clear all
                    </button>
                  </div>
                )}
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
                <span className="text-[0.8125rem] font-medium">{selectedIds.size} selected</span>
                <button type="button" onClick={() => setShowBulkBar(true)} className="ti-btn ti-btn-sm ti-btn-soft-primary">Assign</button>
                <select
                  value={bulkLabel}
                  onChange={(e) => setBulkLabel(e.target.value as DevTicketLabel)}
                  className="form-control !w-auto !py-1 !px-2 !text-[0.75rem]"
                  aria-label="Bulk label"
                >
                  {DEV_TICKET_LABELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <button type="button" onClick={handleBulkLabel} className="ti-btn ti-btn-sm ti-btn-soft-info">Label</button>
                <button type="button" onClick={handleBulkClose} className="ti-btn ti-btn-sm ti-btn-soft-success">Close</button>
                <button type="button" onClick={() => setSelectedIds(new Set())} className="ti-btn ti-btn-sm ti-btn-light ms-auto">Clear</button>
              </div>
            )}

            {error && (
              <div role="alert" aria-live="assertive" className="mb-4 flex flex-col gap-3 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="min-w-0 flex-1 text-[0.8125rem] leading-snug text-danger">{error}</span>
                <button type="button" onClick={fetchTickets} className="ti-btn ti-btn-sm ti-btn-danger !inline-flex !shrink-0 !items-center !justify-center !gap-1.5 !self-start !whitespace-nowrap !px-4 !py-2 sm:!self-center">
                  <i className="ri-refresh-line" aria-hidden />
                  Retry
                </button>
              </div>
            )}

            {loading && tickets.length === 0 ? (
              <div className="space-y-3">{[1, 2, 3, 4, 5].map((n) => <div key={n} className="h-12 animate-pulse rounded bg-black/5 dark:bg-white/10" />)}</div>
            ) : tickets.length === 0 ? (
              <div className="py-16 text-center">
                <i className="ri-bug-line mb-3 text-[2.5rem] text-primary/40" />
                <h3 className="text-base font-semibold">{hasActiveFilters ? "No tickets match these filters" : "No tickets yet"}</h3>
                <p className="text-[0.8125rem] text-[#8c9097]">{hasActiveFilters ? "Try adjusting or clearing filters." : "Create the first dev ticket to get started."}</p>
                {hasActiveFilters ? (
                  <button type="button" onClick={clearFilters} className="ti-btn ti-btn-primary mt-4">Clear filters</button>
                ) : (
                  <button type="button" onClick={() => setShowCreateModal(true)} className="ti-btn ti-btn-primary mt-4">Create ticket</button>
                )}
              </div>
            ) : (
              <div className={`relative transition-opacity ${isListBusy ? "opacity-60" : ""}`} aria-busy={isListBusy}>
                <div className="table-responsive">
                <table className="table table-hover table-bordered min-w-full whitespace-nowrap">
                  <thead>
                    <tr>
                      <th className="!w-10">
                        <input type="checkbox" checked={allPageSelected} ref={(el) => { if (el) el.indeterminate = someSelected && !allPageSelected; }} onChange={toggleSelectAll} aria-label="Select all" />
                      </th>
                      <th>Ticket</th>
                      <th>Subject</th>
                      <th>Status</th>
                      <th>
                        <button type="button" onClick={() => toggleSort("severity")} className="font-semibold hover:text-primary">Severity {sortBy.startsWith("severity") && (sortBy.endsWith("asc") ? "↑" : "↓")}</button>
                      </th>
                      <th>Module</th>
                      <th>Priority</th>
                      <th>Assignee</th>
                      <th>
                        <button type="button" onClick={() => toggleSort("createdAt")} className="font-semibold hover:text-primary">Age {sortBy.startsWith("createdAt") && (sortBy.endsWith("asc") ? "↑" : "↓")}</button>
                      </th>
                      <th className="!text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => {
                      const id = getTicketDbId(ticket);
                      const sc = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.Open;
                      const sev = SEVERITY_CONFIG[ticket.severity] ?? SEVERITY_CONFIG.Major;
                      const pc = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.Medium;
                      const age = computeAgeDays(ticket.createdAt);
                      const isOpenStatus = ticket.status !== "Resolved" && ticket.status !== "Closed";
                      const editable = canEditDevTicket(ticket, userId, isAdmin);
                      return (
                        <tr key={id} className="cursor-pointer hover:bg-gray-50/50 dark:hover:bg-light/5" onClick={() => openDrawer(ticket)}>
                          <td onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" checked={selectedIds.has(id)} onChange={() => toggleSelect(id)} aria-label={`Select ${getDevTicketDisplayId(ticket)}`} />
                          </td>
                          <td><span className="font-mono text-[0.75rem] font-semibold text-primary">{getDevTicketDisplayId(ticket)}</span></td>
                          <td>
                            <p className="mb-0 max-w-[240px] truncate text-[0.8125rem] font-medium">{ticket.title}</p>
                            {ticket.labels && ticket.labels.length > 0 && (
                              <div className="mt-0.5 flex flex-wrap gap-1">
                                {ticket.labels.map((lbl) => (
                                  <span key={lbl} className={`badge !rounded-full !text-[0.6rem] ${LABEL_CONFIG[lbl]?.badge ?? ""}`}>{lbl}</span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td><span className={`badge !rounded-full !text-[0.6875rem] ${sc.badge}`}>{ticket.status}</span></td>
                          <td><span className={`badge !rounded-full !text-[0.6875rem] ${sev.badge}`}>{ticket.severity}</span></td>
                          <td className="text-[0.8125rem] text-[#8c9097]">{ticket.module ? formatDevTicketModuleLabel(ticket.module) : "—"}</td>
                          <td><span className={`badge !rounded-full !text-[0.6875rem] ${pc.badge}`}>{ticket.priority}</span></td>
                          <td>
                            {ticket.assignedTo ? (
                              <span className="avatar avatar-xs avatar-rounded bg-primary/10 text-primary text-[0.55rem] font-bold" title={ticket.assignedTo.name ?? ticket.assignedTo.email}>
                                {getInitials(ticket.assignedTo.name, ticket.assignedTo.email)}
                              </span>
                            ) : (
                              <span className="text-[0.75rem] text-[#8c9097]">—</span>
                            )}
                          </td>
                          <td>
                            <span className={`text-[0.75rem] tabular-nums ${isOpenStatus && age > 28 ? "font-semibold text-rose-600" : ""}`}>{age}d</span>
                          </td>
                          <td className="!text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button type="button" onClick={() => openDrawer(ticket)} className="ti-btn ti-btn-icon ti-btn-sm ti-btn-soft-primary" aria-label="View"><i className="ri-eye-line" /></button>
                              {editable && (
                                <>
                                  <button type="button" onClick={() => { setAssignModalTicket(ticket); setAssignUserId(ticket.assignedTo?.id ?? ticket.assignedTo?._id ?? ""); }} className="ti-btn ti-btn-icon ti-btn-sm ti-btn-soft-info" aria-label="Assign"><i className="ri-user-add-line" /></button>
                                  <button type="button" onClick={() => handleDelete(ticket)} className="ti-btn ti-btn-icon ti-btn-sm ti-btn-soft-danger" aria-label="Delete"><i className="ri-delete-bin-5-line" /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="box-footer flex items-center justify-between">
              <p className="mb-0 text-[0.75rem] text-[#8c9097]">Page {currentPage} of {totalPages}</p>
              <div className="flex gap-1">
                <button type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)} className="ti-btn ti-btn-sm ti-btn-light">Prev</button>
                <button type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)} className="ti-btn ti-btn-sm ti-btn-light">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <DevTicketDetailDrawer
        open={drawerOpen}
        ticket={drawerTicket}
        onClose={() => { setDrawerOpen(false); setDrawerTicket(null); }}
        onTicketUpdated={handleTicketUpdated}
        onOpenLinkedTicket={async (linkedId) => {
          try {
            const linked = await getDevTicket(linkedId);
            setDrawerTicket(linked);
          } catch { showToast("Could not open linked ticket"); }
        }}
        currentUserId={userId ?? ""}
        isAdmin={isAdmin}
        canEdit={drawerTicket ? canEditDevTicket(drawerTicket, userId, isAdmin) : false}
        usersList={usersList}
      />

      {/* Create modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[105] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[5vh]" onClick={() => setShowCreateModal(false)}>
          <div className="w-full max-w-2xl rounded-md bg-white shadow-lg dark:bg-bodybg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h6 className="text-[0.9375rem] font-semibold">Create Dev Ticket</h6>
              <button type="button" onClick={() => setShowCreateModal(false)} className="ti-btn ti-btn-icon ti-btn-sm ti-btn-light"><i className="ri-close-line" /></button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="form-label">Title <span className="text-danger">*</span></label>
                <input className="form-control" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} onBlur={() => {}} />
              </div>
              <div>
                <label className="form-label">Description <span className="text-danger">*</span></label>
                <textarea className="form-control" rows={4} value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Steps to reproduce</label>
                <textarea className="form-control" rows={3} value={createForm.stepsToReproduce} onChange={(e) => setCreateForm((f) => ({ ...f, stepsToReproduce: e.target.value }))} />
              </div>
              <div
                className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition ${dragOver ? "border-primary bg-primary/5" : "border-defaultborder"}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)); }}
              >
                <i className="ri-upload-cloud-2-line mb-2 text-[2rem] text-primary/50" />
                <p className="mb-2 text-[0.8125rem]">Drag files here or <span className="text-primary underline">browse</span></p>
                <p className="mb-0 text-[0.6875rem] text-[#8c9097]">Images, video, PDF, logs — max 10 files</p>
                <input ref={fileInputRef} type="file" multiple className="hidden" accept="image/*,video/*,.pdf,.log,.txt" onChange={(e) => addFiles(Array.from(e.target.files ?? []))} />
              </div>
              {attachmentErrors.length > 0 && <p className="text-[0.75rem] text-danger">{attachmentErrors.join(", ")}</p>}
              {attachments.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded border px-3 py-2">
                  <i className="ri-file-line" />
                  <span className="flex-1 truncate text-[0.8125rem]">{f.name}</span>
                  <span className="text-[0.6875rem] text-[#8c9097]">{formatFileSize(f.size)}</span>
                  <button type="button" onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))}><i className="ri-close-line" /></button>
                </div>
              ))}
              <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                <div>
                  <label className="form-label">Severity</label>
                  <select className="form-control form-control-block" value={createForm.severity} onChange={(e) => setCreateForm((f) => ({ ...f, severity: e.target.value as DevTicket["severity"] }))}>
                    {Object.keys(SEVERITY_CONFIG).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Priority</label>
                  <select className="form-control form-control-block" value={createForm.priority} onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value as DevTicket["priority"] }))}>
                    {Object.keys(PRIORITY_CONFIG).map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Environment</label>
                  <select className="form-control form-control-block" value={createForm.environment} onChange={(e) => setCreateForm((f) => ({ ...f, environment: e.target.value as DevTicket["environment"] }))}>
                    <option value="Staging">Staging</option>
                    <option value="Production">Production</option>
                  </select>
                </div>
              </div>
              <DevTicketModulePageFields
                module={createForm.module}
                pageUrl={createForm.pageUrl}
                onModuleChange={(module) => setCreateForm((f) => ({ ...f, module }))}
                onPageUrlChange={(pageUrl) => setCreateForm((f) => ({ ...f, pageUrl }))}
              />
              <div>
                <label className="form-label">Assign to</label>
                <Select
                  classNamePrefix="react-select"
                  className="react-select-container"
                  isClearable
                  isSearchable
                  placeholder="Search user…"
                  options={usersList.map((u) => ({ value: u.id, label: u.name ? `${u.name} — ${u.email}` : u.email }))}
                  value={usersList.filter((u) => u.id === createForm.assignedTo).map((u) => ({ value: u.id, label: u.name ? `${u.name} — ${u.email}` : u.email }))[0] ?? null}
                  onChange={(opt) => setCreateForm((f) => ({ ...f, assignedTo: opt?.value ?? "" }))}
                  menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
                  styles={{ menuPortal: (base) => ({ ...base, zIndex: 200 }) }}
                />
              </div>
              <div>
                <label className="form-label">Labels</label>
                <div className="flex flex-wrap gap-1.5">
                  {DEV_TICKET_LABELS.map((lbl) => {
                    const sel = createForm.labels.includes(lbl);
                    return (
                      <button key={lbl} type="button" onClick={() => setCreateForm((f) => ({ ...f, labels: sel ? f.labels.filter((l) => l !== lbl) : [...f.labels, lbl] }))} className={`badge !rounded-full cursor-pointer ${sel ? LABEL_CONFIG[lbl].badge : "bg-slate-100 text-slate-500"}`}>{lbl}</button>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-4">
              <button type="button" onClick={() => setShowCreateModal(false)} className="ti-btn ti-btn-light">Cancel</button>
              <button type="button" onClick={handleCreate} disabled={creating} className="ti-btn ti-btn-primary">
                {creating ? <><span className="me-1 inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Creating…</> : "Create Ticket"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk assign modal */}
      {showBulkBar && (
        <div className="fixed inset-0 z-[106] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowBulkBar(false)}>
          <div className="w-full max-w-sm rounded-md bg-white p-5 dark:bg-bodybg" onClick={(e) => e.stopPropagation()}>
            <h6 className="mb-3 font-semibold">Bulk assign</h6>
            <select className="form-control mb-3" value={bulkAssignUser} onChange={(e) => setBulkAssignUser(e.target.value)}>
              <option value="">Select user</option>
              {usersList.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowBulkBar(false)} className="ti-btn ti-btn-light">Cancel</button>
              <button type="button" onClick={handleBulkAssign} className="ti-btn ti-btn-primary">Assign</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick assign modal */}
      {assignModalTicket && (
        <div className="fixed inset-0 z-[106] flex items-center justify-center bg-black/50 p-4" onClick={() => setAssignModalTicket(null)}>
          <div className="w-full max-w-sm rounded-md bg-white p-5 dark:bg-bodybg" onClick={(e) => e.stopPropagation()}>
            <h6 className="mb-3 font-semibold">Assign ticket</h6>
            <select className="form-control mb-3" value={assignUserId} onChange={(e) => setAssignUserId(e.target.value)}>
              <option value="">Unassigned</option>
              {usersList.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAssignModalTicket(null)} className="ti-btn ti-btn-light">Cancel</button>
              <button
                type="button"
                onClick={async () => {
                  const id = getTicketDbId(assignModalTicket);
                  if (!id) return;
                  try {
                    const updated = await updateDevTicket(id, { assignedTo: assignUserId || null });
                    handleTicketUpdated(updated);
                    setAssignModalTicket(null);
                    showToast("Assignment updated");
                  } catch {
                    showToast("Assign failed");
                  }
                }}
                className="ti-btn ti-btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
