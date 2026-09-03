import { formatYmdLocal } from "@/shared/lib/leave-date-range";

export type DatePreset = "all" | "week" | "month" | "quarter";

export function rangeForPreset(preset: DatePreset): { from?: string; to?: string } {
  if (preset === "all") return {};
  const to = new Date();
  const from = new Date(to);
  if (preset === "week") from.setDate(from.getDate() - 7);
  if (preset === "month") from.setMonth(from.getMonth() - 1);
  if (preset === "quarter") from.setMonth(from.getMonth() - 3);
  from.setHours(0, 0, 0, 0);
  // toISOString() re-projects these local Dates into UTC: local midnight in IST is
  // 18:30Z the previous day, so slice(0, 10) returned yesterday. The rest of the
  // module (YmdFilterDateInput, ymd-filter-date-input.util) already formats local YMD.
  return { from: formatYmdLocal(from), to: formatYmdLocal(to) };
}
