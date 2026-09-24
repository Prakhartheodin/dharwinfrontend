"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  browserTimezone,
  confirmPublicBooking,
  getPublicBooking,
  listTimezones,
  type BookingSlot,
  type PublicBooking,
} from "@/shared/lib/api/interviewScheduling";

function fmt(iso: string | number | Date, tz: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Date(iso).toLocaleString(undefined, { timeZone: tz, ...opts });
  } catch {
    return new Date(iso).toLocaleString(undefined, opts);
  }
}

const FULL_DAY: Intl.DateTimeFormatOptions = { weekday: "long", month: "long", day: "numeric" };
const TIME: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
const TIME_TZ: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", timeZoneName: "short" };

type ApiErr = { response?: { status?: number; data?: { message?: string; errorCode?: string } }; message?: string };

function errMsg(e: unknown): string {
  const r = (e as ApiErr)?.response;
  return r?.data?.message || (e as ApiErr)?.message || "Something went wrong";
}

/** The booking token is a signed JWT; the API answers 401 (or 404/410) once it is bad or past its 7 days. */
function isDeadLink(e: unknown): boolean {
  const s = (e as ApiErr)?.response?.status;
  return s === 401 || s === 403 || s === 404 || s === 410;
}

function isSlotTaken(e: unknown): boolean {
  const r = (e as ApiErr)?.response;
  return r?.status === 409 || r?.data?.errorCode === "SLOT_TAKEN";
}

function durationOf(data: PublicBooking | null): number | null {
  if (data?.hold?.durationMinutes) return data.hold.durationMinutes;
  const s = data?.slots?.[0];
  if (!s) return null;
  const mins = Math.round((new Date(s.end).getTime() - new Date(s.start).getTime()) / 60000);
  return Number.isFinite(mins) && mins > 0 ? mins : null;
}

/** Mirrors the loaded layout so the swap-in doesn't jump. */
function BookingSkeleton() {
  return (
    <div className="animate-pulse space-y-6 px-4 py-6 sm:px-8" aria-hidden>
      <div className="h-16 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
      <div className="space-y-2">
        <div className="h-4 w-28 rounded bg-slate-200 dark:bg-white/10" />
        <div className="h-11 rounded-lg bg-slate-100 dark:bg-white/[0.06]" />
      </div>
      {Array.from({ length: 2 }).map((_, d) => (
        <div key={d} className="space-y-3">
          <div className="h-4 w-44 rounded bg-slate-200 dark:bg-white/10" />
          <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((__, i) => (
              <div key={i} className="h-12 rounded-xl bg-slate-100 dark:bg-white/[0.06]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Centered icon + heading + copy used by every terminal state (reserved, scheduled, closed, dead link, empty). */
function StatePanel({
  icon,
  tone,
  title,
  headingRef,
  children,
}: {
  icon: string;
  tone: "success" | "warning" | "danger" | "neutral" | "primary";
  title: string;
  headingRef?: React.Ref<HTMLHeadingElement>;
  children: React.ReactNode;
}) {
  const toneCls = {
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    danger: "bg-rose-500/10 text-rose-500",
    neutral: "bg-slate-200/70 text-[#475569] dark:bg-white/10 dark:text-white/70",
    primary: "bg-primary/10 text-primary",
  }[tone];
  return (
    <div className="px-4 py-8 text-center sm:px-8 sm:py-10">
      <span className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${toneCls}`}>
        <i className={`${icon} text-2xl`} aria-hidden />
      </span>
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="mb-2 text-lg font-semibold text-defaulttextcolor outline-none dark:text-white"
      >
        {title}
      </h2>
      <div className="mx-auto max-w-md space-y-3 text-sm leading-relaxed text-[#64748b] dark:text-white/60">{children}</div>
    </div>
  );
}

/** The chosen time, shown in the reserved / scheduled states. */
function TimeCard({ iso, tz, minutes }: { iso: string; tz: string; minutes: number | null }) {
  return (
    <div className="mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-defaultborder/70 bg-slate-50/70 px-4 py-3 text-start dark:border-white/10 dark:bg-white/[0.04]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <i className="ri-calendar-event-line text-lg" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-defaulttextcolor dark:text-white">{fmt(iso, tz, FULL_DAY)}</p>
        <p className="text-sm text-[#64748b] dark:text-white/60">
          {fmt(iso, tz, TIME_TZ)}
          {minutes ? ` · ${minutes} min` : ""}
        </p>
      </div>
    </div>
  );
}

/** Public, no-login page where a candidate picks an interview slot from an emailed link. */
export default function BookInterviewPage() {
  const params = useParams();
  const token = (params?.token as string) || "";
  const timezones = useMemo(() => listTimezones(), []);
  const [tz, setTz] = useState<string>(() => browserTimezone());
  const [data, setData] = useState<PublicBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [deadLink, setDeadLink] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [justReserved, setJustReserved] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const submittingRef = useRef(false);
  const loadGen = useRef(0);
  const stateHeadingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    document.title = "Choose your interview time";
  }, []);

  // Keeps the "it's 3:05 PM there now" preview honest while the page sits open.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const load = useCallback(async () => {
    if (!token) {
      setDeadLink(true);
      setLoading(false);
      return;
    }
    const gen = ++loadGen.current;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getPublicBooking(token, tz);
      if (gen !== loadGen.current) return;
      setData(res);
    } catch (e) {
      if (gen !== loadGen.current) return;
      if (isDeadLink(e)) setDeadLink(true);
      else setLoadError(errMsg(e));
    } finally {
      if (gen === loadGen.current) setLoading(false);
    }
  }, [token, tz]);

  useEffect(() => {
    void load();
  }, [load]);

  // Drop a selection that vanished from a refreshed list (taken by someone else, or tz reload).
  useEffect(() => {
    if (selected && !data?.slots?.some((s) => s.slot_id === selected)) setSelected(null);
  }, [data, selected]);

  // After a confirm, move focus to the outcome heading so screen readers announce it.
  useEffect(() => {
    if (justReserved) stateHeadingRef.current?.focus();
  }, [justReserved, data?.state]);

  const groups = useMemo(() => {
    const out: { day: string; slots: BookingSlot[] }[] = [];
    for (const s of data?.slots ?? []) {
      const day = fmt(s.start, tz, FULL_DAY);
      const g = out.find((x) => x.day === day);
      if (g) g.slots.push(s);
      else out.push({ day, slots: [s] });
    }
    return out;
  }, [data, tz]);

  const selectedSlot = useMemo(
    () => (selected ? data?.slots?.find((s) => s.slot_id === selected) ?? null : null),
    [data, selected]
  );

  const confirm = async () => {
    if (!selected || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await confirmPublicBooking(token, selected, tz);
      setJustReserved(true);
      if (res && res.state) setData(res);
      else await load();
    } catch (e) {
      if (isDeadLink(e)) {
        setDeadLink(true);
      } else {
        await load();
        setNotice(
          isSlotTaken(e)
            ? "Sorry, someone just booked that time. We've refreshed the list, so please pick another."
            : errMsg(e)
        );
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const state = data?.state;
  const holdStart = data?.hold?.start;
  const minutes = durationOf(data);
  const firstName = data?.candidateName?.trim().split(/\s+/)[0];
  const tzLabel = (z: string) => z.replace(/_/g, " ");
  const showPicker = !deadLink && state === "open" && groups.length > 0;
  // A failed background refresh keeps the last good list on screen and explains itself inline.
  const inlineError = notice || (data ? loadError : null);

  let body: React.ReactNode;
  if (deadLink) {
    body = (
      <StatePanel icon="ri-link-unlink-m" tone="danger" title="This link has expired" headingRef={stateHeadingRef}>
        <p>Booking links are valid for 7 days, and this one is no longer active or was copied incompletely.</p>
        <p>Reply to the invitation email or contact your recruiter and they&apos;ll send you a fresh link.</p>
      </StatePanel>
    );
  } else if (loading && !data) {
    body = <BookingSkeleton />;
  } else if (loadError && !data) {
    body = (
      <StatePanel icon="ri-wifi-off-line" tone="neutral" title="We couldn't load your times" headingRef={stateHeadingRef}>
        <p>{loadError}</p>
        <button type="button" className="ti-btn ti-btn-primary min-h-[44px]" onClick={() => void load()}>
          <i className="ri-refresh-line me-1.5" aria-hidden />
          Try again
        </button>
      </StatePanel>
    );
  } else if (state === "pending") {
    body = (
      <StatePanel
        icon="ri-checkbox-circle-line"
        tone="success"
        title={justReserved ? "You're all set. Your time is reserved" : "Your time is reserved"}
        headingRef={stateHeadingRef}
      >
        {holdStart && <TimeCard iso={holdStart} tz={tz} minutes={minutes} />}
        <p>
          The hiring team will confirm it shortly. Once they do, you&apos;ll get a confirmation email with the meeting
          link. There&apos;s nothing else you need to do.
        </p>
      </StatePanel>
    );
  } else if (state === "scheduled") {
    body = (
      <StatePanel icon="ri-calendar-check-line" tone="success" title="Your interview is confirmed" headingRef={stateHeadingRef}>
        {holdStart && <TimeCard iso={holdStart} tz={tz} minutes={minutes} />}
        <p>Check your email for the calendar invitation and the meeting link.</p>
      </StatePanel>
    );
  } else if (state === "closed") {
    body = (
      <StatePanel icon="ri-lock-line" tone="neutral" title="This booking link is no longer active" headingRef={stateHeadingRef}>
        <p>Scheduling for this application has closed.</p>
        <p>If you still want to interview, reply to the invitation email or contact your recruiter and they&apos;ll help.</p>
      </StatePanel>
    );
  } else if (state === "open" && groups.length === 0) {
    body = (
      <StatePanel icon="ri-calendar-close-line" tone="warning" title="No times available right now">
        <p>All open times have been booked. The hiring team will email you new options, and you can check back here anytime.</p>
        <button
          type="button"
          className="ti-btn ti-btn-light min-h-[44px]"
          disabled={loading}
          onClick={() => void load()}
        >
          <i className={`${loading ? "ri-loader-4-line animate-spin" : "ri-refresh-line"} me-1.5`} aria-hidden />
          Check again
        </button>
      </StatePanel>
    );
  } else if (showPicker) {
    body = (
      <div className="space-y-6 px-4 py-6 sm:px-8">
        <ol className="grid gap-2 rounded-xl border border-defaultborder/70 bg-slate-50/70 p-3.5 text-sm text-[#475569] sm:p-4 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70">
          {[
            "Pick a time that works for you below.",
            "We reserve it for you while the hiring team confirms.",
            "You'll get a confirmation email with the meeting link.",
          ].map((t, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[0.6875rem] font-semibold text-primary">
                {i + 1}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>

        <div>
          <label htmlFor="tz" className="form-label">
            Your timezone
          </label>
          <select
            id="tz"
            className="form-select min-h-[44px]"
            value={tz}
            aria-describedby="tz-now"
            onChange={(e) => setTz(e.target.value)}
          >
            {!timezones.includes(tz) && <option value={tz}>{tzLabel(tz)}</option>}
            {timezones.map((z) => (
              <option key={z} value={z}>
                {tzLabel(z)}
              </option>
            ))}
          </select>
          <p id="tz-now" className="mt-1.5 flex items-center gap-1.5 text-xs text-[#64748b] dark:text-white/50">
            <i className="ri-time-line text-primary/70" aria-hidden />
            It&apos;s {fmt(now, tz, TIME_TZ)} there now. All times below are shown in this timezone.
          </p>
        </div>

        {inlineError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger"
          >
            <i className="ri-error-warning-line mt-px shrink-0" aria-hidden />
            <span>{inlineError}</span>
          </div>
        )}

        <fieldset
          className={`space-y-5 transition-opacity ${loading ? "opacity-60" : ""}`}
          aria-busy={loading}
          disabled={submitting}
        >
          <legend className="sr-only">Available interview times</legend>
          {groups.map((g) => (
            <div key={g.day} role="group" aria-label={g.day}>
              <h3 className="mb-2.5 flex items-baseline justify-between gap-2 text-sm font-semibold text-defaulttextcolor dark:text-white">
                <span>{g.day}</span>
                <span className="text-xs font-normal text-[#94a3b8] dark:text-white/40">
                  {g.slots.length} {g.slots.length === 1 ? "time" : "times"}
                </span>
              </h3>
              <div className="grid grid-cols-2 gap-2 min-[400px]:grid-cols-3 sm:grid-cols-4">
                {g.slots.map((s) => {
                  const active = selected === s.slot_id;
                  return (
                    <label key={s.slot_id} className="relative block cursor-pointer">
                      {/* Native radios share one name, so arrow keys move through every time on the page. */}
                      <input
                        type="radio"
                        name="interview-slot"
                        value={s.slot_id}
                        checked={active}
                        onChange={() => {
                          setSelected(s.slot_id);
                          setNotice(null);
                        }}
                        className="peer sr-only"
                      />
                      <span
                        className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border px-3 text-sm font-medium transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed dark:ring-offset-bodybg ${
                          active
                            ? "border-primary bg-primary text-white shadow-sm"
                            : "border-defaultborder/70 bg-white text-defaulttextcolor hover:border-primary/60 hover:bg-primary/[0.04] dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:hover:bg-primary/10"
                        }`}
                      >
                        {active && <i className="ri-check-line text-base" aria-hidden />}
                        {fmt(s.start, tz, TIME)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </fieldset>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-slate-100 px-0 py-4 dark:bg-black/40 sm:px-4 sm:py-8 md:py-12">
      <main className="mx-auto w-full max-w-2xl">
        <div className="overflow-hidden rounded-none border-y border-defaultborder/80 bg-white shadow-none sm:rounded-2xl sm:border sm:shadow-[0_24px_80px_-24px_rgba(0,0,0,0.25)] dark:border-white/10 dark:bg-bodybg">
          <header className="relative overflow-hidden border-b border-defaultborder/60 bg-gradient-to-br from-primary/25 via-primary/10 to-amber-400/10 px-4 py-6 sm:px-8 sm:py-8 dark:border-white/10 dark:from-primary/30 dark:to-amber-900/20">
            <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-2xl" aria-hidden />
            <div className="relative flex items-start gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/85 text-primary shadow-sm dark:bg-black/30">
                <i className="ri-calendar-schedule-line text-xl" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[#64748b] dark:text-white/50">
                  {data?.jobTitle ? `Interview · ${data.jobTitle}` : "Interview scheduling"}
                </p>
                <h1 className="mt-0.5 text-xl font-bold tracking-tight text-defaulttextcolor sm:text-2xl dark:text-white">
                  Choose your interview time
                </h1>
                <p className="mt-1 text-sm text-[#475569] dark:text-white/60">
                  {firstName ? `Hi ${firstName}, pick` : "Pick"} whichever time suits you best.
                </p>
                {minutes && (
                  <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/85 px-2.5 py-1 text-xs font-medium text-[#475569] shadow-sm dark:bg-black/30 dark:text-white/70">
                    <i className="ri-time-line" aria-hidden />
                    {minutes} min
                  </span>
                )}
              </div>
            </div>
          </header>

          {body}

          {showPicker && (
            <div className="sticky bottom-0 z-10 border-t border-defaultborder/70 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-8 dark:border-white/10 dark:bg-bodybg">
              <button
                type="button"
                className="ti-btn ti-btn-primary min-h-[48px] w-full justify-center text-sm font-semibold disabled:cursor-not-allowed"
                disabled={!selectedSlot || submitting}
                aria-disabled={!selectedSlot || submitting}
                onClick={() => void confirm()}
              >
                {submitting ? (
                  <>
                    <i className="ri-loader-4-line me-1.5 animate-spin" aria-hidden />
                    Reserving your time…
                  </>
                ) : selectedSlot ? (
                  <>
                    <i className="ri-check-line me-1.5" aria-hidden />
                    Confirm {fmt(selectedSlot.start, tz, { weekday: "short", month: "short", day: "numeric" })},{" "}
                    {fmt(selectedSlot.start, tz, TIME)}
                  </>
                ) : (
                  "Select a time to continue"
                )}
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 px-4 text-center text-xs text-[#94a3b8] sm:px-0 dark:text-white/30">
          This link is personal to you. Please don&apos;t forward it.
        </p>
      </main>
    </div>
  );
}
