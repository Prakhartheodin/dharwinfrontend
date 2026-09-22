"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getCandidate } from "@/shared/lib/api/candidates";
import { createStudentFromUser } from "@/shared/lib/api/students";
import {
  addStudentToTrainingModule,
  listTrainingModules,
  removeStudentFromTrainingModule,
  type TrainingModule,
} from "@/shared/lib/api/training-modules";
import { useConfirm } from "@/shared/components/ui/useConfirm";
import { InlineStatusToast } from "@/shared/components/InlineStatusToast";
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

function ActionSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none ${className}`}
      aria-hidden
    />
  );
}

function ModuleStatusBadge({ status }: { status: TrainingModule["status"] }) {
  if (status === "draft") {
    return (
      <span className="shrink-0 whitespace-nowrap rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
        Draft
      </span>
    );
  }
  if (status === "published") {
    return (
      <span className="shrink-0 whitespace-nowrap rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
        Published
      </span>
    );
  }
  return null;
}

const ROW_ACTION_BTN =
  "ti-btn !mb-0 !mt-0 !w-auto !min-h-[44px] !h-11 !px-3 !text-xs font-medium cursor-pointer inline-flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-50";

type RosterToast = { kind: "assign" | "unassign"; course: string };

function rosterToastMessage(kind: RosterToast["kind"], employeeName?: string): string {
  const who = employeeName?.trim();
  if (kind === "assign") return who ? `Assigned to ${who}` : "Assigned";
  return who ? `Unassigned from ${who}` : "Unassigned";
}

function mutationErrorMessage(e: unknown, verb: "assign" | "unassign"): string {
  const action = verb === "unassign" ? "unassign" : "assign";
  if (e instanceof AxiosError) {
    const status = e.response?.status;
    const apiMsg = (e.response?.data as { message?: string } | undefined)?.message;
    if (!e.response) {
      return `Couldn't ${action}. Check your connection and try again.`;
    }
    if (status === 403) {
      return `You don't have permission to ${action} this course. Refresh the page or ask an admin for training module manage access.`;
    }
    if (status === 404) {
      return verb === "unassign"
        ? "This course is gone or already unassigned. Refresh the list."
        : "This course was not found. Refresh the list and try again.";
    }
    if (status === 409) {
      return "This course changed while you were working. Refresh the list and try again.";
    }
    if (apiMsg) return apiMsg;
  }
  if (e instanceof Error && e.message) return e.message;
  return `Couldn't ${action}. Try again.`;
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
  const { confirm, confirmDialog } = useConfirm();
  const [mounted, setMounted] = useState(false);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [pendingModuleId, setPendingModuleId] = useState<string | null>(null);
  const [resolvedStudentId, setResolvedStudentId] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<{
    type: "assign" | "unassign";
    moduleId: string;
    moduleName: string;
  } | null>(null);
  const [successToast, setSuccessToast] = useState<RosterToast | null>(null);
  const mountedRef = useRef(true);
  const confirmLockRef = useRef(false);

  const resolvePositionIdForModule = (moduleId: string): string => {
    const mod = modules.find(
      (m) => String(m.id ?? (m as { _id?: string })._id ?? "").trim() === moduleId
    );
    const positionId = mod?.positions?.[0]?.id?.trim() ?? "";
    if (!positionId) {
      throw new Error(
        "This course has no mapped position. Map a position on the course before assigning."
      );
    }
    return positionId;
  };

  useEffect(() => {
    setMounted(true);
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!successToast) return;
    const id = window.setTimeout(() => setSuccessToast(null), 3500);
    return () => window.clearTimeout(id);
  }, [successToast]);

  const loadModules = useCallback(async (opts?: { silent?: boolean }) => {
    if (!open) return;
    if (!opts?.silent) {
      setLoading(true);
      setError("");
    }
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
      if (!mountedRef.current) return;
      setModules(assignable);
    } catch (e) {
      if (opts?.silent || !mountedRef.current) return;
      const msg =
        e instanceof AxiosError
          ? (e.response?.data as { message?: string })?.message ?? e.message
          : "Could not load training modules";
      setError(msg);
      setModules([]);
    } finally {
      if (!opts?.silent && mountedRef.current) setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResolvedStudentId(null);
    setPendingModuleId(null);
    setError("");
    setRetryAction(null);
    setSuccessToast(null);
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

  const assign = async (moduleId: string, moduleName: string) => {
    if (pendingModuleId) return;
    setPendingModuleId(moduleId);
    setError("");
    setRetryAction(null);
    const course = moduleName.trim() || "this course";
    try {
      let sid = resolvedStudentId;
      if (!sid) {
        sid = await resolveStudentIdForCandidate(candidateId);
        if (!mountedRef.current) return;
        setResolvedStudentId(sid);
      }
      await addStudentToTrainingModule(moduleId, sid, {
        positionId: resolvePositionIdForModule(moduleId),
      });
      onAssigned();
      if (!mountedRef.current) return;
      setSuccessToast({ kind: "assign", course });
      setModules((prev) =>
        prev.map((mod) => {
          const id = String(mod.id ?? (mod as { _id?: string })._id ?? "").trim();
          if (id !== moduleId) return mod;
          if (studentIdsOnModule(mod).has(sid)) return mod;
          return {
            ...mod,
            students: [...(mod.students ?? []), { id: sid, user: { id: "", name: "", email: "" } }],
          };
        })
      );
      await loadModules({ silent: true });
    } catch (e) {
      if (!mountedRef.current) return;
      setError(mutationErrorMessage(e, "assign"));
      setRetryAction({ type: "assign", moduleId, moduleName: course });
    } finally {
      if (mountedRef.current) setPendingModuleId(null);
    }
  };

  const unassign = async (moduleId: string, moduleName: string, opts?: { skipConfirm?: boolean }) => {
    if (pendingModuleId || confirmLockRef.current) return;
    const who = candidateName?.trim() ? candidateName.trim() : "this employee";
    const title = moduleName.trim() || "this course";
    try {
      if (!opts?.skipConfirm) {
        confirmLockRef.current = true;
        const ok = await confirm({
          title: "Unassign this course?",
          message: (
            <>
              Unassign <span className="font-semibold text-defaulttextcolor dark:text-white">{title}</span> from{" "}
              {who}? They will lose access to this course. Lesson and quiz progress is kept if you assign it
              again.
            </>
          ),
          confirmLabel: "Unassign",
          cancelLabel: "Cancel",
          tone: "danger",
          overlayClassName: "z-[10100]",
        });
        confirmLockRef.current = false;
        if (!ok || !mountedRef.current) return;
      }
      let sid = resolvedStudentId;
      if (!sid) {
        sid = await resolveStudentIdForCandidate(candidateId);
        if (!mountedRef.current) return;
        setResolvedStudentId(sid);
      }
      setPendingModuleId(moduleId);
      setError("");
      setRetryAction(null);
      await removeStudentFromTrainingModule(moduleId, sid, {
        positionId: resolvePositionIdForModule(moduleId),
      });
      onAssigned();
      if (mountedRef.current) setSuccessToast({ kind: "unassign", course: title });
      if (!mountedRef.current) return;
      setModules((prev) =>
        prev.map((mod) => {
          const id = String(mod.id ?? (mod as { _id?: string })._id ?? "").trim();
          if (id !== moduleId) return mod;
          return {
            ...mod,
            students: (mod.students ?? []).filter(
              (s) => String(s.id ?? (s as { _id?: string })._id ?? "").trim() !== sid
            ),
          };
        })
      );
      await loadModules({ silent: true });
    } catch (e) {
      if (!mountedRef.current) return;
      setError(mutationErrorMessage(e, "unassign"));
      setRetryAction({ type: "unassign", moduleId, moduleName: title });
    } finally {
      confirmLockRef.current = false;
      if (mountedRef.current) setPendingModuleId(null);
    }
  };

  if (!mounted || !open) return null;

  const heading = "Assign training course";

  return createPortal(
    <>
    <div
      className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-course-sop-title"
      aria-describedby="assign-course-sop-desc"
      onClick={(e) => {
        if (pendingModuleId) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative flex max-h-[min(36rem,90vh)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-defaultborder/80 bg-white shadow-xl dark:border-defaultborder/30 dark:bg-bodybg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-defaultborder/60 px-5 py-4 dark:border-defaultborder/20">
          <div className="min-w-0">
            <h2 id="assign-course-sop-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              {heading}
            </h2>
            {candidateName ? (
              <p className="mt-0.5 truncate text-sm font-medium text-gray-800 dark:text-gray-200" title={candidateName}>
                {candidateName}
              </p>
            ) : null}
            <p id="assign-course-sop-desc" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Draft and published courses from Curriculum.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
            disabled={pendingModuleId !== null}
            onClick={onClose}
          >
            <i className="ri-close-line text-xl" aria-hidden />
          </button>
        </div>

        <div className="px-5 py-3">
          <div className="relative">
            <i
              className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.875rem] text-defaulttextcolor/50"
              aria-hidden
            />
            <input
              type="search"
              className="form-control !h-10 !py-0 !ps-8 !pe-3 !text-sm !rounded-lg w-full"
              placeholder="Search courses"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter modules"
              disabled={loading}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {error ? (
            <div
              className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-200"
              role="alert"
            >
              <p>{error}</p>
              {retryAction ? (
                <button
                  type="button"
                  className="mt-2 inline-flex min-h-[44px] cursor-pointer items-center rounded-lg px-3 text-xs font-semibold text-red-800 underline decoration-red-800/40 underline-offset-2 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-200 dark:hover:bg-red-950/50"
                  disabled={pendingModuleId !== null}
                  onClick={() => {
                    if (retryAction.type === "unassign") {
                      void unassign(retryAction.moduleId, retryAction.moduleName, { skipConfirm: true });
                    } else {
                      void assign(retryAction.moduleId, retryAction.moduleName);
                    }
                  }}
                >
                  Try again
                </button>
              ) : null}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <ActionSpinner className="h-5 w-5 text-primary" />
              Loading courses…
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {modules.length === 0
                ? "No draft or published courses yet. Add one under Training, Curriculum."
                : "No courses match that search."}
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((m) => {
                const mid = String(m.id ?? (m as { _id?: string })._id ?? "").trim();
                const busyThis = pendingModuleId === mid;
                const busy = pendingModuleId !== null;
                const assigned =
                  resolvedStudentId != null && studentIdsOnModule(m).has(resolvedStudentId);
                const courseName = m.moduleName || "this course";
                return (
                  <li key={mid || m.moduleName}>
                    <div
                      className={`grid min-h-[3.25rem] grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg border px-3 py-2 ${
                        assigned
                          ? "border-primary/40 bg-primary/5 dark:bg-primary/10"
                          : "border-defaultborder/70 hover:bg-gray-50 dark:border-defaultborder/25 dark:hover:bg-white/5"
                      }`}
                      aria-busy={busyThis}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <i className="ri-book-open-line text-lg" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="min-w-0 truncate text-sm font-medium text-gray-900 dark:text-white"
                            title={m.moduleName}
                          >
                            {m.moduleName}
                          </span>
                          <ModuleStatusBadge status={m.status} />
                        </div>
                        {m.shortDescription ? (
                          <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400" title={m.shortDescription}>
                            {m.shortDescription}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex min-h-[44px] min-w-[9.75rem] shrink-0 items-center justify-end gap-2">
                        {assigned ? (
                          <>
                            <span className="whitespace-nowrap text-xs font-medium text-primary">On roster</span>
                            <button
                              type="button"
                              className={`${ROW_ACTION_BTN} ti-btn-danger`}
                              disabled={busy || loading || !mid}
                              aria-label={`Unassign ${courseName}`}
                              aria-busy={busyThis}
                              onClick={() => void unassign(mid, courseName)}
                            >
                              {busyThis ? <ActionSpinner className="h-4 w-4" /> : null}
                              {busyThis ? <span className="sr-only">Unassigning</span> : "Unassign"}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className={`${ROW_ACTION_BTN} ti-btn-primary`}
                            disabled={busy || loading || !mid}
                            aria-label={`Assign ${courseName}`}
                            aria-busy={busyThis}
                            onClick={() => void assign(mid, courseName)}
                          >
                            {busyThis ? <ActionSpinner className="h-4 w-4" /> : null}
                            {busyThis ? <span className="sr-only">Assigning</span> : "Assign"}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
    {confirmDialog}
    {successToast ? (
      <InlineStatusToast
        message={rosterToastMessage(successToast.kind, candidateName)}
        detail={successToast.course}
        position="top-end"
        iconClassName="ri-checkbox-circle-line"
      />
    ) : null}
    </>,
    document.body
  );
}
