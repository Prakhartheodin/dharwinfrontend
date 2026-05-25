export type DatePreset = "all" | "week" | "month" | "quarter";

export function rangeForPreset(preset: DatePreset): { from?: string; to?: string } {
  if (preset === "all") return {};
  const to = new Date();
  const from = new Date(to);
  if (preset === "week") from.setDate(from.getDate() - 7);
  if (preset === "month") from.setMonth(from.getMonth() - 1);
  if (preset === "quarter") from.setMonth(from.getMonth() - 3);
  from.setHours(0, 0, 0, 0);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}
