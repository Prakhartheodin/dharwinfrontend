"use client";

type Props = {
  todayIsHoliday: boolean;
  todayHolidayTitle?: string | null;
};

/** Matches dashboard UpcomingHolidaysCard holiday banner — blocks punch in/out on assigned holidays. */
export default function HolidayPunchBlockNotice({ todayIsHoliday, todayHolidayTitle }: Props) {
  if (!todayIsHoliday) return null;

  return (
    <div
      className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[0.8125rem] text-warning"
      role="status"
    >
      <span className="font-semibold">Today is a holiday</span>
      {todayHolidayTitle ? (
        <span className="text-warning/90"> — {todayHolidayTitle}. Punch in/out is disabled.</span>
      ) : (
        <span className="text-warning/90"> Punch in/out is disabled.</span>
      )}
    </div>
  );
}
