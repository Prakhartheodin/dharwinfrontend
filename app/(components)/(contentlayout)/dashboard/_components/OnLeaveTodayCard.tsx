"use client";

import type { OnLeaveTodayItem } from "@/shared/lib/api/attendance";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function formatRange(item: OnLeaveTodayItem): string {
  const start = formatDate(item.startDate);
  const end = formatDate(item.endDate);
  return start === end ? start : `${start} – ${end}`;
}

// Parent mounts this only when items.length > 0 (see dashboard/page.tsx), so no
// loading/empty states here — the box appears only while someone is actively on leave.
// selfView: the viewer is a plain employee seeing only their own approved leave.
export default function OnLeaveTodayCard({
  items,
  selfView = false,
}: {
  items: OnLeaveTodayItem[];
  selfView?: boolean;
}) {
  const self = selfView ? items[0] : null;
  return (
    <div className="box overflow-hidden border-0 shadow-sm bg-gradient-to-br from-secondary/5 via-transparent to-primary/5 dark:from-secondary/10 dark:to-primary/10">
      <div className="box-header justify-between flex-shrink-0 border-b border-black/5 dark:border-white/10 !pb-3">
        <div className="flex items-center gap-2">
          <span className="avatar avatar-sm avatar-rounded bg-secondary/15 text-secondary">
            <i className="ti ti-beach text-[1rem]" aria-hidden />
          </span>
          <div>
            <div className="box-title mb-0">{self ? "Your Leave" : "On Leave Today"}</div>
            {!self && (
              <p className="text-[0.7rem] text-[#8c9097] dark:text-white/50 mb-0">
                {items.length} {items.length === 1 ? "employee" : "employees"}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="box-body !pt-3">
        {self ? (
          <p className="text-[0.875rem] mb-0">
            You have approved leave from{" "}
            <span className="font-semibold text-secondary">{formatDate(self.startDate)}</span> to{" "}
            <span className="font-semibold text-secondary">{formatDate(self.endDate)}</span>.
          </p>
        ) : (
        <ul className="list-none space-y-2 mb-0">
          {items.map((it, idx) => (
            <li
              key={`${it.employeeId || it.name}-${idx}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-white/60 dark:bg-white/5 border border-black/5 dark:border-white/10"
            >
              <span className="avatar avatar-sm avatar-rounded bg-secondary/10 text-secondary shrink-0">
                <i className="ti ti-user text-[0.95rem]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-[0.875rem] mb-0 truncate">
                  {it.employeeId ? <span className="text-secondary">{it.employeeId} </span> : null}
                  {it.name} <span className="font-normal text-[#8c9097] dark:text-white/50">is on Leave today</span>
                </p>
                <p className="text-[0.75rem] text-[#8c9097] dark:text-white/50 mb-0 truncate">{formatRange(it)}</p>
              </div>
            </li>
          ))}
        </ul>
        )}
      </div>
    </div>
  );
}
