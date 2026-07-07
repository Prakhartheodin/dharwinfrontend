"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Swal from "sweetalert2";
import Seo from "@/shared/layout-components/seo/seo";
import { emitPmDataMutated } from "@/shared/hooks/usePmRefetchOnFocus";
import {
  getProjectById,
  getProjectProgress,
  normalizeProjectPriority,
  updateProject,
  type Project,
  type ProjectStatus,
  type ProjectPriority,
  type UpdateProjectPayload,
} from "@/shared/lib/api/projects";
import {
  listTasks,
  updateTask,
  TASK_STATUS_LABELS,
  getTaskId,
  type Task,
  type TaskStatus,
  type TaskUser,
} from "@/shared/lib/api/tasks";
import { resolveDownloadUrlForBrowser } from "@/shared/lib/api/client";
import { listCandidates, type CandidateListItem } from "@/shared/lib/api/candidates";
import { useAuth } from "@/shared/contexts/auth-context";
import { projectCanEdit } from "@/shared/lib/project-capabilities";

const STATUS_LABEL: Record<ProjectStatus, string> = {
  Inprogress: "In Progress",
  "On hold": "On Hold",
  completed: "Completed",
};

const STATUS_BADGE: Record<ProjectStatus, string> = {
  Inprogress: "bg-primary/10 text-primary",
  "On hold": "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
};

const PRIORITY_BADGE: Record<ProjectPriority, string> = {
  urgent: "bg-danger/10 text-danger",
  high: "bg-orange-500/10 text-orange-500",
  medium: "bg-info/10 text-info",
  low: "bg-success/10 text-success",
};

const TASK_STATUS_BADGE: Record<TaskStatus, string> = {
  new: "bg-light text-default",
  todo: "bg-info/10 text-info",
  on_going: "bg-primary/10 text-primary",
  in_review: "bg-warning/10 text-warning",
  completed: "bg-success/10 text-success",
};

/** Format an ISO date to "22 Jun 2023"; "—" when missing/invalid. */
function fmtDate(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Strip any stray HTML tags from stored text (descriptions are plain text but be defensive). */
function plainText(raw: string | undefined): string {
  return (raw ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/** Initials for an avatar fallback (no demo photos for real users). */
function initials(name: string | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Normalize stored profile picture paths for browser display. */
function resolveAssigneeAvatarUrl(url: string | undefined | null): string | null {
  const raw = (url ?? "").trim();
  if (!raw) return null;
  let resolved = raw;
  if (/^https?:\/\//i.test(raw)) {
    resolved = resolveDownloadUrlForBrowser(raw);
  } else if (raw.startsWith("/")) {
    resolved = raw;
  } else {
    const legacy = raw.match(/assets\/images\/.+$/i);
    resolved = legacy ? `/${legacy[0].replace(/^\/+/, "")}` : raw;
  }
  return resolved.trim() || null;
}

function normalizeAssigneeEmail(email: string | undefined | null): string {
  return (email ?? "").trim().toLowerCase();
}

function resolveAssigneePhotoUrl(
  user: { email?: string; profilePicture?: { url?: string } | null },
  candidateAvatarByEmail: ReadonlyMap<string, string>,
  sessionAvatar?: { email: string; url: string } | null
): string | null {
  const fromUser = resolveAssigneeAvatarUrl(user.profilePicture?.url);
  if (fromUser) return fromUser;
  const key = normalizeAssigneeEmail(user.email);
  if (key) {
    const fromCandidate = candidateAvatarByEmail.get(key);
    if (fromCandidate) return resolveAssigneeAvatarUrl(fromCandidate);
  }
  if (
    sessionAvatar?.url?.trim() &&
    key &&
    normalizeAssigneeEmail(sessionAvatar.email) === key
  ) {
    return resolveAssigneeAvatarUrl(sessionAvatar.url);
  }
  return null;
}

/** Avatar with resolved photo URL and initials fallback when missing or broken. */
function AssigneeAvatar({
  name,
  profilePictureUrl,
  size = "sm",
}: {
  name: string | undefined;
  profilePictureUrl?: string | null;
  size?: "sm" | "md";
}): JSX.Element {
  const [broken, setBroken] = useState(false);
  const imgSrc = profilePictureUrl;
  const showPhoto = !!imgSrc && !broken;

  useEffect(() => {
    setBroken(false);
  }, [imgSrc]);

  if (showPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imgSrc}
        alt=""
        className="h-full w-full object-cover !rounded-full"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
      />
    );
  }

  const textSize = size === "md" ? "text-[0.875rem]" : "text-[0.6875rem]";
  return <span className={textSize}>{initials(name)}</span>;
}

/** Best-effort file name from an attachment URL/path. */
function attachmentLabel(url: string, index: number): string {
  try {
    const clean = url.split("?")[0].split("#")[0];
    const last = clean.split("/").pop();
    if (last) return decodeURIComponent(last);
  } catch {
    /* fall through */
  }
  return `Attachment ${index + 1}`;
}

const DatePicker = dynamic(() => import("react-datepicker"), { ssr: false });

/** Trigger button for an inline date picker — react-datepicker injects onClick. */
const DateTrigger = React.forwardRef<
  HTMLButtonElement,
  {
    onClick?: () => void;
    display: string;
    empty: boolean;
    overdue: boolean;
    saving: boolean;
    variant: "muted" | "value";
  }
>(({ onClick, display, empty, overdue, saving, variant }, ref) => {
  const size = variant === "value" ? "text-[.875rem]" : "text-[0.8125rem]";
  const tone = empty
    ? "text-[#8c9097] dark:text-white/50"
    : overdue
      ? "text-danger font-semibold"
      : variant === "value"
        ? "font-semibold"
        : "text-[#8c9097] dark:text-white/50";
  return (
    <button
      type="button"
      ref={ref}
      onClick={onClick}
      disabled={saving}
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-light dark:hover:bg-white/5 disabled:opacity-60 ${size} ${tone}`}
    >
      <i
        className={`ri-calendar-line text-[0.875rem] text-[#8c9097] dark:text-white/50 ${
          saving ? "animate-pulse" : ""
        }`}
      />
      {display}
    </button>
  );
});
DateTrigger.displayName = "DateTrigger";

/** Read-only display without edit affordances (view-only permission). */
function ReadOnlyValue({ display, muted = false }: { display: string; muted?: boolean }): JSX.Element {
  return (
    <span
      className={`text-[.875rem] font-semibold ${muted ? "text-[#8c9097] dark:text-white/50" : ""}`}
    >
      {display}
    </span>
  );
}

/** Read-only locked display for a footer field that is set-once from this page. */
function LockedValue({ display }: { display: string }): JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-1 text-[.875rem] font-semibold"
      title="Set — change it from the Edit Project page"
    >
      {display}
      <i className="ri-lock-2-line text-[0.6875rem] text-[#8c9097] dark:text-white/50" />
    </span>
  );
}

/** Generic inline date editor — opens a calendar, calls onSave with an ISO string or null to clear. */
function InlineDate({
  value,
  onSave,
  placeholder = "Set date",
  variant = "muted",
  overdue = false,
  locked = false,
  readOnly = false,
  minDate,
  maxDate,
}: {
  value: string | null | undefined;
  onSave: (iso: string | null) => Promise<void>;
  placeholder?: string;
  variant?: "muted" | "value";
  overdue?: boolean;
  locked?: boolean;
  readOnly?: boolean;
  minDate?: Date;
  maxDate?: Date;
}): JSX.Element {
  const [saving, setSaving] = useState(false);
  const parsed = value ? new Date(value) : null;
  const valid = parsed != null && !isNaN(parsed.getTime());

  if (readOnly) {
    return (
      <ReadOnlyValue
        display={valid ? fmtDate(value ?? undefined) : "—"}
        muted={!valid}
      />
    );
  }

  if (locked) return <LockedValue display={valid ? fmtDate(value ?? undefined) : "—"} />;

  const handle = async (next: Date | null): Promise<void> => {
    const iso = next ? next.toISOString() : null;
    if ((iso ?? "") === (value ?? "")) return;
    setSaving(true);
    try {
      await onSave(iso);
    } catch {
      /* onSave surfaces its own error toast; the value prop drives the revert */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inline-flex items-center gap-0.5">
      <DatePicker
        selected={valid ? parsed : null}
        onChange={(d: Date | null) => void handle(d)}
        dateFormat="dd MMM yyyy"
        placeholderText={placeholder}
        disabled={saving}
        minDate={minDate}
        maxDate={maxDate}
        portalId="overview-inline-date-portal"
        popperPlacement="bottom-end"
        customInput={
          <DateTrigger
            display={valid ? fmtDate(value ?? undefined) : placeholder}
            empty={!valid}
            overdue={overdue}
            saving={saving}
            variant={variant}
          />
        }
      />
      {valid && !saving && (
        <button
          type="button"
          aria-label="Clear date"
          title="Clear date"
          onClick={() => void handle(null)}
          className="leading-none p-0.5 text-[#8c9097] dark:text-white/50 hover:text-danger"
        >
          <i className="ri-close-line text-[0.875rem]" />
        </button>
      )}
    </div>
  );
}

/** Generic inline single-line text editor — commits on Enter or blur, cancels on Escape. */
function InlineText({
  value,
  placeholder,
  onSave,
  locked = false,
  readOnly = false,
}: {
  value: string | undefined;
  placeholder: string;
  onSave: (next: string) => Promise<void>;
  locked?: boolean;
  readOnly?: boolean;
}): JSX.Element {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const cancelRef = React.useRef(false);

  if (readOnly) {
    return (
      <ReadOnlyValue
        display={value?.trim() || "—"}
        muted={!value?.trim()}
      />
    );
  }

  if (locked) return <LockedValue display={value?.trim() || "—"} />;

  const begin = (): void => {
    setDraft(value ?? "");
    cancelRef.current = false;
    setEditing(true);
  };

  const commit = async (): Promise<void> => {
    const next = draft.trim();
    if (next === (value ?? "").trim()) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch {
      /* keep the field open so the user can retry; onSave surfaces the error toast */
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        value={draft}
        disabled={saving}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (cancelRef.current) {
            cancelRef.current = false;
            setEditing(false);
            return;
          }
          void commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            cancelRef.current = true;
            e.currentTarget.blur();
          }
        }}
        className="block w-44 rounded border border-defaultborder bg-transparent px-1.5 py-0.5 text-[.875rem] font-semibold focus:border-primary focus:outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={begin}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 transition-colors hover:bg-light dark:hover:bg-white/5"
    >
      {value?.trim() ? (
        <span className="text-[.875rem] font-semibold">{value.trim()}</span>
      ) : (
        <span className="text-[0.8125rem] text-[#8c9097] dark:text-white/50">{placeholder}</span>
      )}
      <i className="ri-pencil-line text-[0.75rem] text-[#8c9097] dark:text-white/50" />
    </button>
  );
}

/** Inline editable due-date cell — patches the task and lifts the new value to the parent. */
function DueDateCell({
  task,
  onSaved,
  readOnly = false,
}: {
  task: Task;
  onSaved: (taskId: string, dueDate: string | null) => void;
  readOnly?: boolean;
}): JSX.Element {
  const parsed = task.dueDate ? new Date(task.dueDate) : null;
  const valid = parsed != null && !isNaN(parsed.getTime());
  const overdue =
    valid &&
    task.status !== "completed" &&
    (parsed as Date).getTime() < new Date().setHours(0, 0, 0, 0);

  const save = async (iso: string | null): Promise<void> => {
    const taskId = getTaskId(task);
    try {
      await updateTask(taskId, { dueDate: iso });
      onSaved(taskId, iso);
      emitPmDataMutated();
    } catch (e) {
      void Swal.fire({
        icon: "error",
        title: "Couldn't update due date",
        timer: 2500,
        showConfirmButton: false,
      });
      throw e;
    }
  };

  return (
    <InlineDate
      value={task.dueDate}
      onSave={save}
      placeholder="Set due date"
      overdue={overdue}
      readOnly={readOnly}
    />
  );
}

/** Stacked assignee avatars. Clicking a bubble opens an overview card for that assignee. */
function AssigneeBubbles({
  users,
  candidateAvatarByEmail,
  sessionAvatar,
}: {
  users: TaskUser[];
  candidateAvatarByEmail: ReadonlyMap<string, string>;
  sessionAvatar?: { email: string; url: string } | null;
}): JSX.Element {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (openIdx === null) return;
    const onDocClick = (e: MouseEvent): void => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpenIdx(null);
    };
    const onEsc = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpenIdx(null);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [openIdx]);

  if (users.length === 0) {
    return <span className="text-[#8c9097] dark:text-white/50">—</span>;
  }

  const active = openIdx !== null ? users[openIdx] : null;

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <div className="avatar-list-stacked">
        {users.map((u, i) => {
          const label = u.name || u.email || "User";
          return (
            <button
              key={u._id || u.id || u.email || `t-assignee-${i}`}
              type="button"
              onClick={() => setOpenIdx((prev) => (prev === i ? null : i))}
              className="avatar avatar-sm !rounded-full bg-primary/10 text-primary inline-flex items-center justify-center text-[0.6875rem] font-semibold overflow-hidden cursor-pointer ring-0 hover:ring-2 hover:ring-primary/40 transition-shadow"
              title={label}
              aria-label={`View ${label}`}
            >
              <AssigneeAvatar
                name={u.name || u.email}
                profilePictureUrl={resolveAssigneePhotoUrl(u, candidateAvatarByEmail, sessionAvatar)}
              />
            </button>
          );
        })}
      </div>

      {active && (
        <div
          className="absolute z-50 top-full mt-2 left-0 w-64 rounded-md border border-defaultborder bg-white dark:bg-bodybg shadow-lg p-3"
          role="dialog"
        >
          <div className="flex items-center gap-3">
            <span className="avatar avatar-md !rounded-full bg-primary/10 text-primary inline-flex items-center justify-center text-[0.875rem] font-semibold overflow-hidden shrink-0">
              <AssigneeAvatar
                name={active.name || active.email}
                profilePictureUrl={resolveAssigneePhotoUrl(active, candidateAvatarByEmail, sessionAvatar)}
                size="md"
              />
            </span>
            <div className="min-w-0">
              <div className="font-semibold truncate">{active.name || "Unnamed user"}</div>
              {active.email && (
                <div className="text-[0.75rem] text-[#8c9097] dark:text-white/50 truncate">{active.email}</div>
              )}
            </div>
          </div>
          {(active.phoneNumber || active.location) && (
            <div className="mt-3 pt-3 border-t border-defaultborder space-y-1.5">
              {active.phoneNumber && (
                <div className="flex items-center gap-2 text-[0.75rem]">
                  <i className="ri-phone-line text-[#8c9097] dark:text-white/50" />
                  <span className="truncate">{active.phoneNumber}</span>
                </div>
              )}
              {active.location && (
                <div className="flex items-center gap-2 text-[0.75rem]">
                  <i className="ri-map-pin-line text-[#8c9097] dark:text-white/50" />
                  <span className="truncate">{active.location}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const Projectoverview = (): JSX.Element => {
  const auth = useAuth();
  const canEditProject = projectCanEdit(auth);
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [candidateAvatars, setCandidateAvatars] = useState<Map<string, string>>(() => new Map());

  const sessionAvatar = useMemo(() => {
    const email = auth.user?.email?.trim();
    const url = auth.user?.profilePicture?.url?.trim();
    if (!email || !url) return null;
    return { email, url };
  }, [auth.user?.email, auth.user?.profilePicture?.url]);

  useEffect(() => {
    let cancelled = false;
    listCandidates({ limit: 1000, employmentStatus: "all", sortBy: "fullName:asc" })
      .then((res) => {
        if (cancelled) return;
        const next = new Map<string, string>();
        for (const c of (res.results ?? []) as CandidateListItem[]) {
          const raw = (c.profilePicture?.url || "").trim();
          if (!raw) continue;
          const email = normalizeAssigneeEmail(c.email);
          if (email) next.set(email, raw);
        }
        setCandidateAvatars(next);
      })
      .catch(() => {
        if (!cancelled) setCandidateAvatars(new Map());
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await getProjectById(id);
      setProject(data);
    } catch (e: unknown) {
      const status =
        e && typeof e === "object" && "response" in e
          ? (e as { response?: { status?: number } }).response?.status
          : undefined;
      if (status === 404) {
        setNotFound(true);
        setProject(null);
      } else {
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as { message: string }).message)
            : "Failed to load this project";
        setError(msg);
        setProject(null);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Tasks load independently of the project — a tasks failure must not block the overview.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setTasksLoading(true);
    setTasksError(null);
    listTasks({ projectId: id, limit: 100, sortBy: "createdAt:desc" })
      .then((res) => {
        if (!cancelled) setTasks(res.results);
      })
      .catch(() => {
        if (!cancelled) setTasksError("Failed to load tasks.");
      })
      .finally(() => {
        if (!cancelled) setTasksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Lift a saved due date back into local task state so the row re-renders without a refetch.
  const handleDueDateSaved = useCallback((taskId: string, dueDate: string | null) => {
    setTasks((prev) =>
      prev.map((t) => (getTaskId(t) === taskId ? { ...t, dueDate: dueDate ?? undefined } : t)),
    );
  }, []);

  // Patch a project field inline; throws on failure so the inline editor can revert.
  const handleProjectPatch = useCallback(
    async (patch: UpdateProjectPayload): Promise<void> => {
      if (!id) throw new Error("Missing project id");
      try {
        const updated = await updateProject(id, patch);
        setProject(updated);
        emitPmDataMutated();
      } catch (e) {
        void Swal.fire({
          icon: "error",
          title: "Couldn't save change",
          timer: 2500,
          showConfirmButton: false,
        });
        throw e;
      }
    },
    [id],
  );

  const pct = project ? getProjectProgress(project) : 0;
  const priority = project ? normalizeProjectPriority(project.priority) : "medium";
  const assignees = project?.assignedTo ?? [];
  const teams = project?.assignedTeams ?? [];
  const tags = project?.tags ?? [];
  const attachments = project?.attachments ?? [];

  return (
    <Fragment>
      <Seo title={"Project Overview"} />

      {/* NO ID — user landed here without selecting a project */}
      {!id && (
        <div className="box custom-box">
          <div className="box-body text-center py-10">
            <span className="avatar avatar-lg !rounded-full bg-light text-default mb-3 inline-flex items-center justify-center">
              <i className="ri-folder-3-line text-[1.5rem]"></i>
            </span>
            <h6 className="font-semibold mb-1">No project selected</h6>
            <p className="text-[#8c9097] dark:text-white/50 mb-4">
              Open a project from the projects list to view its overview.
            </p>
            <Link href="/apps/projects/my-projects/" className="ti-btn ti-btn-primary-full btn-wave">
              Go to My Projects
            </Link>
          </div>
        </div>
      )}

      {/* LOADING */}
      {id && loading && (
        <div className="box custom-box">
          <div className="box-body">
            <div className="animate-pulse space-y-4">
              <div className="h-5 w-1/2 rounded bg-gray-200 dark:bg-white/10"></div>
              <div className="h-3 w-full rounded bg-gray-100 dark:bg-white/5"></div>
              <div className="h-3 w-5/6 rounded bg-gray-100 dark:bg-white/5"></div>
              <div className="h-3 w-2/3 rounded bg-gray-100 dark:bg-white/5"></div>
              <div className="flex gap-3 pt-2">
                <div className="h-8 w-24 rounded bg-gray-200 dark:bg-white/10"></div>
                <div className="h-8 w-24 rounded bg-gray-200 dark:bg-white/10"></div>
                <div className="h-8 w-24 rounded bg-gray-200 dark:bg-white/10"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ERROR */}
      {id && !loading && error && (
        <div className="box custom-box">
          <div className="box-body text-center py-10">
            <span className="avatar avatar-lg !rounded-full bg-danger/10 text-danger mb-3 inline-flex items-center justify-center">
              <i className="ri-error-warning-line text-[1.5rem]"></i>
            </span>
            <h6 className="font-semibold mb-1">Couldn&apos;t load this project</h6>
            <p className="text-[#8c9097] dark:text-white/50 mb-4">{error}</p>
            <button type="button" onClick={() => void refresh()} className="ti-btn ti-btn-primary-full btn-wave">
              Try again
            </button>
          </div>
        </div>
      )}

      {/* NOT FOUND */}
      {id && !loading && !error && notFound && (
        <div className="box custom-box">
          <div className="box-body text-center py-10">
            <span className="avatar avatar-lg !rounded-full bg-light text-default mb-3 inline-flex items-center justify-center">
              <i className="ri-search-eye-line text-[1.5rem]"></i>
            </span>
            <h6 className="font-semibold mb-1">Project not found</h6>
            <p className="text-[#8c9097] dark:text-white/50 mb-4">
              This project may have been deleted, or you don&apos;t have access to it.
            </p>
            <Link href="/apps/projects/my-projects/" className="ti-btn ti-btn-primary-full btn-wave">
              Back to My Projects
            </Link>
          </div>
        </div>
      )}

      {/* LOADED */}
      {id && !loading && !error && !notFound && project && (
        <div className="grid grid-cols-12 gap-6">
          <div className="xl:col-span-9 col-span-12">
            {/* PROJECT DETAILS */}
            <div className="box custom-box">
              <div className="box-header justify-between flex">
                <div className="box-title">Project Details</div>
                {canEditProject ? (
                  <div>
                    <Link
                      href={`/apps/projects/edit/${encodeURIComponent(id)}`}
                      className="ti-btn !py-1 !px-2 !text-[0.75rem] ti-btn-secondary-full btn-wave"
                    >
                      <i className="ri-edit-line align-middle me-1 font-semibold"></i>Edit Project
                    </Link>
                  </div>
                ) : null}
              </div>
              <div className="box-body">
                <h5 className="font-semibold mb-4 task-title">{project.name}</h5>

                {project.projectKey && (
                  <div className="mb-4">
                    <span className="badge bg-light text-default">{project.projectKey}</span>
                  </div>
                )}

                <div className="text-[.9375rem] font-semibold mb-2">Project Description :</div>
                {plainText(project.description) ? (
                  <p className="text-[#8c9097] dark:text-white/50 task-description">
                    {plainText(project.description)}
                  </p>
                ) : (
                  <p className="text-[#8c9097] dark:text-white/50 italic">No description provided.</p>
                )}

                {/* Progress — derived from completedTasks / totalTasks */}
                <div className="text-[.9375rem] font-semibold mb-2 mt-4">Progress :</div>
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[0.75rem] text-[#8c9097] dark:text-white/50">
                      {project.completedTasks ?? 0} of {project.totalTasks ?? 0} tasks completed
                    </span>
                    <span className="text-[0.75rem] font-semibold">{pct}%</span>
                  </div>
                  <div className="progress progress-sm">
                    <div
                      className="progress-bar bg-primary"
                      role="progressbar"
                      style={{ width: `${pct}%` }}
                      aria-valuenow={pct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    ></div>
                  </div>
                </div>

                <div className="text-[.9375rem] font-semibold mb-2 mt-4">Tags :</div>
                <div>
                  {tags.length > 0 ? (
                    tags.map((tag, i) => (
                      <span key={`${tag}-${i}`} className="badge me-2 mb-1 bg-light text-default">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-[#8c9097] dark:text-white/50 italic text-[0.875rem]">
                      No tags added.
                    </span>
                  )}
                </div>
              </div>
              <div className="box-footer">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-0.5">
                      Project Manager
                    </span>
                    <InlineText
                      value={project.projectManager}
                      placeholder="Set project manager"
                      readOnly={!canEditProject}
                      locked={!!project.projectManager?.trim()}
                      onSave={(next) => handleProjectPatch({ projectManager: next })}
                    />
                  </div>
                  <div>
                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-0.5">
                      Client / Stakeholder
                    </span>
                    <InlineText
                      value={project.clientStakeholder}
                      placeholder="Set client / stakeholder"
                      readOnly={!canEditProject}
                      locked={!!project.clientStakeholder?.trim()}
                      onSave={(next) => handleProjectPatch({ clientStakeholder: next })}
                    />
                  </div>
                  <div>
                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-0.5">
                      Start Date
                    </span>
                    <InlineDate
                      value={project.startDate}
                      variant="value"
                      placeholder="Set start date"
                      readOnly={!canEditProject}
                      locked={!!project.startDate}
                      maxDate={project.endDate ? new Date(project.endDate) : undefined}
                      onSave={(iso) => handleProjectPatch({ startDate: iso })}
                    />
                  </div>
                  <div>
                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem] mb-0.5">
                      End Date
                    </span>
                    <InlineDate
                      value={project.endDate}
                      variant="value"
                      placeholder="Set end date"
                      readOnly={!canEditProject}
                      locked={!!project.endDate}
                      minDate={project.startDate ? new Date(project.startDate) : undefined}
                      onSave={(iso) => handleProjectPatch({ endDate: iso })}
                    />
                  </div>
                  <div>
                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">Assigned To</span>
                    {assignees.length > 0 ? (
                      <div className="avatar-list-stacked">
                        {assignees.map((u, i) => (
                          <span
                            key={u._id || u.id || u.email || `assignee-${i}`}
                            className="avatar avatar-sm !rounded-full bg-primary/10 text-primary inline-flex items-center justify-center text-[0.6875rem] font-semibold overflow-hidden"
                            title={u.name || u.email || "User"}
                          >
                            <AssigneeAvatar
                              name={u.name || u.email}
                              profilePictureUrl={resolveAssigneePhotoUrl(u, candidateAvatars, sessionAvatar)}
                            />
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="block text-[.875rem] font-semibold">—</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">Status</span>
                    <span className="block">
                      <span className={`badge ${STATUS_BADGE[project.status] ?? "bg-light text-default"}`}>
                        {STATUS_LABEL[project.status] ?? project.status}
                      </span>
                    </span>
                  </div>
                  <div>
                    <span className="block text-[#8c9097] dark:text-white/50 text-[0.75rem]">Priority</span>
                    <span className="block text-[.875rem] font-semibold">
                      <span className={`badge ${PRIORITY_BADGE[priority] ?? "bg-light text-default"}`}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PROJECT TASKS */}
            <div className="box custom-box overflow-hidden">
              <div className="box-header justify-between flex">
                <div className="box-title">Project Tasks</div>
                {!tasksLoading && !tasksError && (
                  <span className="badge bg-light text-default">{tasks.length}</span>
                )}
              </div>
              <div className="box-body !p-0">
                {tasksLoading ? (
                  <div className="text-center py-8 text-[#8c9097] dark:text-white/50 text-[0.875rem]">
                    Loading tasks…
                  </div>
                ) : tasksError ? (
                  <div className="text-center py-8 text-danger text-[0.875rem]">{tasksError}</div>
                ) : tasks.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="ri-list-check-2 text-[1.5rem] text-[#8c9097] dark:text-white/50"></i>
                    <p className="text-[#8c9097] dark:text-white/50 mt-2 mb-0 text-[0.875rem]">
                      No tasks in this project.
                    </p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table whitespace-nowrap min-w-full">
                      <thead>
                        <tr>
                          <th scope="col" className="text-start">
                            Task
                          </th>
                          <th scope="col" className="text-start">
                            Status
                          </th>
                          <th scope="col" className="text-start">
                            Priority
                          </th>
                          <th scope="col" className="text-start">
                            Assignees
                          </th>
                          <th scope="col" className="text-start">
                            Due
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((t) => (
                          <tr key={getTaskId(t)} className="border border-defaultborder">
                            <td>
                              <div className="font-semibold">{t.title}</div>
                              {t.taskCode && (
                                <span className="text-[#8c9097] dark:text-white/50 text-[0.75rem] font-mono">
                                  {t.taskCode}
                                </span>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${TASK_STATUS_BADGE[t.status] ?? "bg-light text-default"}`}>
                                {TASK_STATUS_LABELS[t.status] ?? t.status}
                              </span>
                            </td>
                            <td>
                              {t.priority ? (
                                <span className={`badge ${PRIORITY_BADGE[t.priority] ?? "bg-light text-default"}`}>
                                  {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                                </span>
                              ) : (
                                <span className="text-[#8c9097] dark:text-white/50">—</span>
                              )}
                            </td>
                            <td>
                              <AssigneeBubbles
                                users={t.assignedTo ?? []}
                                candidateAvatarByEmail={candidateAvatars}
                                sessionAvatar={sessionAvatar}
                              />
                            </td>
                            <td>
                              <DueDateCell
                                task={t}
                                readOnly={!canEditProject}
                                onSaved={handleDueDateSaved}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* PROJECT ATTACHMENTS */}
            <div className="box custom-box overflow-hidden">
              <div className="box-header">
                <div className="box-title">Project Documents</div>
              </div>
              <div className="box-body !p-0">
                {attachments.length > 0 ? (
                  <ul className="list-group list-group-flush">
                    {attachments.map((url, i) => (
                      <li key={`${url}-${i}`} className={`list-group-item ${i === 0 ? "!border-t-0" : ""}`}>
                        <div className="flex items-center">
                          <div className="me-2">
                            <span className="avatar !rounded-full p-2 bg-light text-default">
                              <i className="ri-file-3-line text-[1.125rem]"></i>
                            </span>
                          </div>
                          <div className="flex-grow min-w-0">
                            <Link
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block font-semibold truncate"
                            >
                              {attachmentLabel(url, i)}
                            </Link>
                          </div>
                          <div className="inline-flex">
                            <Link
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label="Open attachment"
                              className="ti-btn ti-btn-sm ti-btn-info"
                            >
                              <i className="ri-external-link-line"></i>
                            </Link>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-8">
                    <i className="ri-file-list-3-line text-[1.5rem] text-[#8c9097] dark:text-white/50"></i>
                    <p className="text-[#8c9097] dark:text-white/50 mt-2 mb-0 text-[0.875rem]">
                      No documents attached to this project.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="xl:col-span-3 col-span-12">
            {/* PROJECT TEAM — assigned users */}
            <div className="box custom-box">
              <div className="box-header">
                <div className="box-title">Project Team</div>
              </div>
              <div className="box-body !p-0">
                {assignees.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table w-full table-fixed">
                      <thead>
                        <tr>
                          <th scope="col" className="text-start w-1/2">
                            Name
                          </th>
                          <th scope="col" className="text-start w-1/2">
                            Email
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignees.map((u, i) => (
                          <tr key={u._id || u.id || u.email || `team-${i}`} className="border border-defaultborder">
                            <td className="align-middle">
                              <div className="flex items-center gap-2">
                                <span className="avatar avatar-sm !rounded-full bg-primary/10 text-primary inline-flex items-center justify-center text-[0.6875rem] font-semibold shrink-0 overflow-hidden">
                                  <AssigneeAvatar
                                    name={u.name || u.email}
                                    profilePictureUrl={resolveAssigneePhotoUrl(u, candidateAvatars, sessionAvatar)}
                                  />
                                </span>
                                <span className="font-semibold break-words min-w-0">{u.name?.trim() || "—"}</span>
                              </div>
                            </td>
                            <td className="align-middle">
                              <span className="text-[#8c9097] dark:text-white/50 text-[0.8125rem] break-all">
                                {u.email?.trim() || "—"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <i className="ri-team-line text-[1.5rem] text-[#8c9097] dark:text-white/50"></i>
                    <p className="text-[#8c9097] dark:text-white/50 mt-2 mb-0 text-[0.875rem]">
                      No team members assigned.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ASSIGNED TEAMS */}
            <div className="box custom-box">
              <div className="box-header">
                <div className="box-title">Assigned Teams</div>
              </div>
              <div className="box-body">
                {teams.length > 0 ? (
                  <ul className="list-group">
                    {teams.map((t) => (
                      <li key={t._id || t.id || t.name} className="list-group-item">
                        <div className="flex items-center">
                          <span className="avatar avatar-sm !rounded-full bg-secondary/10 text-secondary inline-flex items-center justify-center me-2">
                            <i className="ri-group-line"></i>
                          </span>
                          <div className="font-semibold">{t.name?.trim() || "Unnamed team"}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-6">
                    <i className="ri-group-line text-[1.5rem] text-[#8c9097] dark:text-white/50"></i>
                    <p className="text-[#8c9097] dark:text-white/50 mt-2 mb-0 text-[0.875rem]">
                      No teams assigned.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* META */}
            <div className="box custom-box">
              <div className="box-header">
                <div className="box-title">Project Info</div>
              </div>
              <div className="box-body">
                <ul className="list-group">
                  <li className="list-group-item flex items-center justify-between">
                    <span className="text-[#8c9097] dark:text-white/50 text-[0.8125rem]">Created By</span>
                    <span className="font-semibold text-[0.8125rem]">
                      {project.createdBy?.name?.trim() || project.createdBy?.email?.trim() || "—"}
                    </span>
                  </li>
                  <li className="list-group-item flex items-center justify-between">
                    <span className="text-[#8c9097] dark:text-white/50 text-[0.8125rem]">Created On</span>
                    <span className="font-semibold text-[0.8125rem]">{fmtDate(project.createdAt)}</span>
                  </li>
                  <li className="list-group-item flex items-center justify-between">
                    <span className="text-[#8c9097] dark:text-white/50 text-[0.8125rem]">Last Updated</span>
                    <span className="font-semibold text-[0.8125rem]">{fmtDate(project.updatedAt)}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default Projectoverview;
