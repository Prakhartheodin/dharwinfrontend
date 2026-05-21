import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InterviewDateTimeOverlay from '../InterviewDateTimeOverlay';

afterEach(cleanup);

describe('InterviewDateTimeOverlay', () => {
  it('does not render when closed', () => {
    render(
      <InterviewDateTimeOverlay open={false} value={null} timezone="UTC"
        onConfirm={() => {}} onClose={() => {}} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables Confirm until a date and time are chosen', () => {
    render(
      <InterviewDateTimeOverlay open value={null} timezone="UTC"
        onConfirm={() => {}} onClose={() => {}} />
    );
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <InterviewDateTimeOverlay open value={null} timezone="UTC"
        onConfirm={() => {}} onClose={onClose} />
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('seeds the draft from an existing value and enables Confirm', () => {
    const value = new Date('2026-12-31T09:00:00.000Z');
    render(
      <InterviewDateTimeOverlay open value={value} timezone="UTC"
        onConfirm={() => {}} onClose={() => {}} />
    );
    const dialog = screen.getByRole('dialog', { name: /select interview date and time/i });
    expect(within(dialog).getByRole('button', { name: /confirm/i })).toBeEnabled();
  });

  it('emits the chosen instant on Confirm when seeded', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    const value = new Date('2026-12-31T09:00:00.000Z');
    render(
      <InterviewDateTimeOverlay open value={value} timezone="UTC"
        onConfirm={onConfirm} onClose={() => {}} />
    );
    const dialog = screen.getByRole('dialog', { name: /select interview date and time/i });
    await user.click(within(dialog).getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const [instant, tz] = onConfirm.mock.calls[0];
    expect(instant).toBeInstanceOf(Date);
    expect(tz).toBe('UTC');
  });
});
