"use client";

import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
  createBackdatedAttendanceRequest,
  createBackdatedAttendanceRequestMe,
} from "@/shared/lib/api/backdated-attendance-requests";

function getDetectedTimezone(): string {
  if (typeof window === "undefined") return "UTC";
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Local-calendar YYYY-MM-DD. toISOString() is UTC, so it names yesterday east of Greenwich after 00:00 local. */
function localYmd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Server caps a request at 62 days and a day at 8 hours; fail here so the user is not told by a 400. */
const MAX_DAYS_PER_REQUEST = 62;
const MAX_SHIFT_MS = 8 * 60 * 60 * 1000;
const MAX_NOTES = 1000;

function parseYmdLocal(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

type RequestForm = {
  fromDate: string;
  toDate: string;
  punchInTime: string;
  punchOutTime: string;
  notes: string;
  timezone: string;
};

export interface BackdatedAttendanceRequestModalProps {
  open: boolean;
  onClose: () => void;
  studentId: string | null;
  isUserBased: boolean;
  candidateTimezone?: string;
  weekOffDays?: string[];
  onSuccess?: () => void;
}

export default function BackdatedAttendanceRequestModal({
  open,
  onClose,
  studentId,
  isUserBased,
  candidateTimezone: candidateTimezoneProp,
  weekOffDays = [],
  onSuccess,
}: BackdatedAttendanceRequestModalProps) {
  const candidateTimezone = candidateTimezoneProp || getDetectedTimezone();
  const [requestForm, setRequestForm] = useState<RequestForm>({
    fromDate: "",
    toDate: "",
    punchInTime: "",
    punchOutTime: "",
    notes: "",
    timezone: candidateTimezone,
  });
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const isWeekOffDay = useCallback(
    (date: Date) => {
      const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
      if (weekOffDays.length === 0) return dayName === "Saturday" || dayName === "Sunday";
      return weekOffDays.includes(dayName);
    },
    [weekOffDays]
  );

  useEffect(() => {
    if (!open) return;
    setRequestForm({
      fromDate: "",
      toDate: "",
      punchInTime: "",
      punchOutTime: "",
      notes: "",
      timezone: candidateTimezone,
    });
  }, [open, candidateTimezone]);

  const updateRequestForm = (field: keyof RequestForm, value: string) => {
    setRequestForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleClose = () => {
    if (!submittingRequest) onClose();
  };

  const handleSubmitRequest = async () => {
    if (!studentId) return;
    const { fromDate, toDate, punchInTime, punchOutTime, notes, timezone } = requestForm;
    if (!fromDate || !toDate || !punchInTime || !punchOutTime) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Please fill in From date, To date, Punch In, and Punch Out." });
      return;
    }
    const from = parseYmdLocal(fromDate);
    const to = parseYmdLocal(toDate);
    if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "Invalid date range." });
      return;
    }
    if (to < from) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "To date must be on or after From date." });
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (from >= today) {
      await Swal.fire({ icon: "warning", title: "Validation", text: "From date must be in the past." });
      return;
    }
    const pIn = punchInTime.includes(":") ? punchInTime : punchInTime + ":00";
    const pOut = punchOutTime.includes(":") ? punchOutTime : punchOutTime + ":00";
    const pad = (n: number) => String(n).padStart(2, "0");
    const attendanceEntries: Array<{ date: string; punchIn: string; punchOut: string; timezone: string }> = [];
    const current = new Date(from);
    current.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(0, 0, 0, 0);
    let rolledOvernight = false;
    while (current <= end) {
      if (!isWeekOffDay(current)) {
        const dateKey = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`;
        const punchInDt = new Date(dateKey + "T" + pIn);
        let punchOutDt = new Date(dateKey + "T" + pOut);
        if (punchOutDt <= punchInDt) {
          punchOutDt = new Date(punchOutDt.getTime() + 86400000);
          rolledOvernight = true;
        }
        if (punchOutDt.getTime() - punchInDt.getTime() > MAX_SHIFT_MS) {
          await Swal.fire({
            icon: "warning",
            title: "Shift too long",
            text: "A backdated day cannot exceed 8 hours. Adjust the punch in / punch out times.",
          });
          return;
        }
        attendanceEntries.push({
          date: dateKey,
          punchIn: punchInDt.toISOString(),
          punchOut: punchOutDt.toISOString(),
          timezone: timezone || candidateTimezone,
        });
      }
      current.setDate(current.getDate() + 1);
    }
    if (attendanceEntries.length === 0) {
      await Swal.fire({ icon: "warning", title: "No working days", text: "The selected date range has no working days (week-offs are excluded)." });
      return;
    }
    if (attendanceEntries.length > MAX_DAYS_PER_REQUEST) {
      await Swal.fire({
        icon: "warning",
        title: "Range too long",
        text: `This range covers ${attendanceEntries.length} working days. Submit at most ${MAX_DAYS_PER_REQUEST} at a time.`,
      });
      return;
    }
    if (rolledOvernight) {
      const { isConfirmed } = await Swal.fire({
        icon: "question",
        title: "Overnight shift?",
        text: `Punch out (${punchOutTime}) is before punch in (${punchInTime}), so it will be recorded on the following morning.`,
        showCancelButton: true,
        confirmButtonText: "Yes, overnight",
        cancelButtonText: "Let me fix the times",
      });
      if (!isConfirmed) return;
    }
    setSubmittingRequest(true);
    try {
      const payload = {
        attendanceEntries: attendanceEntries.map((e) => ({
          date: e.date,
          punchIn: e.punchIn,
          punchOut: e.punchOut,
          timezone: e.timezone,
        })),
        notes: notes.trim() || undefined,
      };
      if (isUserBased) {
        await createBackdatedAttendanceRequestMe(payload);
      } else {
        await createBackdatedAttendanceRequest(studentId, payload);
      }
      await Swal.fire({ icon: "success", title: "Request Submitted", text: "An admin will review it shortly.", confirmButtonText: "OK" });
      onClose();
      onSuccess?.();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? (e as Error).message ?? "Failed to submit request.";
      // The server refuses days that are a holiday, a recorded leave, or a week-off, and names each one.
      const isBlockedDays = msg.startsWith("Backdated attendance cannot be requested for");
      await Swal.fire({
        icon: isBlockedDays ? "warning" : "error",
        title: isBlockedDays ? "These days can't be requested" : "Error",
        text: msg,
      });
    } finally {
      setSubmittingRequest(false);
    }
  };

  if (!open || !studentId) return null;

  return (
    <div className="fixed inset-0 z-[105] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="backdated-modal-title">
      <style>{`
        @keyframes backdated-modal-backdrop { from { opacity: 0; } to { opacity: 1; } }
        @keyframes backdated-modal-enter {
          from { opacity: 0; transform: scale(0.96) translateY(-8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes backdated-modal-stagger { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .backdated-modal-backdrop { animation: backdated-modal-backdrop 0.2s ease-out forwards; }
        .backdated-modal-panel { animation: backdated-modal-enter 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .backdated-modal-stagger-1 { animation: backdated-modal-stagger 0.35s ease-out 0.05s both; }
        .backdated-modal-stagger-2 { animation: backdated-modal-stagger 0.35s ease-out 0.1s both; }
        .backdated-modal-stagger-3 { animation: backdated-modal-stagger 0.35s ease-out 0.15s both; }
        .backdated-modal-stagger-4 { animation: backdated-modal-stagger 0.35s ease-out 0.2s both; }
        .backdated-modal-stagger-5 { animation: backdated-modal-stagger 0.35s ease-out 0.25s both; }
      `}</style>
      <div className="flex min-h-full items-start justify-center p-4 pt-[8vh] pb-8">
        <div
          className="fixed inset-0 bg-black/55 backdrop-blur-[2px] backdated-modal-backdrop"
          onClick={handleClose}
          aria-hidden
        />
        <div className="relative w-full max-w-[28rem] flex flex-col max-h-[85vh] backdated-modal-panel rounded-2xl border border-defaultborder/70 dark:border-white/[0.08] bg-white dark:bg-bodybg shadow-xl dark:shadow-black/30 overflow-hidden">
          <div className="relative border-b border-defaultborder/60 bg-gradient-to-br from-teal-50/80 to-transparent dark:from-teal-950/20 dark:to-transparent">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-teal-400 to-teal-600 dark:from-teal-500 dark:to-teal-700" aria-hidden />
            <div className="flex items-start justify-between gap-4 pl-5 pr-4 py-5">
              <div className="flex items-start gap-4 min-w-0">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 ring-1 ring-teal-500/15 dark:text-teal-400 shadow-inner">
                  <i className="ri-calendar-check-line text-[1.5rem]" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 id="backdated-modal-title" className="text-lg font-semibold tracking-tight text-defaulttextcolor dark:text-white">
                    Request Backdated Attendance
                  </h2>
                  <p className="mt-1 text-sm text-defaulttextcolor/65 dark:text-white/55">
                    Submit for past dates you missed. An admin will review.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="shrink-0 flex h-11 w-11 items-center justify-center rounded-xl text-defaulttextcolor/70 hover:text-defaulttextcolor hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                aria-label="Close"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>
          </div>

          <div className="p-5 overflow-y-auto flex-1 space-y-5">
            <div className="backdated-modal-stagger-1 flex items-start gap-3 rounded-xl bg-teal-500/10 border border-teal-500/15 p-3.5">
              <i className="ri-information-line text-teal-600 dark:text-teal-400 text-lg shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-defaulttextcolor/85 dark:text-white/75 leading-relaxed">
                Enter a date range (From and To). Punch In and Punch Out are applied to every <strong>working day</strong> in it; your week-offs are skipped. Max 8 hours per day.
              </p>
            </div>

            <div className="backdated-modal-stagger-2 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/55 dark:text-white/50">Dates</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="backdated-from-date" className="block text-xs font-medium text-defaulttextcolor/80 mb-1.5">From <span className="text-rose-500">*</span></label>
                  <input
                    id="backdated-from-date"
                    type="date"
                    value={requestForm.fromDate}
                    max={localYmd(new Date())}
                    onChange={(e) => updateRequestForm("fromDate", e.target.value)}
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="backdated-to-date" className="block text-xs font-medium text-defaulttextcolor/80 mb-1.5">To <span className="text-rose-500">*</span></label>
                  <input
                    id="backdated-to-date"
                    type="date"
                    value={requestForm.toDate}
                    max={localYmd(new Date())}
                    onChange={(e) => updateRequestForm("toDate", e.target.value)}
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="backdated-modal-stagger-2 space-y-2">
              <label htmlFor="backdated-timezone" className="block text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/55 dark:text-white/50">Timezone</label>
              <div id="backdated-timezone" className="rounded-xl border border-defaultborder/80 bg-gray-50/80 dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor/90 dark:text-white/80">
                {requestForm.timezone || candidateTimezone}
              </div>
            </div>

            <div className="backdated-modal-stagger-3 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/55 dark:text-white/50">Punch times</span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="backdated-punch-in" className="block text-xs font-medium text-defaulttextcolor/80 mb-1.5">Punch In <span className="text-rose-500">*</span></label>
                  <input
                    id="backdated-punch-in"
                    type="time"
                    value={requestForm.punchInTime}
                    onChange={(e) => updateRequestForm("punchInTime", e.target.value)}
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="backdated-punch-out" className="block text-xs font-medium text-defaulttextcolor/80 mb-1.5">Punch Out <span className="text-rose-500">*</span></label>
                  <input
                    id="backdated-punch-out"
                    type="time"
                    value={requestForm.punchOutTime}
                    onChange={(e) => updateRequestForm("punchOutTime", e.target.value)}
                    className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="backdated-modal-stagger-4 space-y-2">
              <label htmlFor="backdated-notes" className="block text-xs font-semibold uppercase tracking-wider text-defaulttextcolor/55 dark:text-white/50">Notes <span className="font-normal normal-case text-defaulttextcolor/50">(optional)</span></label>
              <input
                id="backdated-notes"
                type="text"
                value={requestForm.notes}
                maxLength={MAX_NOTES}
                onChange={(e) => updateRequestForm("notes", e.target.value)}
                placeholder="e.g. Reason for backdated entry…"
                className="w-full rounded-xl border border-defaultborder/80 bg-white dark:bg-white/5 px-3.5 py-2.5 text-sm text-defaulttextcolor placeholder:text-defaulttextcolor/40 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
            </div>
          </div>

          <div className="backdated-modal-stagger-5 flex items-center justify-end gap-3 border-t border-defaultborder/60 bg-defaultborder/5 dark:bg-white/5 px-5 py-4">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-defaultborder/80 bg-transparent px-4 py-2.5 text-sm font-medium text-defaulttextcolor hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              disabled={submittingRequest}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitRequest}
              className="rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white px-5 py-2.5 text-sm font-semibold shadow-sm hover:shadow transition-all disabled:opacity-60 disabled:pointer-events-none flex items-center gap-2"
              disabled={submittingRequest}
            >
              {submittingRequest ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
                  Submitting…
                </>
              ) : (
                <>
                  <i className="ri-send-plane-line text-base" aria-hidden />
                  Submit Request
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
