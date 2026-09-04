"use client";

import DashboardCard from "./DashboardCard";
import { formatHoursMinutes, monthStripDays, shiftProgressPercent } from "@/shared/lib/dashboard/employeeDashboard";
import type { PunchInEligibility } from "@/shared/lib/dashboard/employeeDashboard";
import type { AttendanceRecord, AttendanceStatistics, PunchStatusResponse } from "@/shared/lib/api/attendance";

type Props = {
  status: PunchStatusResponse | null;
  stats: AttendanceStatistics | null;
  records: AttendanceRecord[];
  loading: boolean;
  onPunch: () => void;
  punching: boolean;
  onBackdatedEntry?: () => void;
  /** Pre-computed day eligibility; when blocked, punch-in is disabled. */
  punchEligibility?: PunchInEligibility;
  /** Open reason overlay when the disabled blocked button is clicked. */
  onBlockedPunchClick?: () => void;
};

const KIND_CLASS: Record<string, string> = {
  present: "bg-defaultborder dark:bg-white/10",
  late: "bg-amber-500",
  today: "bg-teal-600 dark:bg-teal-400",
  leave: "bg-transparent ring-1 ring-inset ring-defaultborder dark:ring-white/15",
};

export default function TodayCard({
  status,
  stats,
  records,
  loading,
  onPunch,
  punching,
  onBackdatedEntry,
  punchEligibility,
  onBlockedPunchClick,
}: Props) {
  const shift = status?.shift ?? null;
  const isIn = status?.isPunchedIn ?? false;
  const workedMinutes = stats?.totalMinutes ?? 0;
  const blocked =
    !isIn && punchEligibility && punchEligibility.allowed === false ? punchEligibility : null;

  const shiftStart = shift?.startTime ?? "";
  const shiftEnd = shift?.endTime ?? "";
  const pct = isIn && status?.record?.punchIn && shiftStart && shiftEnd
    ? shiftProgressPercent(status.record.punchIn, shiftStart, shiftEnd)
    : 0;

  const strip = monthStripDays(records);
  const present = records.filter((r) => String(r.status).toLowerCase() === "present").length;
  const late = stats?.latePunchInCount ?? 0;
  const absent = records.filter((r) => String(r.status).toLowerCase() === "absent").length;

  const tile = (
    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 ring-1 ring-teal-500/15 dark:text-teal-400">
      <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
      </svg>
    </span>
  );

  if (loading) {
    return (
      <DashboardCard title="Today" tile={tile}>
        <div className="h-40 animate-pulse rounded-lg bg-defaultborder/60 dark:bg-white/5" />
      </DashboardCard>
    );
  }

  if (!shiftStart || !shiftEnd) {
    return (
      <DashboardCard title="Today" tile={tile}>
        <p className="text-[0.8125rem] font-semibold text-defaulttextcolor dark:text-defaulttextcolor/90">No shift assigned</p>
        <p className="mt-1 text-[0.75rem] text-textmuted dark:text-white/50">
          Ask your manager to assign a shift so your hours can be tracked.
        </p>
      </DashboardCard>
    );
  }

  return (
    <DashboardCard title="Today" meta={`${shiftStart} – ${shiftEnd}`} tile={tile}>
      {blocked ? (
        <div
          className="mb-3.5 rounded-xl border border-teal-500/20 bg-teal-500/[0.06] px-3.5 py-3 dark:border-teal-400/20 dark:bg-teal-400/[0.08]"
          data-testid="today-punch-blocked-banner"
        >
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-teal-700 dark:text-teal-400">
            {blocked.label}
          </p>
          <p className="mt-1 text-[0.8125rem] font-semibold text-defaulttextcolor dark:text-defaulttextcolor/90">
            Punch in unavailable
          </p>
          <p className="mt-0.5 text-[0.75rem] leading-snug text-textmuted dark:text-white/55">
            {blocked.reason === "HOLIDAY" && blocked.holidayName
              ? `Today is a holiday: ${blocked.holidayName}.`
              : blocked.reason === "LEAVE"
                ? "You are on approved leave today."
                : "Today is your scheduled week off."}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-end justify-between gap-3">
            <p className="text-2xl font-semibold leading-none tracking-[-0.02em] tabular-nums text-defaulttextcolor dark:text-defaulttextcolor/90">
              {formatHoursMinutes(workedMinutes)}
              <span className="ms-1.5 text-[0.75rem] font-normal text-textmuted dark:text-white/50">
                {isIn ? "worked" : "logged"}
              </span>
            </p>
            <p className="text-end text-[0.72rem] leading-snug text-textmuted dark:text-white/60">
              <span className={"block font-semibold " + (isIn ? "text-green-600 dark:text-green-400" : "text-textmuted dark:text-white/50")}>
                {isIn ? "Punched in" : "Punched out"}
              </span>
              {status?.record?.punchIn
                ? new Date(status.record.punchIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })
                : "—"}
            </p>
          </div>

          <div
            className="relative mb-1.5 h-2.5 overflow-hidden rounded-full bg-defaultborder dark:bg-white/10"
            role="img"
            aria-label={`Shift progress: ${formatHoursMinutes(workedMinutes)} of the ${shiftStart} to ${shiftEnd} shift`}
          >
            <div className="absolute inset-y-0 start-0 rounded-full bg-teal-600 transition-[width] duration-500 dark:bg-teal-400" style={{ width: `${pct}%` }} />
          </div>
          <div className="mb-3.5 flex justify-between text-[0.625rem] tabular-nums text-textmuted dark:text-white/50">
            <span>{shiftStart}</span><span>{shiftEnd}</span>
          </div>
        </>
      )}

      <div className="mb-4 flex items-center gap-3">
        {blocked ? (
          <button
            type="button"
            onClick={onBlockedPunchClick}
            aria-disabled="true"
            className="inline-flex h-9 flex-1 cursor-not-allowed items-center justify-center gap-1.5 rounded-lg bg-defaultborder/80 px-4 text-[0.78rem] font-semibold text-textmuted opacity-80 transition-colors dark:bg-white/10 dark:text-white/55"
            data-testid="today-punch-blocked-btn"
          >
            [{blocked.label}]
          </button>
        ) : (
          <button
            type="button"
            onClick={onPunch}
            disabled={punching}
            className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 text-[0.78rem] font-semibold text-white transition-colors hover:bg-teal-700 active:translate-y-px disabled:opacity-50"
          >
            {punching ? "Working…" : isIn ? "Punch out" : "Punch in"}
          </button>
        )}
        {/* Deliberately not gated on `blocked`: today being a holiday, a leave or a week-off
            says nothing about the past days this opens a request for. */}
        {onBackdatedEntry ? (
          <button
            type="button"
            onClick={onBackdatedEntry}
            className="inline-flex h-9 items-center px-2 text-[0.75rem] font-semibold text-teal-600 hover:underline dark:text-teal-400"
          >
            Backdated entry
          </button>
        ) : null}
      </div>

      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-textmuted dark:text-white/50">
        This month · hours per day
      </p>
      <div className="my-2 flex h-8 items-end gap-0.5" role="img" aria-label={`${present} days present, ${late} late, ${absent} absent this month`}>
        {strip.length === 0
          ? <span className="text-[0.7rem] text-textmuted dark:text-white/50">No attendance recorded yet.</span>
          : strip.map((d) => (
            <span
              key={d.date}
              title={`${d.date} · ${formatHoursMinutes(d.hours * 60)}`}
              style={{ height: `${Math.max(6, d.heightPct)}%` }}
              className={"min-w-0 flex-1 rounded-sm " + (KIND_CLASS[d.kind] ?? KIND_CLASS.present)}
            />
          ))}
      </div>
      <div className="flex gap-3.5 text-[0.7rem] text-textmuted dark:text-white/60">
        <span><b className="font-semibold tabular-nums text-green-600 dark:text-green-400">{present}</b> present</span>
        <span><b className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">{late}</b> late</span>
        <span><b className="font-semibold tabular-nums">{absent}</b> absent</span>
      </div>
    </DashboardCard>
  );
}
