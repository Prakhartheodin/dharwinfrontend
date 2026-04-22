"use client";

import Seo from "@/shared/layout-components/seo/seo";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/shared/contexts/auth-context";
import {
  listReferralLeads,
  getReferralLeadsStats,
  downloadReferralLeadsExport,
  postReferralAttributionOverride,
  type ReferralLeadRow,
  type ReferralLeadsQueryParams,
  type ReferralLeadsStatsResponse,
} from "@/shared/lib/api/referralLeads";
import { LINK_TYPE, STATUS_META, getStatusMeta } from "@/shared/lib/ats/referral-leads-constants";

function canManageCandidatesFromPermissions(permissions: string[]): boolean {
  return permissions.some(
    (p) =>
      p.includes("ats.candidates:view,create,edit,delete") ||
      p.includes("candidates.manage") ||
      p === "candidates.manage"
  );
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

type DatePreset = "all" | "week" | "month" | "quarter";

function rangeForPreset(preset: DatePreset): { from?: string; to?: string } {
  if (preset === "all") return {};
  const to = new Date();
  const from = new Date(to);
  if (preset === "week") from.setDate(from.getDate() - 7);
  if (preset === "month") from.setMonth(from.getMonth() - 1);
  if (preset === "quarter") from.setMonth(from.getMonth() - 3);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function attributionLabel(lead: ReferralLeadRow): { text: string; tone: "ok" | "warn" | "muted" } {
  if (lead.referralAttributionAnonymised) {
    return { text: "Attribution anonymised", tone: "warn" };
  }
  if (lead.attributionLockedAt) {
    return { text: "Attribution confirmed", tone: "ok" };
  }
  if (lead.referredAt) {
    return { text: "Attribution pending", tone: "muted" };
  }
  return { text: "—", tone: "muted" };
}

export default function ReferralLeadsPage() {
  const { permissions, permissionsLoaded } = useAuth();
  const canManage = useMemo(
    () => (permissionsLoaded ? canManageCandidatesFromPermissions(permissions) : false),
    [permissions, permissionsLoaded]
  );

  const [list, setList] = useState<ReferralLeadRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState<ReferralLeadsStatsResponse | null>(null);
  const [statsSnapshot, setStatsSnapshot] = useState<number | null>(null);
  const [staleBanner, setStaleBanner] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterReferrer, setFilterReferrer] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const [selected, setSelected] = useState<ReferralLeadRow | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideUserId, setOverrideUserId] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideSaving, setOverrideSaving] = useState(false);

  const baseParams = useMemo((): ReferralLeadsQueryParams => {
    const { from, to } =
      customFrom || customTo
        ? { from: customFrom || undefined, to: customTo || undefined }
        : rangeForPreset(datePreset);
    return {
      search: search.trim() || undefined,
      referredByUserId: filterReferrer || undefined,
      referralContext: (filterType as ReferralLeadsQueryParams["referralContext"]) || undefined,
      referralPipelineStatus: filterStatus || undefined,
      from,
      to,
    };
  }, [search, filterReferrer, filterType, filterStatus, datePreset, customFrom, customTo]);

  const refresh = useCallback(async () => {
    if (!permissionsLoaded) return;
    setLoading(true);
    setError(null);
    setStaleBanner(false);
    try {
      const params: ReferralLeadsQueryParams = { ...baseParams, limit: 25 };
      const [res, st] = await Promise.all([listReferralLeads(params), getReferralLeadsStats(baseParams)]);
      setList(res.results);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
      setStats(st);
      setStatsSnapshot(st.totalReferrals);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "message" in e ? String((e as { message: string }).message) : "Failed to load";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [permissionsLoaded, baseParams]);

  useEffect(() => {
    if (!permissionsLoaded) return;
    void refresh();
  }, [permissionsLoaded, baseParams, refresh]);

  useEffect(() => {
    if (!permissionsLoaded) return;
    const t = setInterval(() => {
      void (async () => {
        try {
          const s = await getReferralLeadsStats(baseParams);
          setStatsSnapshot((prev) => {
            if (prev != null && s.totalReferrals !== prev) {
              setStaleBanner(true);
            }
            return s.totalReferrals;
          });
          setStats(s);
        } catch {
          /* ignore poll errors */
        }
      })();
    }, 60_000);
    return () => clearInterval(t);
  }, [permissionsLoaded, baseParams]);

  const distinctReferrers = useMemo(() => {
    const m = new Map<string, { id: string; name: string }>();
    for (const r of list) {
      if (r.referredBy?.id) {
        m.set(r.referredBy.id, { id: r.referredBy.id, name: r.referredBy.name || r.referredBy.email || "Referrer" });
      }
    }
    return [...m.values()];
  }, [list]);

  const hasActiveFilters = useMemo(
    () =>
      !!search ||
      !!filterReferrer ||
      !!filterType ||
      !!filterStatus ||
      datePreset !== "all" ||
      !!customFrom ||
      !!customTo,
    [search, filterReferrer, filterType, filterStatus, datePreset, customFrom, customTo]
  );

  const clearFilters = () => {
    setSearch("");
    setFilterReferrer("");
    setFilterType("");
    setFilterStatus("");
    setDatePreset("all");
    setCustomFrom("");
    setCustomTo("");
  };

  const showEmptyNoData = !loading && !error && list.length === 0 && !hasActiveFilters;
  const showEmptyFiltered = !loading && !error && list.length === 0 && hasActiveFilters;

  const onExport = async () => {
    try {
      await downloadReferralLeadsExport(baseParams);
    } catch {
      alert("Export failed. Check permissions and try again.");
    }
  };

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoading(true);
    try {
      const res = await listReferralLeads({ ...baseParams, limit: 25, cursor: nextCursor });
      setList((prev) => [...prev, ...res.results]);
      setNextCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load more failed");
    } finally {
      setLoading(false);
    }
  };

  const onOverrideSubmit = async () => {
    if (!selected?.id) return;
    if (!overrideUserId.trim() || !overrideReason.trim()) return;
    setOverrideSaving(true);
    try {
      await postReferralAttributionOverride(selected.id, {
        newReferredByUserId: overrideUserId.trim(),
        reason: overrideReason.trim(),
      });
      setOverrideOpen(false);
      setOverrideUserId("");
      setOverrideReason("");
      await refresh();
      setSelected(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Override failed");
    } finally {
      setOverrideSaving(false);
    }
  };

  return (
    <React.Fragment>
      <Seo title="Referral leads" />
      <div className="p-4 md:p-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ATS / Referral leads
            </p>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">Referral leads</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Candidates who arrived through a tracked referral link{canManage ? " (organization view)" : " (your referrals)"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              className="ti-btn ti-btn-primary !py-2"
              disabled={loading}
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void onExport()}
              className="ti-btn ti-btn-light border border-slate-200 dark:border-white/10 !py-2"
            >
              Export CSV
            </button>
          </div>
        </div>

        {staleBanner && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 px-4 py-3 text-sm text-amber-900 dark:text-amber-100 flex flex-wrap items-center justify-between gap-2">
            <span>New referral data may be available — refresh to update the list.</span>
            <button type="button" className="ti-btn ti-btn-sm ti-btn-primary" onClick={() => void refresh()}>
              Refresh now
            </button>
          </div>
        )}

        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Total referrals</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalReferrals}</p>
              <p className="text-xs text-slate-500 mt-0.5">In current filters</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Converted</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.converted}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stats.conversionRate}% rate</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Pending</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-slate-500">Hired + top referrer</p>
              <p className="text-2xl font-bold text-violet-600 mt-1">{stats.hired}</p>
              {stats.topReferrer && (
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate" title={stats.topReferrer.name}>
                  {stats.topReferrer.name} ({stats.topReferrer.count})
                </p>
              )}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-bgdark2 p-4 mb-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="form-label text-xs">Search</label>
            <input
              className="form-control form-control-sm w-full"
              placeholder="Name, email, job…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {canManage && (
            <div>
              <label className="form-label text-xs">Referrer</label>
              <select
                className="form-select form-select-sm min-w-[160px]"
                value={filterReferrer}
                onChange={(e) => setFilterReferrer(e.target.value)}
              >
                <option value="">All referrers</option>
                {distinctReferrers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="form-label text-xs">Link type</label>
            <select
              className="form-select form-select-sm min-w-[140px]"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All types</option>
              <option value="SHARE_CANDIDATE_ONBOARD">Onboard invite</option>
              <option value="JOB_APPLY">Job link</option>
            </select>
          </div>
          <div>
            <label className="form-label text-xs">Status</label>
            <select
              className="form-select form-select-sm min-w-[150px]"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label text-xs">Date range</label>
            <select
              className="form-select form-select-sm min-w-[140px]"
              value={datePreset}
              onChange={(e) => {
                setDatePreset(e.target.value as DatePreset);
                setCustomFrom("");
                setCustomTo("");
              }}
            >
              <option value="all">All time</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="quarter">Last 90 days</option>
            </select>
          </div>
          <div>
            <label className="form-label text-xs">From</label>
            <input
              type="date"
              className="form-control form-control-sm w-[150px]"
              value={customFrom}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                if (e.target.value) setDatePreset("all");
              }}
            />
          </div>
          <div>
            <label className="form-label text-xs">To</label>
            <input
              type="date"
              className="form-control form-control-sm w-[150px]"
              value={customTo}
              onChange={(e) => {
                setCustomTo(e.target.value);
                if (e.target.value) setDatePreset("all");
              }}
            />
          </div>
          {hasActiveFilters && (
            <button type="button" className="ti-btn ti-btn-light ti-btn-sm" onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-4 mb-4">
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">Couldn&apos;t load referral leads</p>
            <p className="text-xs text-red-600 dark:text-red-300 mt-1">{error}</p>
            <button type="button" className="ti-btn ti-btn-sm ti-btn-primary mt-3" onClick={() => void refresh()}>
              Try again
            </button>
          </div>
        )}

        {loading && list.length === 0 && !error && (
          <div className="rounded-xl border border-slate-200 dark:border-white/10 p-12 text-center text-slate-500">
            Loading referral leads…
          </div>
        )}

        {showEmptyNoData && (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/20 p-10 text-center">
            <p className="text-slate-700 dark:text-slate-200 font-medium">No referral data yet</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto">
              Leads show after a candidate <strong>completes registration</strong> from a{" "}
              <strong>Share candidate onboarding</strong> link, or from a job/public link that includes a signed{" "}
              <code className="text-xs bg-slate-100 dark:bg-white/10 px-1 rounded">?ref=</code> token. Invites sent before
              this behavior shipped may not have attribution; send a new invite or add attribution via admin tools if
              needed.
            </p>
            <Link href="/ats/share-candidate-form" className="inline-block mt-4 text-primary hover:underline text-sm">
              Open share candidate form
            </Link>
          </div>
        )}

        {showEmptyFiltered && (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/20 p-10 text-center">
            <p className="text-slate-700 dark:text-slate-200 font-medium">No leads match these filters</p>
            <button type="button" className="ti-btn ti-btn-sm ti-btn-primary mt-3" onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}

        {!showEmptyNoData && !showEmptyFiltered && !error && (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Referred by</th>
                  <th className="px-4 py-3">Link</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Claimed</th>
                  <th className="px-4 py-3">Batch</th>
                </tr>
              </thead>
              <tbody>
                {list.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50/80 dark:hover:bg-white/5 cursor-pointer"
                    onClick={() => setSelected(lead)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800 dark:text-white">{lead.fullName}</div>
                      <div className="text-xs text-slate-500">{lead.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {lead.referralAttributionAnonymised ? (
                        <span className="text-slate-400">Anonymised</span>
                      ) : (
                        <>
                          {lead.referredBy?.name || "—"}
                          {lead.referredBy?.email && (
                            <div className="text-xs text-slate-500">{lead.referredBy.email}</div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.referralContext ? (
                        <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium bg-indigo-50 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200">
                          {LINK_TYPE[lead.referralContext] || lead.referralContext}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{lead.job?.title || "—"}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const st = (lead.referralPipelineStatus || "pending") as keyof typeof STATUS_META;
                        const m = getStatusMeta(st);
                        return (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
                            style={{ background: m.bg, color: m.color }}
                          >
                            {m.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      <div>{fmtDate(lead.referredAt || lead.createdAt)}</div>
                      <div className="text-xs text-slate-400">{fmtTime(lead.referredAt || lead.createdAt)}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{lead.referralBatchId || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && !loading && list.length > 0 && (
          <div className="flex justify-center mt-4">
            <button
              type="button"
              className="ti-btn ti-btn-light"
              onClick={() => void loadMore()}
            >
              Load more
            </button>
          </div>
        )}

        {selected && (
          <div
            className="fixed inset-0 z-50 flex"
            role="dialog"
            aria-modal="true"
            aria-label="Referral detail"
          >
            <div className="absolute inset-0 bg-black/40" onClick={() => setSelected(null)} />
            <aside className="relative ml-auto h-full w-full max-w-md bg-white dark:bg-bgdark2 shadow-2xl flex flex-col overflow-y-auto">
              <div className="p-5 border-b border-slate-200 dark:border-white/10 flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">Referral detail</p>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-1">{selected.fullName}</h2>
                  <p className="text-sm text-slate-500">{selected.email}</p>
                </div>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="p-5 space-y-4 flex-1">
                {(() => {
                  const a = attributionLabel(selected);
                  return (
                    <div
                      className={`text-sm font-medium ${
                        a.tone === "ok"
                          ? "text-emerald-700 dark:text-emerald-300"
                          : a.tone === "warn"
                            ? "text-amber-700 dark:text-amber-200"
                            : "text-slate-600"
                      }`}
                    >
                      {a.text}
                    </div>
                  );
                })()}

                {!selected.referralAttributionAnonymised && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Referred by</p>
                    <p className="font-medium text-slate-800 dark:text-white">
                      {selected.referredBy?.name || "—"}{" "}
                      {selected.referredBy?.email && (
                        <span className="text-slate-500 text-sm block">{selected.referredBy.email}</span>
                      )}
                    </p>
                  </div>
                )}

                {selected.referralContext && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Link type</p>
                    <p>{LINK_TYPE[selected.referralContext] || selected.referralContext}</p>
                    {selected.job?.title && <p className="text-sm text-slate-600 mt-1">Job: {selected.job.title}</p>}
                  </div>
                )}

                {selected.referredAt && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Attribution time</p>
                    <p className="text-slate-800 dark:text-slate-100">
                      {fmtDate(selected.referredAt)} {fmtTime(selected.referredAt)}
                    </p>
                  </div>
                )}

                {selected.referralBatchId && (
                  <div className="rounded-lg bg-slate-50 dark:bg-white/5 p-3 text-sm">
                    <p className="text-xs text-slate-500">Batch</p>
                    <p className="font-mono text-slate-800 dark:text-slate-100">{selected.referralBatchId}</p>
                  </div>
                )}

                {selected.referralLastOverride?.overriddenAt && (
                  <div className="rounded-lg border border-slate-200 dark:border-white/10 p-3 text-sm">
                    <p className="text-xs text-slate-500 mb-1">Last override</p>
                    <p className="text-slate-700 dark:text-slate-200">{selected.referralLastOverride.reason}</p>
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <Link
                    href={`/ats/employees/edit?id=${encodeURIComponent(selected.id)}`}
                    className="ti-btn ti-btn-primary w-full block text-center"
                  >
                    View candidate profile
                  </Link>
                  {canManage && selected.attributionLockedAt && (
                    <button
                      type="button"
                      className="ti-btn ti-btn-outline-danger w-full"
                      onClick={() => {
                        setOverrideUserId("");
                        setOverrideReason("");
                        setOverrideOpen(true);
                      }}
                    >
                      Override attribution
                    </button>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}

        {overrideOpen && selected && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setOverrideOpen(false)} />
            <div className="relative bg-white dark:bg-bgdark2 rounded-xl border border-slate-200 dark:border-white/10 p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Override attribution</h3>
              <p className="text-sm text-slate-500 mt-1">
                Current: {selected.referredBy?.name || "—"}. Enter the new referrer user ID and a reason.
              </p>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="form-label">New referrer user ID</label>
                  <input
                    className="form-control w-full"
                    value={overrideUserId}
                    onChange={(e) => setOverrideUserId(e.target.value)}
                    placeholder="Mongo ObjectId"
                  />
                </div>
                <div>
                  <label className="form-label">Reason (required)</label>
                  <textarea
                    className="form-control w-full"
                    rows={3}
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button type="button" className="ti-btn ti-btn-light" onClick={() => setOverrideOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="ti-btn ti-btn-danger"
                  disabled={overrideSaving}
                  onClick={() => void onOverrideSubmit()}
                >
                  {overrideSaving ? "Saving…" : "Confirm override"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </React.Fragment>
  );
}
