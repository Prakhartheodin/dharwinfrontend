"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { getCandidate } from "@/shared/lib/api/candidates";
import { createStudentFromUser } from "@/shared/lib/api/students";
import {
  addStudentToTrainingModule,
  listTrainingModules,
  type TrainingModule,
} from "@/shared/lib/api/training-modules";
import { AxiosError } from "axios";

type Props = {
  open: boolean;
  candidateId: string;
  candidateName?: string;
  onClose: () => void;
  onAssigned: () => void;
};

function studentIdsOnModule(m: TrainingModule): Set<string> {
  const set = new Set<string>();
  for (const s of m.students ?? []) {
    const id = String(s.id ?? (s as { _id?: string })._id ?? "").trim();
    if (id) set.add(id);
  }
  return set;
}

async function resolveStudentIdForCandidate(candidateId: string): Promise<string> {
  const c = await getCandidate(candidateId);
  let sid = c.studentId != null ? String(c.studentId).trim() : "";
  if (sid) return sid;
  let owner = "";
  if (c.ownerId != null && String(c.ownerId).trim()) owner = String(c.ownerId).trim();
  else if (typeof c.owner === "string" && c.owner.trim()) owner = c.owner.trim();
  else if (c.owner && typeof c.owner === "object") {
    owner = String((c.owner as { _id?: string; id?: string })._id ?? (c.owner as { id?: string }).id ?? "").trim();
  }
  if (!owner) {
    throw new Error("This candidate has no linked user. Link an owner before assigning training.");
  }
  const st = await createStudentFromUser(owner, { ensureStudentRoleForCandidateOwner: true });
  const raw = (st as { id?: string; _id?: string }).id ?? (st as { _id?: string })._id;
  const out = raw != null ? String(raw).trim() : "";
  if (!out) throw new Error("Could not resolve training profile id.");
  return out;
}

export default function AssignTrainingCourseSopModal({
  open,
  candidateId,
  candidateName,
  onClose,
  onAssigned,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [assigningModuleId, setAssigningModuleId] = useState<string | null>(null);
  const [resolvedStudentId, setResolvedStudentId] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadModules = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError("");
    try {
      const res = await listTrainingModules({
        limit: 200,
        sortBy: "moduleName:asc",
      });
      const raw = res.results ?? [];
      // Curriculum often keeps modules in "draft" while assigning students; student catalog may still filter to published.
      const assignable = raw.filter((m) => m.status !== "archived");
      assignable.sort((a, b) => {
        const rank = (s: string | undefined) => (s === "published" ? 0 : 1);
        const d = rank(a.status) - rank(b.status);
        if (d !== 0) return d;
        return (a.moduleName || "").localeCompare(b.moduleName || "", undefined, { sensitivity: "base" });
      });
      setModules(assignable);
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Could not load training modules";
      setError(msg);
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResolvedStudentId(null);
    let cancelled = false;
    void (async () => {
      await loadModules();
      if (cancelled) return;
      try {
        const c = await getCandidate(candidateId);
        const sid = c.studentId != null ? String(c.studentId).trim() : "";
        if (sid && !cancelled) setResolvedStudentId(sid);
      } catch {
        /* roster labels update after first assign if no profile yet */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, candidateId, loadModules]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return modules;
    return modules.filter((m) => {
      const name = (m.moduleName || "").toLowerCase();
      const desc = (m.shortDescription || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [modules, query]);

  const assign = async (moduleId: string) => {
    setAssigningModuleId(moduleId);
    setError("");
    try {
      let sid = resolvedStudentId;
      if (!sid) {
        sid = await resolveStudentIdForCandidate(candidateId);
        setResolvedStudentId(sid);
      }
      await addStudentToTrainingModule(moduleId, sid);
      await loadModules();
      onAssigned();
    } catch (e) {
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : e instanceof Error
            ? e.message
            : "Assignment failed";
      setError(msg);
    } finally {
      setAssigningModuleId(null);
    }
  };

  if (!mounted || !open) return null;

  const title = candidateName ? `Assign training course — ${candidateName}` : "Assign training course";

  return createPortal(
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-course-sop-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative max-h-[min(36rem,90vh)] w-full max-w-lg overflow-hidden rounded-xl border border-defaultborder/80 bg-white shadow-xl dark:border-defaultborder/30 dark:bg-bgdark"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-defaultborder/60 px-5 py-4 dark:border-defaultborder/20">
          <div>
            <h2 id="assign-course-sop-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Lists{" "}
              <span className="font-semibold text-gray-700 dark:text-gray-300">draft and published</span> modules
              from Training → Curriculum (archived are hidden). You can add the candidate to the roster even while a
              module is still draft. If they have no training profile yet, one is created from their linked user; the
              Student role is added when that user owns this candidate.
            </p>
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

        <div className="border-b border-defaultborder/50 px-5 py-2 dark:border-defaultborder/20">
          <input
            type="search"
            className="w-full rounded-lg border border-defaultborder/80 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 dark:border-white/10 dark:bg-white/5 dark:text-white"
            placeholder="Search modules by name or description…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter modules"
          />
        </div>

        <div className="max-h-[min(24rem,55vh)] overflow-y-auto px-3 py-3">
          {error ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Loading modules…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {modules.length === 0
                ? "No assignable training modules (draft or published). Create one under Training → Curriculum, or un-archive if everything is archived."
                : "No modules match your search."}
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((m) => {
                const mid = String(m.id ?? (m as { _id?: string })._id ?? "").trim();
                const busy = assigningModuleId === mid;
                const assigned =
                  resolvedStudentId != null && studentIdsOnModule(m).has(resolvedStudentId);
                return (
                  <li key={mid || m.moduleName}>
                    <button
                      type="button"
                      disabled={assigningModuleId !== null || !mid || assigned}
                      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        assigned
                          ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                          : "border-transparent hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                      onClick={() => void assign(mid)}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-700 dark:text-teal-300">
                        <i className="ri-book-open-line text-lg" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">{m.moduleName}</span>
                          {m.status === "draft" ? (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                              Draft
                            </span>
                          ) : m.status === "published" ? (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                              Published
                            </span>
                          ) : null}
                        </span>
                        {m.shortDescription ? (
                          <span className="mt-0.5 line-clamp-2 block text-xs text-gray-500 dark:text-gray-400">
                            {m.shortDescription}
                          </span>
                        ) : null}
                      </span>
                      {busy ? (
                        <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary border-t-transparent self-center" />
                      ) : assigned ? (
                        <span className="shrink-0 self-center text-xs font-medium text-primary">On roster</span>
                      ) : (
                        <span className="shrink-0 self-center text-xs text-primary">Assign</span>
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
