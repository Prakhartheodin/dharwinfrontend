"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  getInternalMeetingOrientationOnboarding,
  patchInternalMeetingOrientationOnboarding,
  type OrientationOnboardingTask,
} from "@/shared/lib/api/internal-meetings";

export interface OrientationHostChecklistProps {
  meetingId: string;
  variant?: "default" | "obsidian";
  layout?: "overlay" | "panel";
  onDismiss?: () => void;
}

function apiErrorMessage(err: unknown, fallback: string): string {
  const ax = err as { response?: { data?: { message?: string } }; message?: string };
  return ax?.response?.data?.message || ax?.message || fallback;
}

export default function OrientationHostChecklist({
  meetingId,
  variant = "default",
  layout = "panel",
  onDismiss,
}: OrientationHostChecklistProps) {
  const isObsidian = variant === "obsidian";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);
  const [ended, setEnded] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [tasks, setTasks] = useState<OrientationOnboardingTask[]>([]);

  const load = useCallback(async () => {
    if (!meetingId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getInternalMeetingOrientationOnboarding(meetingId);
      if (!data.linked) {
        setLinked(false);
        setTasks([]);
        return;
      }
      setLinked(true);
      setEnded(Boolean(data.ended));
      setCandidateName((data.candidateName || "").trim());
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 403 || status === 404) {
        setLinked(false);
        return;
      }
      setError(apiErrorMessage(err, "Could not load the orientation checklist"));
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleTask = (title: string, done: boolean) => {
    setSavedNote(null);
    setTasks((prev) => prev.map((t) => (t.title === title ? { ...t, done } : t)));
  };

  const handleSave = async () => {
    if (!meetingId || saving || !ended) return;
    setSaving(true);
    setError(null);
    setSavedNote(null);
    try {
      const data = await patchInternalMeetingOrientationOnboarding(
        meetingId,
        tasks.map((t) => ({ title: t.title, done: t.done }))
      );
      if (Array.isArray(data.tasks)) setTasks(data.tasks);
      setSavedNote("Saved to Edit HRMS onboarding");
      if (layout === "overlay") onDismiss?.();
    } catch (err: unknown) {
      setError(apiErrorMessage(err, "Could not save the orientation checklist"));
    } finally {
      setSaving(false);
    }
  };

  if (!loading && !linked) return null;
  if (layout === "panel" && loading) return null;

  const shellClass = isObsidian
    ? "fixed inset-0 z-[200] flex items-center justify-center bg-[#0f1012]/95 p-4"
    : "fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4";

  const cardClass = isObsidian
    ? "dark w-full max-w-lg rounded-xl border border-white/15 bg-[#16181c] text-gray-100 shadow-2xl"
    : "w-full max-w-lg rounded-xl border border-defaultborder bg-white shadow-xl dark:border-defaultborder/10 dark:bg-bodybg";

  const headerClass = isObsidian
    ? "border-b border-white/10 px-5 py-4"
    : "border-b border-defaultborder/70 px-5 py-4 dark:border-defaultborder/10";

  const footerClass = isObsidian
    ? "flex justify-end gap-2 border-t border-white/10 px-5 py-3"
    : "flex justify-end gap-2 border-t border-defaultborder/70 px-5 py-3.5 dark:border-defaultborder/10";

  const skipButtonClass = isObsidian
    ? "ti-btn min-h-11 !px-4 !py-2 !text-sm font-medium !text-white border border-white/20 !bg-white/10 hover:!bg-white/15"
    : "ti-btn ti-btn-light min-h-11 !px-4 !py-2 !text-sm font-medium";

  const saveButtonClass = isObsidian
    ? "ti-btn ti-btn-primary min-h-11 !px-4 !py-2 !text-sm !text-white"
    : "ti-btn ti-btn-primary min-h-11 !px-4 !py-2 !text-sm";

  const checkboxRowClass = isObsidian
    ? "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-white/15 px-3 py-2 text-sm text-gray-100"
    : "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-defaultborder px-3 py-2 text-sm text-defaulttextcolor dark:border-white/15 dark:text-white";

  const body = (
    <>
      <div className={layout === "overlay" ? headerClass : "mb-3"}>
        <h2
          id="orientation-host-checklist-title"
          className={
            isObsidian
              ? "text-lg font-semibold text-white"
              : "text-base font-semibold text-defaulttextcolor dark:text-white"
          }
        >
          Confirm orientation onboarding
        </h2>
        <p
          className={
            isObsidian
              ? "mt-1 text-sm text-white/70"
              : "mt-1 text-sm text-defaulttextcolor/70 dark:text-white/70"
          }
        >
          {candidateName
            ? `Host confirmation for ${candidateName}. These two items save to Edit HRMS onboarding.`
            : "Host confirmation. These two items save to Edit HRMS onboarding."}
        </p>
      </div>

      <div className={layout === "overlay" ? "space-y-3 px-5 py-4" : "space-y-3"}>
        {loading ? (
          <p className="text-sm text-defaulttextcolor/70 dark:text-white/70" aria-busy="true">
            Loading checklist…
          </p>
        ) : (
          <ul className="space-y-2" role="list">
            {tasks.map((task) => (
              <li key={task.title}>
                <label className={checkboxRowClass}>
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0"
                    checked={task.done}
                    disabled={saving || !ended}
                    onChange={(e) => toggleTask(task.title, e.target.checked)}
                  />
                  <span>
                    {task.title}
                    {task.required ? (
                      <span className="ms-1 text-danger" aria-hidden>
                        *
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {!loading && !ended ? (
          <p className="mb-0 text-sm text-defaulttextcolor/70 dark:text-white/70">
            Available after this orientation meeting ends.
          </p>
        ) : null}
        {error ? (
          <p className="mb-0 text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {savedNote ? (
          <p className="mb-0 text-sm text-success" role="status" aria-live="polite">
            {savedNote}
          </p>
        ) : null}
      </div>

      <div className={layout === "overlay" ? footerClass : "mt-4 flex flex-wrap justify-end gap-2"}>
        {layout === "overlay" && onDismiss ? (
          <button type="button" className={skipButtonClass} onClick={onDismiss} disabled={saving}>
            Not now
          </button>
        ) : null}
        <button
          type="button"
          className={saveButtonClass}
          onClick={() => void handleSave()}
          disabled={saving || loading || !ended || tasks.length === 0}
        >
          {saving ? "Saving…" : "Save to Edit HRMS"}
        </button>
      </div>
    </>
  );

  if (layout === "panel") {
    return (
      <section
        aria-labelledby="orientation-host-checklist-title"
        className="rounded-xl border border-defaultborder bg-white px-4 py-4 dark:border-defaultborder/10 dark:bg-bodybg"
      >
        {body}
      </section>
    );
  }

  return (
    <div className={shellClass} role="dialog" aria-modal="true" aria-labelledby="orientation-host-checklist-title">
      <div className={cardClass}>{body}</div>
    </div>
  );
}
