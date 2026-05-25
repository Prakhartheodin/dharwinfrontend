"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getReferralAttributionOverrideHistory,
  type ReferralAttributionOverrideHistoryRow,
  type ReferralLeadRow,
} from "@/shared/lib/api/referralLeads";
import { getApiErrorMessage } from "@/shared/lib/api/client";
import { getSalesAgentHistory, type AttributionRow } from "../api/salesAgentAttribution";
import { fmtDate, fmtTime, userDisplay } from "../utils/format.util";

type HistoryTab = "referrer" | "salesAgent";

interface AttributionHistoryModalProps {
  lead: ReferralLeadRow;
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: HistoryTab;
  featureEnabled?: boolean;
}

function historyErrorMessage(err: unknown, fallback: string): string {
  const msg = getApiErrorMessage(err, fallback);
  if (/status code 404/i.test(msg)) {
    return "History is unavailable. Restart the backend after enabling the sales-agent feature flag, then try again.";
  }
  return msg;
}

export function AttributionHistoryModal({
  lead,
  isOpen,
  onClose,
  defaultTab = "referrer",
  featureEnabled = false,
}: AttributionHistoryModalProps) {
  const [tab, setTab] = useState<HistoryTab>(defaultTab);
  const [referrerRows, setReferrerRows] = useState<ReferralAttributionOverrideHistoryRow[]>([]);
  const [referrerLoading, setReferrerLoading] = useState(false);
  const [referrerError, setReferrerError] = useState<string | null>(null);
  const [referrerLoaded, setReferrerLoaded] = useState(false);

  const [salesRows, setSalesRows] = useState<AttributionRow[]>([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesError, setSalesError] = useState<string | null>(null);
  const [salesLoaded, setSalesLoaded] = useState(false);
  const [salesCursor, setSalesCursor] = useState<string | null>(null);
  const [salesHasMore, setSalesHasMore] = useState(false);

  const loadReferrerHistory = useCallback(async () => {
    setReferrerLoading(true);
    setReferrerError(null);
    try {
      const res = await getReferralAttributionOverrideHistory(lead.id);
      setReferrerRows(res.results ?? []);
      setReferrerLoaded(true);
    } catch (e: unknown) {
      setReferrerError(historyErrorMessage(e, "Could not load referrer override history."));
    } finally {
      setReferrerLoading(false);
    }
  }, [lead.id]);

  const loadSalesHistory = useCallback(
    async (cursor?: string | null, append = false) => {
      setSalesLoading(true);
      setSalesError(null);
      try {
        const res = await getSalesAgentHistory(lead.id, { limit: 50, cursor: cursor ?? undefined });
        setSalesRows((prev) => (append ? [...prev, ...(res.results ?? [])] : res.results ?? []));
        setSalesCursor(res.nextCursor);
        setSalesHasMore(res.hasMore);
        setSalesLoaded(true);
      } catch (e: unknown) {
        setSalesError(historyErrorMessage(e, "Could not load sales-agent history."));
      } finally {
        setSalesLoading(false);
      }
    },
    [lead.id]
  );

  useEffect(() => {
    if (!isOpen) return;
    setTab(defaultTab);
    setReferrerRows([]);
    setReferrerError(null);
    setReferrerLoaded(false);
    setSalesRows([]);
    setSalesError(null);
    setSalesLoaded(false);
    setSalesCursor(null);
    setSalesHasMore(false);
    void loadReferrerHistory();
  }, [isOpen, defaultTab, lead.id, loadReferrerHistory]);

  useEffect(() => {
    if (!isOpen || !featureEnabled || tab !== "salesAgent" || salesLoaded || salesLoading) return;
    void loadSalesHistory();
  }, [isOpen, featureEnabled, tab, salesLoaded, salesLoading, loadSalesHistory]);

  if (!isOpen) return null;

  const tabs: { id: HistoryTab; label: string }[] = featureEnabled
    ? [
        { id: "referrer", label: "Referrer overrides" },
        { id: "salesAgent", label: "Sales agent changes" },
      ]
    : [{ id: "referrer", label: "Referrer overrides" }];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} role="presentation" />
      <div
        className="relative flex max-h-[min(90vh,640px)] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-bgdark2"
        role="dialog"
        aria-labelledby="attribution-history-title"
      >
        <div className="shrink-0 border-b border-slate-200 p-4 dark:border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id="attribution-history-title" className="m-0 text-lg font-semibold text-slate-900 dark:text-white">
                Attribution history
              </h3>
              <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">
                {lead.fullName}
                {lead.email ? ` · ${lead.email}` : ""}
              </p>
            </div>
            <button type="button" className="ti-btn ti-btn-light ti-btn-sm shrink-0" onClick={onClose}>
              Close
            </button>
          </div>

          {featureEnabled && tabs.length > 1 && (
            <div
              className="mt-4 flex gap-1 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5"
              role="tablist"
              aria-label="Attribution history tabs"
            >
              {tabs.map(({ id, label }) => {
                const active = tab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    id={`attribution-history-tab-${id}`}
                    aria-selected={active}
                    aria-controls={`attribution-history-panel-${id}`}
                    className={`min-w-0 flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
                      active
                        ? "bg-white text-primary shadow-sm dark:bg-bgdark2"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                    }`}
                    onClick={() => setTab(id)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {tab === "referrer" && (
            <div role="tabpanel" id="attribution-history-panel-referrer" aria-labelledby="attribution-history-tab-referrer">
              {referrerLoading && <p className="m-0 text-sm text-slate-500 dark:text-slate-400">Loading…</p>}
              {referrerError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                  {referrerError}
                </div>
              )}
              {!referrerLoading && !referrerError && referrerRows.length === 0 && (
                <p className="m-0 text-sm text-slate-500 dark:text-slate-400">No override entries in the audit log yet.</p>
              )}
              {!referrerLoading && !referrerError && referrerRows.length > 0 && (
                <ul className="m-0 list-none space-y-3 p-0">
                  {referrerRows.map((row) => (
                    <li key={row.id} className="space-y-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10">
                      <div>
                        <p className="m-0 text-xs text-slate-500 dark:text-slate-400">When</p>
                        <p className="m-0 text-slate-800 dark:text-slate-100">
                          {row.createdAt ? `${fmtDate(row.createdAt)} ${fmtTime(row.createdAt)}` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-xs text-slate-500 dark:text-slate-400">By</p>
                        <p className="m-0 text-slate-800 dark:text-slate-100">{userDisplay(row.actor)}</p>
                      </div>
                      <div>
                        <p className="m-0 text-xs text-slate-500 dark:text-slate-400">Referrer change</p>
                        <p className="m-0 text-slate-800 dark:text-slate-100">
                          <span className="text-slate-500 dark:text-slate-400">From</span> {userDisplay(row.previousReferredBy)}
                          <span className="mx-1 text-slate-500 dark:text-slate-400">→</span>
                          <span className="text-slate-500 dark:text-slate-400">to</span> {userDisplay(row.newReferredBy)}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-xs text-slate-500 dark:text-slate-400">Reason</p>
                        <p className="m-0 text-slate-700 dark:text-slate-200">{row.reason?.trim() || "—"}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {featureEnabled && tab === "salesAgent" && (
            <div
              role="tabpanel"
              id="attribution-history-panel-salesAgent"
              aria-labelledby="attribution-history-tab-salesAgent"
            >
              {salesLoading && salesRows.length === 0 && (
                <p className="m-0 text-sm text-slate-500 dark:text-slate-400">Loading…</p>
              )}
              {salesError && (
                <div className="space-y-3">
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
                    {salesError}
                  </div>
                  <button
                    type="button"
                    className="ti-btn ti-btn-light ti-btn-sm"
                    onClick={() => {
                      setSalesLoaded(false);
                      void loadSalesHistory();
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
              {!salesLoading && !salesError && salesRows.length === 0 && (
                <p className="m-0 text-sm text-slate-500 dark:text-slate-400">No sales-agent attribution entries yet.</p>
              )}
              {!salesError && salesRows.length > 0 && (
                <ul className="m-0 list-none space-y-3 p-0">
                  {salesRows.map((row) => (
                    <li
                      key={row.id}
                      className={`space-y-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-white/10 ${
                        row.isRevoked ? "opacity-75" : ""
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          {row.isRevoked ? "Revoked assignment" : row.isCurrent ? "Current assignment" : "Past assignment"}
                        </p>
                        {row.isRevoked && row.revokeReason ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                            {row.revokeReason}
                          </span>
                        ) : null}
                      </div>
                      <div>
                        <p className="m-0 text-xs text-slate-500 dark:text-slate-400">When</p>
                        <p className="m-0 text-slate-800 dark:text-slate-100">
                          {row.assignedAt ? `${fmtDate(row.assignedAt)} ${fmtTime(row.assignedAt)}` : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-xs text-slate-500 dark:text-slate-400">Assigned sales agent</p>
                        <p className={`m-0 text-slate-800 dark:text-slate-100 ${row.isRevoked ? "line-through" : ""}`}>
                          {row.salesAgent?.name || row.salesAgentSnapshot?.name || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-xs text-slate-500 dark:text-slate-400">Scope</p>
                        <p className="m-0 text-slate-800 dark:text-slate-100">
                          {row.jobId ? row.jobTitle || row.jobSnapshot?.title || "Job-specific" : "All jobs (candidate-level)"}
                        </p>
                      </div>
                      <div>
                        <p className="m-0 text-xs text-slate-500 dark:text-slate-400">By</p>
                        <p className="m-0 text-slate-800 dark:text-slate-100">{userDisplay(row.assignedBy)}</p>
                      </div>
                      {row.notes ? (
                        <div>
                          <p className="m-0 text-xs text-slate-500 dark:text-slate-400">Notes</p>
                          <p className="m-0 text-slate-700 dark:text-slate-200">{row.notes}</p>
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {salesHasMore && !salesError && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    className="ti-btn ti-btn-light ti-btn-sm"
                    disabled={salesLoading}
                    onClick={() => void loadSalesHistory(salesCursor, true)}
                  >
                    {salesLoading ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
