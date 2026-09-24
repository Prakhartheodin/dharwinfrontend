"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Swal from "sweetalert2";
import { usePmReactSelectStyles } from "@/shared/hooks/usePmReactSelectStyles";
import Seo from "@/shared/layout-components/seo/seo";
import { useAuth } from "@/shared/contexts/auth-context";
import { listAllUsers } from "@/shared/lib/api/users";
import { hasPermission } from "@/shared/lib/permissions";
import type { User } from "@/shared/lib/types";
import {
  browserTimezone,
  getMyAvailability,
  getUserAvailability,
  listTimezones,
  saveMyAvailability,
  saveUserAvailability,
  type AvailabilityOverride,
  type InterviewerAvailability,
  type TimeWindow,
} from "@/shared/lib/api/interviewScheduling";

const Select = dynamic(() => import("react-select"), { ssr: false });

type UserOption = { value: string; label: string };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Display order Mon → Sun; `day` values stay 0 = Sunday to match the API. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEKDAYS = [1, 2, 3, 4, 5];
/** Matches the backend Joi max in interviewScheduling.validation.js. */
const MAX_BUFFER = 120;
const DEFAULT_WINDOW: TimeWindow = { start: "10:00", end: "13:00" };

const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const BTN_LIGHT = `ti-btn ti-btn-light !mb-0 !w-auto !h-auto min-h-10 !py-2 !px-3 !text-[0.8125rem] whitespace-nowrap cursor-pointer ${FOCUS_RING}`;
const BTN_ICON = `ti-btn ti-btn-light !mb-0 !h-10 !w-10 !p-0 shrink-0 cursor-pointer ${FOCUS_RING}`;
const SECTION_HEADER = "box-header px-4 py-2 border-b border-dashed dark:border-defaultborder/10";
const SECTION_TITLE = "font-medium mb-0 text-[0.875rem]";
const HELP = "text-[0.75rem] text-defaulttextcolor/70 dark:text-white/55";

const emptyAvailability = (): InterviewerAvailability => ({
  timezone: browserTimezone(),
  bufferMinutes: 15,
  weekly: [],
  overrides: [],
});

function errMsg(e: unknown): string {
  const r = (e as { response?: { status?: number; data?: { message?: string } } })?.response;
  if (r?.status === 403) return "You don't have access to interview scheduling. Ask an administrator for interview access.";
  return r?.data?.message || (e as Error)?.message || "Request failed";
}

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const fromMin = (n: number) => {
  const c = Math.max(0, Math.min(n, 23 * 60 + 59));
  return `${String(Math.floor(c / 60)).padStart(2, "0")}:${String(c % 60).padStart(2, "0")}`;
};

/** New window after the last one of a day, else the 10:00–13:00 default. */
function nextWindow(existing: TimeWindow[]): TimeWindow {
  if (existing.length === 0) return { ...DEFAULT_WINDOW };
  const lastEnd = Math.max(...existing.map((w) => toMin(w.end)));
  if (lastEnd >= 23 * 60) return { ...DEFAULT_WINDOW };
  return { start: fromMin(lastEnd), end: fromMin(lastEnd + 60) };
}

/** Per-window messages keyed by the caller's key: start ≥ end, then overlaps within the group. */
function windowErrors(items: { key: string; start: string; end: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  const valid: { key: string; s: number; e: number }[] = [];
  for (const w of items) {
    if (!w.start || !w.end) out[w.key] = "Enter both times";
    else if (toMin(w.start) >= toMin(w.end)) out[w.key] = "End time must be after start time";
    else valid.push({ key: w.key, s: toMin(w.start), e: toMin(w.end) });
  }
  valid.sort((a, b) => a.s - b.s);
  for (let i = 1; i < valid.length; i += 1) {
    if (valid[i].s < valid[i - 1].e) out[valid[i].key] = "Overlaps another window on this day";
  }
  return out;
}

/** Minutes covered by valid windows, overlapping ranges counted once. */
function coveredMinutes(windows: TimeWindow[]): number {
  const r = windows
    .map((w) => [toMin(w.start), toMin(w.end)] as const)
    .filter(([s, e]) => s < e)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let curS = -1;
  let curE = -1;
  for (const [s, e] of r) {
    if (s > curE) {
      if (curE > curS) total += curE - curS;
      curS = s;
      curE = e;
    } else curE = Math.max(curE, e);
  }
  if (curE > curS) total += curE - curS;
  return total;
}

function nowIn(tz: string): string {
  try {
    return new Intl.DateTimeFormat([], { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date());
  } catch {
    return "";
  }
}

function normalize(data: InterviewerAvailability | null, forMe: boolean): { form: InterviewerAvailability; isNew: boolean } {
  const base = emptyAvailability();
  if (!data) return { form: base, isNew: true };
  // The API returns an unsaved default (no id) for people who never saved; the default zone there is
  // the server's, so use this browser's zone for the signed-in user instead.
  const rec = data as InterviewerAvailability & { id?: string; _id?: string };
  const isNew = !rec.id && !rec._id;
  return {
    isNew,
    form: {
      timezone: isNew && forMe ? base.timezone : data.timezone || base.timezone,
      bufferMinutes: data.bufferMinutes ?? base.bufferMinutes,
      weekly: (data.weekly ?? []).map((w) => ({ day: w.day, start: w.start, end: w.end })),
      overrides: (data.overrides ?? []).map((o) => ({
        date: String(o.date).slice(0, 10),
        blocked: Boolean(o.blocked),
        windows: (o.windows ?? []).map((w) => ({ start: w.start, end: w.end })),
      })),
    },
  };
}

function toBody(form: InterviewerAvailability): InterviewerAvailability {
  return {
    ...form,
    bufferMinutes: Math.min(MAX_BUFFER, Math.max(0, Math.round(Number(form.bufferMinutes) || 0))),
    overrides: form.overrides.map((o) => ({ ...o, windows: o.blocked ? [] : o.windows })),
  };
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return (
    <p id={id} className="mt-1 mb-0 flex items-start gap-1 text-[0.75rem] text-danger" role="alert">
      <i className="ri-error-warning-line mt-px" aria-hidden />
      {msg}
    </p>
  );
}

/** One start/end row. Labels are visible on the first row of a group, screen-reader-only after. */
function TimeRow({
  idBase,
  window: w,
  showLabels,
  error,
  removeLabel,
  onChange,
  onRemove,
}: {
  idBase: string;
  window: TimeWindow;
  showLabels: boolean;
  error?: string;
  removeLabel: string;
  onChange: (patch: Partial<TimeWindow>) => void;
  onRemove: () => void;
}) {
  const errId = `${idBase}-err`;
  const labelCls = showLabels ? "form-label !text-xs !mb-1" : "sr-only";
  const inputCls = `form-control w-full !rounded-md ${error ? "!border-danger" : ""}`;
  return (
    <div>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2">
        <div className="min-w-0">
          <label htmlFor={`${idBase}-start`} className={labelCls}>
            From
          </label>
          <input
            id={`${idBase}-start`}
            type="time"
            className={inputCls}
            value={w.start}
            onChange={(e) => onChange({ start: e.target.value })}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${idBase}-end`} className={labelCls}>
            To
          </label>
          <input
            id={`${idBase}-end`}
            type="time"
            className={inputCls}
            value={w.end}
            onChange={(e) => onChange({ end: e.target.value })}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errId : undefined}
          />
        </div>
        <button type="button" className={BTN_ICON} aria-label={removeLabel} title={removeLabel} onClick={onRemove}>
          <i className="ri-delete-bin-line" aria-hidden />
        </button>
      </div>
      <FieldError id={errId} msg={error} />
    </div>
  );
}

export default function InterviewAvailabilityPage() {
  const { isAdministrator, isPlatformSuperUser, permissions } = useAuth();
  const authView = { permissions, isAdministrator, isPlatformSuperUser };
  // Mirrors the backend: other people's hours = Administrator or interview write access;
  // own hours = the Settings → Interview Availability matrix row (create/edit to save).
  const canEditOthers = isAdministrator || hasPermission(authView, "manage_interview_rubrics");
  const canSaveOwn = isAdministrator || hasPermission(authView, "manage_interview_availability");
  const timezones = useMemo(() => listTimezones(), []);
  const localTz = useMemo(() => browserTimezone(), []);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const { menuPortalTarget, styles: selectStyles } = usePmReactSelectStyles(9999);
  const [targetUserId, setTargetUserId] = useState<string>(""); // "" = me
  const [form, setForm] = useState<InterviewerAvailability>(emptyAvailability);
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!canEditOthers) return;
    setUsersLoading(true);
    listAllUsers({ status: "active" })
      .then(setUsers)
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [canEditOthers]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setAttempted(false);
    try {
      const data = targetUserId ? await getUserAvailability(targetUserId) : await getMyAvailability();
      const n = normalize(data, !targetUserId);
      setForm(n.form);
      setIsNew(n.isNew);
      setSavedSnapshot(JSON.stringify(toBody(n.form)));
    } catch (e) {
      // Never fall back to defaults here: saving them would overwrite the real schedule.
      setLoadError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = !loading && !loadError && JSON.stringify(toBody(form)) !== savedSnapshot;

  // Covers reload / tab close only; in-app link navigation is not intercepted (app router has no hook).
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const errors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const day of WEEK_ORDER) {
      Object.assign(
        out,
        windowErrors(
          form.weekly.map((w, i) => ({ ...w, key: `w-${i}` })).filter((_, i) => form.weekly[i].day === day)
        )
      );
    }
    const seen = new Set<string>();
    form.overrides.forEach((o, i) => {
      if (!o.date) {
        if (attempted) out[`o-${i}`] = "Pick a date";
      } else if (seen.has(o.date)) out[`o-${i}`] = "This date already has an override above";
      seen.add(o.date);
      if (!o.blocked) Object.assign(out, windowErrors(o.windows.map((w, wi) => ({ ...w, key: `o-${i}-${wi}` }))));
    });
    return out;
  }, [form, attempted]);
  const errorCount = Object.keys(errors).length;

  const weeklyHours = useMemo(() => {
    let mins = 0;
    for (const day of WEEK_ORDER) mins += coveredMinutes(form.weekly.filter((w) => w.day === day));
    return Math.round((mins / 60) * 10) / 10;
  }, [form.weekly]);

  const targetUser = users.find((u) => u.id === targetUserId);
  const canSave = targetUserId ? canEditOthers : canSaveOwn;
  // Label carries name + email so react-select's default filter matches a partial name OR email.
  const userOptions = useMemo<UserOption[]>(
    () => [
      { value: "", label: "Myself" },
      ...users
        .map((u) => ({ value: u.id, label: u.name ? `${u.name} (${u.email})` : u.email }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    ],
    [users]
  );
  const selectedUserOption = userOptions.find((o) => o.value === targetUserId) ?? userOptions[0];
  const who = targetUserId ? targetUser?.name || targetUser?.email || "This person" : "You";
  const whoIs = targetUserId ? `${who} is` : "You're";

  const changeTarget = async (id: string) => {
    if (dirty) {
      const r = await Swal.fire({
        icon: "warning",
        title: "Discard unsaved changes?",
        text: "Your edits to this schedule have not been saved.",
        showCancelButton: true,
        confirmButtonText: "Discard",
        cancelButtonText: "Keep editing",
      });
      if (!r.isConfirmed) return;
    }
    setTargetUserId(id);
  };

  const setWeekly = (i: number, patch: Partial<TimeWindow>) =>
    setForm((f) => ({ ...f, weekly: f.weekly.map((w, idx) => (idx === i ? { ...w, ...patch } : w)) }));
  const addWeekly = (day: number) =>
    setForm((f) => ({ ...f, weekly: [...f.weekly, { day, ...nextWindow(f.weekly.filter((w) => w.day === day)) }] }));
  const removeWeekly = (i: number) => setForm((f) => ({ ...f, weekly: f.weekly.filter((_, idx) => idx !== i) }));
  const copyToWeekdays = (day: number) =>
    setForm((f) => {
      const src = f.weekly.filter((w) => w.day === day);
      const others = WEEKDAYS.filter((d) => d !== day);
      return {
        ...f,
        weekly: [
          ...f.weekly.filter((w) => !others.includes(w.day)),
          ...others.flatMap((d) => src.map((w) => ({ day: d, start: w.start, end: w.end }))),
        ],
      };
    });

  const setOverride = (i: number, patch: Partial<AvailabilityOverride>) =>
    setForm((f) => ({ ...f, overrides: f.overrides.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) }));

  const save = async () => {
    setAttempted(true);
    // Missing override dates only count once a save is attempted, so recompute that part here.
    const hasErrors = errorCount > 0 || form.overrides.some((o) => !o.date);
    if (hasErrors) {
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('#availability-form [aria-invalid="true"]')?.focus();
      });
      return;
    }
    const body = toBody(form);
    setSaving(true);
    try {
      if (targetUserId) await saveUserAvailability(targetUserId, body);
      else await saveMyAvailability(body);
      setSavedSnapshot(JSON.stringify(body));
      setIsNew(false);
      setAttempted(false);
      void Swal.fire({
        icon: "success",
        title: "Availability saved",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2800,
        timerProgressBar: true,
      });
    } catch (e) {
      await Swal.fire({ icon: "error", title: "Could not save availability", text: errMsg(e) });
    } finally {
      setSaving(false);
    }
  };

  const tzNow = nowIn(form.timezone);
  // `errors` already includes missing override dates once a save was attempted.
  const summaryErrors = attempted ? errorCount : 0;

  return (
    <Fragment>
      <Seo title="Interview Availability" />
      <div className="sm:p-4 p-4 space-y-4">
        {/* ── Header ── */}
        <div className="box overflow-hidden !mb-0">
          <div className="box-body px-4 py-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 max-w-3xl">
                <h2 className="text-lg font-semibold text-defaulttextcolor mb-0">Interview availability</h2>
                <p className="text-sm text-defaulttextcolor/70 mt-1 mb-0">
                  Candidates can only be booked into these hours, minus anything already on the calendar. Leave the
                  week empty to be unbookable.
                </p>
              </div>
              {!loading && !loadError && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.75rem] font-medium ${
                    weeklyHours > 0 ? "bg-success/10 text-success" : "bg-warning/15 text-warning"
                  }`}
                >
                  <i className={weeklyHours > 0 ? "ri-calendar-check-line" : "ri-calendar-close-line"} aria-hidden />
                  {weeklyHours > 0
                    ? `${whoIs} bookable ~${weeklyHours} hours/week`
                    : `${whoIs} not bookable`}
                </span>
              )}
            </div>
            {canEditOthers && (
              <div className="max-w-md">
                <label htmlFor="availability-target" className="form-label !text-xs !mb-1">
                  Editing availability for
                </label>
                <Select
                  inputId="availability-target"
                  instanceId="availability-target"
                  options={userOptions}
                  value={selectedUserOption}
                  onChange={(v: unknown) => {
                    const next = (v as UserOption | null)?.value ?? "";
                    if (next !== targetUserId) void changeTarget(next);
                  }}
                  isSearchable
                  isLoading={usersLoading}
                  isDisabled={saving}
                  className="ti-form-select !p-0"
                  classNamePrefix="Select2"
                  placeholder="Search by name or email"
                  noOptionsMessage={({ inputValue }: { inputValue: string }) =>
                    inputValue ? `No user matches "${inputValue}"` : "No users"
                  }
                  menuPlacement="auto"
                  menuPortalTarget={menuPortalTarget}
                  styles={selectStyles}
                />
                <p className="mt-1 mb-0 text-xs text-defaulttextcolor/70">
                  Type part of a name or email to filter {users.length ? `${users.length} users` : "users"}.
                </p>
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="box overflow-hidden !mb-0">
            <div className="box-body p-6 flex items-center justify-center" role="status" aria-live="polite">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" aria-hidden />
              <span className="sr-only">Loading availability…</span>
            </div>
          </div>
        ) : loadError ? (
          <div className="box overflow-hidden !mb-0">
            <div className="box-body px-4 py-4 space-y-3">
              <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger" role="alert">
                <i className="ri-error-warning-line me-1" aria-hidden />
                Could not load availability. {loadError}
              </div>
              <button type="button" className={BTN_LIGHT} onClick={() => void load()}>
                <i className="ri-refresh-line me-1" aria-hidden />
                Retry
              </button>
            </div>
          </div>
        ) : (
          <form
            id="availability-form"
            className="space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            {isNew && (
              <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-defaulttextcolor">
                <i className="ri-information-line me-1 text-warning" aria-hidden />
                {targetUserId ? `${who} hasn't` : "You haven't"} saved availability yet, so the AI agent won&apos;t
                offer any interview slots {targetUserId ? "with them" : "with you"}. Add weekly hours below and save.
              </div>
            )}

            {/* ── Timezone + buffer ── */}
            <div className="box overflow-hidden !mb-0">
              <div className={SECTION_HEADER}>
                <h6 className={SECTION_TITLE}>General</h6>
              </div>
              <div className="box-body px-4 py-3">
                <div className="grid grid-cols-12 gap-3">
                  <div className="col-span-12 sm:col-span-7">
                    <label htmlFor="availability-tz" className="form-label !text-xs !mb-1">
                      Timezone
                    </label>
                    <select
                      id="availability-tz"
                      className="form-select w-full"
                      value={form.timezone}
                      onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                      aria-describedby="availability-tz-help"
                    >
                      {!timezones.includes(form.timezone) && <option value={form.timezone}>{form.timezone}</option>}
                      {timezones.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                    <p id="availability-tz-help" className={`${HELP} mt-1 mb-0`}>
                      All hours on this page are in <strong className="font-semibold">{form.timezone}</strong>
                      {tzNow ? ` (now ${tzNow} there)` : ""}. Candidates see slots converted to their own timezone.
                    </p>
                    {!targetUserId && form.timezone !== localTz && (
                      <button
                        type="button"
                        className={`${BTN_LIGHT} mt-2`}
                        onClick={() => setForm((f) => ({ ...f, timezone: localTz }))}
                      >
                        <i className="ri-map-pin-time-line me-1" aria-hidden />
                        Use this device&apos;s timezone ({localTz})
                      </button>
                    )}
                  </div>
                  <div className="col-span-12 sm:col-span-5">
                    <label htmlFor="availability-buffer" className="form-label !text-xs !mb-1">
                      Buffer between interviews (minutes)
                    </label>
                    <input
                      id="availability-buffer"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={MAX_BUFFER}
                      step={5}
                      className="form-control w-full !rounded-md"
                      value={form.bufferMinutes}
                      onChange={(e) => setForm((f) => ({ ...f, bufferMinutes: Number(e.target.value) }))}
                      aria-describedby="availability-buffer-help"
                    />
                    <p id="availability-buffer-help" className={`${HELP} mt-1 mb-0`}>
                      Free time kept around each booked interview. 0–{MAX_BUFFER} minutes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Weekly hours ── */}
            <div className="box overflow-hidden !mb-0">
              <div className={SECTION_HEADER}>
                <h6 className={SECTION_TITLE}>Weekly hours</h6>
              </div>
              <div className="box-body px-4 py-1">
                {form.weekly.length === 0 && (
                  <p className={`${HELP} pt-2 mb-0`}>
                    No weekly hours yet. Use <strong>Add window</strong> on any day to become bookable.
                  </p>
                )}
                {WEEK_ORDER.map((day) => {
                  const rows = form.weekly
                    .map((w, i) => ({ w, i }))
                    .filter(({ w }) => w.day === day);
                  const headingId = `day-${day}-heading`;
                  return (
                    <div
                      key={day}
                      role="group"
                      aria-labelledby={headingId}
                      className="grid gap-2 py-3 border-b border-dashed border-defaultborder last:border-b-0 dark:border-defaultborder/10 sm:grid-cols-[8rem_minmax(0,1fr)]"
                    >
                      <div className="flex items-center justify-between gap-2 sm:block sm:pt-2">
                        <span id={headingId} className="text-sm font-medium text-defaulttextcolor">
                          {DAYS[day]}
                        </span>
                        {rows.length === 0 && (
                          <span className="text-[0.75rem] text-defaulttextcolor/60 dark:text-white/50 sm:hidden">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 space-y-2">
                        {rows.length === 0 && (
                          <p className="hidden sm:block text-[0.8125rem] text-defaulttextcolor/60 dark:text-white/50 pt-2 mb-0">
                            Unavailable
                          </p>
                        )}
                        {rows.map(({ w, i }, pos) => (
                          <TimeRow
                            key={i}
                            idBase={`w-${i}`}
                            window={w}
                            showLabels={pos === 0}
                            error={errors[`w-${i}`]}
                            removeLabel={`Remove ${DAYS[day]} ${w.start}–${w.end}`}
                            onChange={(patch) => setWeekly(i, patch)}
                            onRemove={() => removeWeekly(i)}
                          />
                        ))}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={BTN_LIGHT}
                            onClick={() => addWeekly(day)}
                            aria-label={`Add window on ${DAYS[day]}`}
                          >
                            <i className="ri-add-line me-1" aria-hidden />
                            Add window
                          </button>
                          {rows.length > 0 && WEEKDAYS.includes(day) && (
                            <button
                              type="button"
                              className={BTN_LIGHT}
                              onClick={() => copyToWeekdays(day)}
                              title={`Replace Monday–Friday hours with ${DAYS[day]}'s`}
                            >
                              <i className="ri-file-copy-line me-1" aria-hidden />
                              Copy to Mon–Fri
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Date overrides ── */}
            <div className="box overflow-hidden !mb-0">
              <div className={`${SECTION_HEADER} flex flex-wrap items-center justify-between gap-2`}>
                <h6 className={SECTION_TITLE}>Date overrides</h6>
                <button
                  type="button"
                  className={BTN_LIGHT}
                  onClick={() =>
                    setForm((f) => ({ ...f, overrides: [...f.overrides, { date: "", blocked: true, windows: [] }] }))
                  }
                >
                  <i className="ri-add-line me-1" aria-hidden />
                  Add date
                </button>
              </div>
              <div className="box-body px-4 py-3 space-y-3">
                <p className={`${HELP} mb-0`}>
                  Replace the weekly hours on a specific date, for example a holiday or a one-off late shift.
                </p>
                {form.overrides.length === 0 && (
                  <p className="text-[0.8125rem] text-defaulttextcolor/60 dark:text-white/50 mb-0">No date overrides.</p>
                )}
                {form.overrides.map((o, i) => {
                  const dateErr = errors[`o-${i}`];
                  const label = o.date || `override ${i + 1}`;
                  return (
                    <div
                      key={i}
                      className="rounded-md border border-defaultborder p-3 dark:border-defaultborder/10 space-y-2"
                    >
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
                        <div className="min-w-0">
                          <label htmlFor={`o-${i}-date`} className="form-label !text-xs !mb-1">
                            Date
                          </label>
                          <input
                            id={`o-${i}-date`}
                            type="date"
                            className={`form-control w-full !rounded-md ${dateErr ? "!border-danger" : ""}`}
                            value={o.date}
                            onChange={(e) => setOverride(i, { date: e.target.value })}
                            aria-invalid={dateErr ? true : undefined}
                            aria-describedby={dateErr ? `o-${i}-date-err` : undefined}
                          />
                        </div>
                        <div className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto flex min-h-10 items-center">
                          <input
                            id={`o-${i}-blocked`}
                            type="checkbox"
                            className="form-check-input cursor-pointer"
                            checked={o.blocked}
                            onChange={(e) =>
                              setOverride(i, {
                                blocked: e.target.checked,
                                windows: e.target.checked ? [] : o.windows.length ? o.windows : [{ ...DEFAULT_WINDOW }],
                              })
                            }
                          />
                          <label htmlFor={`o-${i}-blocked`} className="ms-2 text-sm cursor-pointer mb-0">
                            Unavailable all day
                          </label>
                        </div>
                        <button
                          type="button"
                          className={`${BTN_ICON} col-start-2 row-start-1 sm:col-start-3`}
                          aria-label={`Remove ${label}`}
                          title={`Remove ${label}`}
                          onClick={() =>
                            setForm((f) => ({ ...f, overrides: f.overrides.filter((_, idx) => idx !== i) }))
                          }
                        >
                          <i className="ri-delete-bin-line" aria-hidden />
                        </button>
                      </div>
                      <FieldError id={`o-${i}-date-err`} msg={dateErr} />
                      {!o.blocked && (
                        <div className="space-y-2 border-t border-dashed border-defaultborder pt-2 dark:border-defaultborder/10">
                          {o.windows.length === 0 && (
                            <p className="text-[0.8125rem] text-defaulttextcolor/60 dark:text-white/50 mb-0">
                              No hours on this date — same as unavailable.
                            </p>
                          )}
                          {o.windows.map((w, wi) => (
                            <TimeRow
                              key={wi}
                              idBase={`o-${i}-${wi}`}
                              window={w}
                              showLabels={wi === 0}
                              error={errors[`o-${i}-${wi}`]}
                              removeLabel={`Remove ${w.start}–${w.end} on ${label}`}
                              onChange={(patch) =>
                                setOverride(i, {
                                  windows: o.windows.map((x, xi) => (xi === wi ? { ...x, ...patch } : x)),
                                })
                              }
                              onRemove={() => setOverride(i, { windows: o.windows.filter((_, xi) => xi !== wi) })}
                            />
                          ))}
                          <button
                            type="button"
                            className={BTN_LIGHT}
                            onClick={() => setOverride(i, { windows: [...o.windows, nextWindow(o.windows)] })}
                          >
                            <i className="ri-add-line me-1" aria-hidden />
                            Add window
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="box overflow-hidden !mb-0">
              <div className="box-body !p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0 text-[0.8125rem]" aria-live="polite">
                    {summaryErrors > 0 ? (
                      <span className="text-danger" role="alert">
                        <i className="ri-error-warning-line me-1" aria-hidden />
                        Fix {summaryErrors} highlighted {summaryErrors === 1 ? "field" : "fields"} before saving.
                      </span>
                    ) : dirty || isNew ? (
                      <span className="text-defaulttextcolor/70 dark:text-white/60">
                        <i className="ri-edit-circle-line me-1" aria-hidden />
                        Unsaved changes
                      </span>
                    ) : (
                      <span className="text-defaulttextcolor/60 dark:text-white/50">
                        <i className="ri-checkbox-circle-line me-1" aria-hidden />
                        All changes saved
                      </span>
                    )}
                  </div>
                  <button
                    type="submit"
                    className={`ti-btn ti-btn-primary !mb-0 !w-auto !h-auto min-h-10 whitespace-nowrap cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed ${FOCUS_RING}`}
                    disabled={saving || (!dirty && !isNew) || !canSave}
                    title={canSave ? undefined : "Your role can view these hours but not change them"}
                  >
                    {saving ? (
                      <>
                        <span className="inline-block size-4 animate-spin rounded-full border-2 border-white/40 border-t-white align-[-0.125em] me-2" aria-hidden />
                        Saving…
                      </>
                    ) : (
                      <>
                        <i className="ri-save-3-line me-1.5 align-middle" aria-hidden />
                        Save availability
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </Fragment>
  );
}
