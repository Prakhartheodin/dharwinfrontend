import { describe, it, expect } from 'vitest';
import {
  formatBadgeCount,
  formatCountLocale,
  formatNotificationBellAriaLabel,
  getBadgeColorClasses,
  getBadgeCountStage,
  getBadgePingClasses,
  getBadgeSizeClasses,
} from '@/shared/lib/format-badge-count';

describe('formatBadgeCount', () => {
  it('returns the count as a string up to the cap', () => {
    expect(formatBadgeCount(0)).toBe('0');
    expect(formatBadgeCount(1)).toBe('1');
    expect(formatBadgeCount(99)).toBe('99');
  });

  it('caps counts above 99', () => {
    expect(formatBadgeCount(100)).toBe('99+');
    expect(formatBadgeCount(1026)).toBe('99+');
  });
});

describe('formatCountLocale', () => {
  it('formats with locale grouping separators', () => {
    expect(formatCountLocale(1026)).toBe((1026).toLocaleString());
  });
});

describe('formatNotificationBellAriaLabel', () => {
  it('returns a generic label when there are no unread notifications', () => {
    expect(formatNotificationBellAriaLabel(0)).toBe('Notifications');
  });

  it('includes the full locale-formatted unread count', () => {
    expect(formatNotificationBellAriaLabel(1026)).toBe(
      `Notifications, ${(1026).toLocaleString()} unread`
    );
  });
});

describe('getBadgeCountStage', () => {
  it('maps counts to semantic stages', () => {
    expect(getBadgeCountStage(0)).toBe('none');
    expect(getBadgeCountStage(1)).toBe('low');
    expect(getBadgeCountStage(9)).toBe('low');
    expect(getBadgeCountStage(10)).toBe('medium');
    expect(getBadgeCountStage(99)).toBe('medium');
    expect(getBadgeCountStage(100)).toBe('high');
  });
});

describe('getBadgeColorClasses', () => {
  it('returns empty string for zero unread', () => {
    expect(getBadgeColorClasses(0)).toBe('');
  });

  it('uses primary for low unread counts', () => {
    expect(getBadgeColorClasses(3)).toContain('bg-primary');
    expect(getBadgeColorClasses(3)).toContain('text-white');
  });

  it('uses warning for medium unread counts', () => {
    expect(getBadgeColorClasses(42)).toContain('bg-warning');
    expect(getBadgeColorClasses(42)).toContain('text-white');
  });

  it('uses danger for high unread counts', () => {
    expect(getBadgeColorClasses(150)).toContain('bg-danger');
    expect(getBadgeColorClasses(150)).toContain('text-white');
  });

  it('includes theme-aware ring separation in every visible stage', () => {
    for (const count of [1, 42, 150]) {
      expect(getBadgeColorClasses(count)).toContain('ring-white');
      expect(getBadgeColorClasses(count)).toContain('dark:ring-bodybg');
    }
  });
});

describe('getBadgePingClasses', () => {
  it('returns null when there is nothing to ping', () => {
    expect(getBadgePingClasses(0)).toBeNull();
    expect(getBadgePingClasses(150)).toBeNull();
  });

  it('pings with stage-matched tint for low and medium counts', () => {
    expect(getBadgePingClasses(3)).toContain('bg-primary/40');
    expect(getBadgePingClasses(42)).toContain('bg-warning/40');
    expect(getBadgePingClasses(3)).toContain('animate-slow-ping');
  });
});

describe('getBadgeSizeClasses', () => {
  it('uses a fixed circle for single-character labels', () => {
    expect(getBadgeSizeClasses('7')).toContain('w-[14px]');
    expect(getBadgeSizeClasses('7')).not.toContain('min-w');
  });

  it('uses a pill with min-width for multi-character labels', () => {
    expect(getBadgeSizeClasses('42')).toContain('min-w-[18px]');
    expect(getBadgeSizeClasses('99+')).toContain('min-w-[18px]');
  });
});
