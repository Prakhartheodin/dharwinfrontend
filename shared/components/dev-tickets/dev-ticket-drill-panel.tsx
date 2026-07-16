"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  listDevTickets,
  type DevTicket,
  type DevTicketFilters,
} from "@/shared/lib/api/devTickets";
import { useModalBehavior } from "@/shared/hooks/useModalBehavior";
import {
  STATUS_CONFIG,
  PRIORITY_CONFIG,
  SEVERITY_CONFIG,
  getDevTicketDisplayId,
  getTicketDbId,
} from "./dev-ticket-config";

export type DevTicketDrillDimension = "status" | "severity" | "priority" | "environment";

export type DevTicketDrillSelection = {
  dimension: DevTicketDrillDimension;
  label: string;
  count: number;
};

const DIMENSION_TITLES: Record<DevTicketDrillDimension, string> = {
  status: "By Status",
  severity: "By Severity",
  priority: "By Priority",
  environment: "By Environment",
};

function buildDrillFilters(selection: DevTicketDrillSelection, page: number): DevTicketFilters {
  const filters: DevTicketFilters = { page, limit: 20, sortBy: "createdAt:desc", scope: "all" };
  switch (selection.dimension) {
    case "status":
      filters.status = selection.label as DevTicketFilters["status"];
      break;
    case "severity":
      filters.severity = selection.label as DevTicketFilters["severity"];
      break;
    case "priority":
      filters.priority = selection.label as DevTicketFilters["priority"];
      break;
    case "environment":
      filters.environment = selection.label as DevTicketFilters["environment"];
      break;
  }
  return filters;
}

type DevTicketDrillPanelProps = {
  selection: DevTicketDrillSelection | null;
  onClose: () => void;
  onTicketClick: (ticket: DevTicket) => void;
};

export default function DevTicketDrillPanel({ selection, onClose, onTicketClick }: DevTicketDrillPanelProps) {
  const isOpen = Boolean(selection);
  const { containerRef, backdropProps, requestClose } = useModalBehavior({ isOpen, onClose });

  const [tickets, setTickets] = useState<DevTicket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!selection) return;
    setPage(1);
  }, [selection?.dimension, selection?.label]);

  useEffect(() => {
    if (!selection) {
      setTickets([]);
      setError(null);
      return;
    }

    let cancelled = false;
    const fetchTickets = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listDevTickets(buildDrillFilters(selection, page));
        if (!cancelled) {
          setTickets(data.results ?? []);
          setTotalPages(data.totalPages ?? 1);
          setTotalResults(data.totalResults ?? 0);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const e = err as { response?: { data?: { message?: string } }; message?: string };
          setError(e?.response?.data?.message ?? e?.message ?? "Failed to load tickets");
          setTickets([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTickets();
    return () => {
      cancelled = true;
    };
  }, [selection, page]);

  if (!isOpen || !selection || !mounted) return null;

  const dimensionTitle = DIMENSION_TITLES[selection.dimension];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 motion-reduce:transition-none sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-ticket-drill-title"
      aria-label={`${dimensionTitle}: ${selection.label} — ${totalResults} tickets`}
      {...backdropProps}
    >
      <div
        ref={containerRef}
        className="relative flex max-h-[min(92dvh,720px)] w-full max-w-[720px] flex-col overflow-hidden rounded-t-2xl border border-defaultborder/80 bg-bodybg shadow-2xl dark:border-white/10 sm:rounded-2xl motion-safe:animate-pm-panel-in motion-reduce:animate-none"
      >
        <div className="box-header flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-defaultborder/60 bg-slate-50/80 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03] sm:px-5">
          <nav aria-label="Drill-down breadcrumb" className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-[0.8125rem]">
            <button
              type="button"
              onClick={requestClose}
              className="inline-flex min-h-[44px] shrink-0 items-center text-defaulttextcolor/55 transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Analytics
            </button>
            <i className="ri-arrow-right-s-line text-defaulttextcolor/35" aria-hidden />
            <span className="text-defaulttextcolor/55">{dimensionTitle}</span>
            <i className="ri-arrow-right-s-line text-defaulttextcolor/35" aria-hidden />
            <span id="dev-ticket-drill-title" className="font-semibold text-defaulttextcolor">
              {selection.label}
            </span>
            <span className="text-defaulttextcolor/50">
              ({totalResults} ticket{totalResults === 1 ? "" : "s"})
            </span>
          </nav>
          <button
            type="button"
            onClick={requestClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-defaultborder/70 bg-white text-defaulttextcolor/70 transition-colors hover:border-defaultborder hover:bg-slate-50 hover:text-defaulttextcolor focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-white/10 dark:bg-black/20 dark:hover:bg-white/[0.06]"
            aria-label="Close drill-down overlay"
          >
            <i className="ri-close-line text-[1.125rem]" aria-hidden />
          </button>
        </div>

        <div className="box-body min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
          {loading ? (
            <div
              className="flex min-h-[120px] items-center justify-center text-[0.8125rem] text-defaulttextcolor/60"
              role="status"
            >
              <i className="ri-loader-4-line me-2 animate-spin motion-reduce:animate-none" aria-hidden /> Loading tickets…
            </div>
          ) : error ? (
            <div
              className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-6 text-center text-[0.8125rem] text-danger"
              role="alert"
            >
              {error}
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex min-h-[120px] flex-col items-center justify-center px-4 py-8 text-center" role="status">
              <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-white/10 dark:text-white/35">
                <i className="ri-inbox-line text-[1.1rem]" aria-hidden />
              </span>
              <p className="mb-0 text-[0.8125rem] font-medium text-defaulttextcolor/70">No tickets in this segment</p>
              <p className="mb-0 mt-1 text-[0.75rem] text-defaulttextcolor/50">
                {selection.count === 0
                  ? "This chart segment has zero tickets."
                  : "Tickets may have been updated since analytics loaded."}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {tickets.map((ticket) => {
                const statusCfg = STATUS_CONFIG[ticket.status];
                const priorityCfg = PRIORITY_CONFIG[ticket.priority];
                const severityCfg = SEVERITY_CONFIG[ticket.severity];
                return (
                  <li key={getTicketDbId(ticket)}>
                    <button
                      type="button"
                      onClick={() => onTicketClick(ticket)}
                      className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-lg border border-defaultborder/60 px-3 py-2.5 text-start transition-colors motion-safe:duration-200 hover:border-primary/40 hover:bg-primary/[0.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-white/10 dark:hover:bg-white/[0.03]"
                      aria-label={`Open ticket ${getDevTicketDisplayId(ticket)}: ${ticket.title}`}
                    >
                      <span className="shrink-0 font-mono text-[0.75rem] font-semibold text-primary">
                        {getDevTicketDisplayId(ticket)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium">{ticket.title}</span>
                      <span className={`badge shrink-0 ${statusCfg?.badge ?? ""}`}>{ticket.status}</span>
                      <span className={`badge shrink-0 ${severityCfg?.badge ?? ""}`}>{ticket.severity}</span>
                      <span className={`badge shrink-0 ${priorityCfg?.badge ?? ""}`}>{ticket.priority}</span>
                      <i className="ri-arrow-right-s-line shrink-0 text-defaulttextcolor/35" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {totalPages > 1 && (
          <div
            className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-defaultborder/60 px-4 py-3 dark:border-white/10 sm:px-5"
            role="navigation"
            aria-label="Drill-down pagination"
          >
            <p className="mb-0 text-[0.75rem] text-defaulttextcolor/60 tabular-nums">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="ti-btn ti-btn-light !mb-0 min-h-[44px]"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <i className="ri-arrow-left-s-line" aria-hidden /> Previous
              </button>
              <button
                type="button"
                className="ti-btn ti-btn-light !mb-0 min-h-[44px]"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Next page"
              >
                Next <i className="ri-arrow-right-s-line" aria-hidden />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
