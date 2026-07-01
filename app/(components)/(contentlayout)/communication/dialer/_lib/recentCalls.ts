import type { CallRecord } from "@/shared/lib/api/bolna";

const MISSED_STATUSES = new Set(["missed", "no-answer", "no_answer", "failed"]);

export function callId(r: CallRecord): string {
  return r._id ?? r.id ?? "";
}
export function callNumber(r: CallRecord): string {
  return r.toPhoneNumber ?? r.recipientPhoneNumber ?? r.phone ?? "";
}
export function callName(r: CallRecord): string {
  return r.displayName ?? r.businessName ?? callNumber(r);
}
export function callDirection(r: CallRecord): "inbound" | "outbound" | "unknown" {
  const d = r.telephonyData?.direction;
  return d === "inbound" || d === "outbound" ? d : "unknown";
}
export function isMissed(r: CallRecord): boolean {
  return callDirection(r) === "inbound" && MISSED_STATUSES.has((r.status ?? "").toLowerCase());
}
export function hasRecording(r: CallRecord): boolean {
  return Boolean(r.recordingUrl);
}
export function fmtDuration(sec?: number): string {
  if (!sec || sec < 1) return "";
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

export type RecentFilter = "all" | "inbound" | "outbound" | "recorded";
export function filterRecents(records: CallRecord[], filter: RecentFilter): CallRecord[] {
  switch (filter) {
    case "inbound": return records.filter((r) => callDirection(r) === "inbound");
    case "outbound": return records.filter((r) => callDirection(r) === "outbound");
    case "recorded": return records.filter(hasRecording);
    default: return records;
  }
}
export function missedCount(records: CallRecord[]): number {
  return records.reduce((n, r) => (isMissed(r) ? n + 1 : n), 0);
}
export function matchesSearch(r: CallRecord, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return `${callName(r)} ${callNumber(r)}`.toLowerCase().includes(s);
}
export function sortWithPins(
  records: CallRecord[],
  pinnedIds: string[]
): { pinned: CallRecord[]; rest: CallRecord[] } {
  const pinnedSet = new Set(pinnedIds);
  const byId = new Map(records.map((r) => [callId(r), r]));
  const pinned = pinnedIds.map((id) => byId.get(id)).filter((r): r is CallRecord => Boolean(r));
  const rest = records.filter((r) => !pinnedSet.has(callId(r)));
  return { pinned, rest };
}
