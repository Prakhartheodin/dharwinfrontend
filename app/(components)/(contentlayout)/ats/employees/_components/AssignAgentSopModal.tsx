"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  assignAgentToStudent,
  getCandidateFilterAgents,
  type AgentOption,
} from "@/shared/lib/api/candidates";
import { AxiosError } from "axios";

type Props = {
  open: boolean;
  candidateId: string;
  candidateName?: string;
  currentAgent?: { id: string; name: string; email?: string } | null;
  onClose: () => void;
  onAssigned: () => void;
};

export default function AssignAgentSopModal({
  open,
  candidateId,
  candidateName,
  currentAgent,
  onClose,
  onAssigned,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadAgents = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError("");
    try {
      const { agents: list } = await getCandidateFilterAgents();
      setAgents(list ?? []);
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Could not load agents";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) void loadAgents();
  }, [open, loadAgents]);

  const pick = async (agentId: string | null) => {
    setAssigningId(agentId ?? "__clear__");
    setError("");
    try {
      await assignAgentToStudent(candidateId, agentId);
      onAssigned();
      onClose();
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Assignment failed";
      setError(msg);
    } finally {
      setAssigningId(null);
    }
  };

  if (!mounted || !open) return null;

  const title = candidateName ? `Assign agent — ${candidateName}` : "Assign agent";

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-agent-sop-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative max-h-[min(32rem,85vh)] w-full max-w-lg overflow-hidden rounded-xl border border-defaultborder/80 bg-white shadow-xl dark:border-defaultborder/30 dark:bg-bgdark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-defaultborder/60 px-5 py-4 dark:border-defaultborder/20">
          <div>
            <h2 id="assign-agent-sop-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Choose a training staff agent for this candidate. Only users with the Agent role appear here.
            </p>
            {currentAgent?.name ? (
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">
                Current: <span className="font-medium">{currentAgent.name}</span>
                {currentAgent.email ? <span className="text-gray-500"> · {currentAgent.email}</span> : null}
              </p>
            ) : (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">No agent assigned yet.</p>
            )}
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
            onClick={onClose}
          >
            <i className="ri-close-line text-xl" />
          </button>
        </div>

        <div className="max-h-[min(22rem,60vh)] overflow-y-auto px-3 py-3">
          {error ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading agents…
            </div>
          ) : agents.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              No agent users found. Add users with the Agent role first.
            </p>
          ) : (
            <ul className="space-y-1">
              {currentAgent?.id ? (
                <li>
                  <button
                    type="button"
                    disabled={assigningId !== null}
                    className="flex w-full items-center justify-between rounded-lg border border-dashed border-defaultborder/70 px-3 py-2.5 text-left text-sm text-gray-600 hover:bg-gray-50 dark:border-defaultborder/25 dark:text-gray-300 dark:hover:bg-white/5"
                    onClick={() => void pick(null)}
                  >
                    <span>Clear assignment</span>
                    {assigningId === "__clear__" ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : null}
                  </button>
                </li>
              ) : null}
              {agents.map((a) => {
                const busy = assigningId === a.id;
                const isCurrent = currentAgent?.id === a.id;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      disabled={assigningId !== null}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        isCurrent
                          ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                          : "border-transparent hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                      onClick={() => void pick(a.id)}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        {(a.name || "?")
                          .split(/\s+/)
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-gray-900 dark:text-white">{a.name}</span>
                        <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{a.email}</span>
                      </span>
                      {busy ? (
                        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      ) : isCurrent ? (
                        <span className="shrink-0 text-xs font-medium text-primary">Assigned</span>
                      ) : (
                        <span className="shrink-0 text-xs text-primary">Select</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
