import { WEEK_OFF_DAYS } from "@/shared/lib/api/students";
import { getViewerTimezone, getZoneAbbreviation, utcInstantToWallClock } from "@/shared/lib/timezone";

/** Build a timezone-aware download filename for week-off exports. */
export function buildWeekOffExportFilename(days: string[]): string {
  const daySet = new Set(days);
  const sortedDays = WEEK_OFF_DAYS.filter((d) => daySet.has(d));
  const daySlug = sortedDays.map((d) => d.toLowerCase()).join("_");
  const tz = getViewerTimezone();
  const now = new Date();
  const { date, time } = utcInstantToWallClock(now, tz);
  const timeSlug = time.replace(":", "-");
  const zone = getZoneAbbreviation(tz, now);
  return `week-off-list-${daySlug}_${date}_${timeSlug}-${zone}.xlsx`;
}

export function arraysEqualSorted(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((day, index) => day === sortedB[index]);
}

type WeekOffRecord = { weekOff?: string[] };

export function isWeekOffNoOp(
  selectedDays: string[],
  currentWeekOffs: Record<string, WeekOffRecord>,
  selectedPeople: { value: string }[]
): boolean {
  if (selectedPeople.length === 0) return false;
  return selectedPeople.every((person) => {
    const persisted = currentWeekOffs[person.value]?.weekOff ?? [];
    return arraysEqualSorted(persisted, selectedDays);
  });
}

export function isDayAlreadyOnAllSelected(
  day: string,
  currentWeekOffs: Record<string, WeekOffRecord>,
  selectedPeople: { value: string }[]
): boolean {
  if (selectedPeople.length === 0) return false;
  return selectedPeople.every((person) => {
    const persisted = currentWeekOffs[person.value]?.weekOff ?? [];
    return persisted.includes(day);
  });
}

export function getAlreadyAssignedMessage(day: string): string {
  return `${day} is already assigned as a week-off day.`;
}

export function getNoOpUpdateMessage(): string {
  return "No changes to save — the selected people already have these week-off days.";
}
