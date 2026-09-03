export const BADGE_COUNT_CAP = 99;

export const BADGE_STAGE_LOW_MAX = 9;
export const BADGE_STAGE_MEDIUM_MAX = 99;

export type BadgeCountStage = 'none' | 'low' | 'medium' | 'high';

export function getBadgeCountStage(count: number): BadgeCountStage {
  if (count <= 0) return 'none';
  if (count <= BADGE_STAGE_LOW_MAX) return 'low';
  if (count <= BADGE_STAGE_MEDIUM_MAX) return 'medium';
  return 'high';
}

/**
 * Staged badge colors: primary (1–9, on-brand gentle cue), warning (10–99, standard unread),
 * danger (100+, backlog urgency). Purple primary avoids alarm fatigue for light unread volume.
 */
export function getBadgeColorClasses(count: number): string {
  const stage = getBadgeCountStage(count);
  const ring = 'ring-2 ring-white dark:ring-bodybg';

  switch (stage) {
    case 'none':
      return '';
    case 'low':
      return `bg-primary text-white ${ring}`;
    case 'medium':
      return `bg-warning text-white ${ring}`;
    case 'high':
      return `bg-danger text-white ${ring} shadow-[0_0_0_1px_rgba(230,83,60,0.4)]`;
  }
}

/** Ping ring for low/medium unread only; disabled at 100+ to reduce noise on heavy backlog. */
export function getBadgePingClasses(count: number): string | null {
  const stage = getBadgeCountStage(count);
  if (stage === 'none' || stage === 'high') return null;

  const pingTint = stage === 'low' ? 'bg-primary/40' : 'bg-warning/40';
  return `animate-slow-ping absolute -inset-[2px] rounded-full ${pingTint} opacity-75`;
}

/** Compact badge label: caps at 99+ for display on icon badges. */
export function formatBadgeCount(count: number): string {
  if (count > BADGE_COUNT_CAP) return '99+';
  return String(count);
}

/** Locale-formatted exact count for chips, labels, and screen-reader text. */
export function formatCountLocale(count: number): string {
  return count.toLocaleString();
}

/** Accessible bell label with the full unread count. */
export function formatNotificationBellAriaLabel(count: number): string {
  if (count <= 0) return 'Notifications';
  return `Notifications, ${formatCountLocale(count)} unread`;
}

/**
 * Circle for single-digit badges; pill with min-width for 2–3 character labels.
 * Pass the already-formatted badge text (e.g. from formatBadgeCount).
 */
export function getBadgeSizeClasses(displayText: string): string {
  if (displayText.length <= 1) {
    return 'h-[14px] w-[14px] rounded-full';
  }
  return 'h-[14px] min-w-[18px] px-[3px] rounded-full';
}
