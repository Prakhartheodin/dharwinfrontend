import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DateTimeOverlay from '../DateTimeOverlay';

afterEach(cleanup);

describe('DateTimeOverlay', () => {
  it('does not render when closed', () => {
    render(
      <DateTimeOverlay open={false} value={null} timezone="UTC"
        onConfirm={() => {}} onClose={() => {}} />
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables Confirm until a date and time are chosen', () => {
    render(
      <DateTimeOverlay open value={null} timezone="UTC"
        onConfirm={() => {}} onClose={() => {}} />
    );
    expect(screen.getByRole('button', { name: /confirm/i })).toBeDisabled();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <DateTimeOverlay open value={null} timezone="UTC"
        onConfirm={() => {}} onClose={onClose} />
    );
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('seeds the draft from an existing value and enables Confirm', () => {
    const value = new Date('2026-12-31T09:00:00.000Z');
    render(
      <DateTimeOverlay open value={value} timezone="UTC"
        onConfirm={() => {}} onClose={() => {}} />
    );
    const dialog = screen.getByRole('dialog', { name: /select date & time/i });
    expect(within(dialog).getByRole('button', { name: /confirm/i })).toBeEnabled();
  });

  it('emits the chosen instant on Confirm when seeded', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();
    const value = new Date('2026-12-31T09:00:00.000Z');
    render(
      <DateTimeOverlay open value={value} timezone="UTC"
        onConfirm={onConfirm} onClose={() => {}} />
    );
    const dialog = screen.getByRole('dialog', { name: /select date & time/i });
    await user.click(within(dialog).getByRole('button', { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    const [instant, tz] = onConfirm.mock.calls[0];
    expect(instant).toBeInstanceOf(Date);
    expect(tz).toBe('UTC');
  });

  it('uses the caller-supplied title and accessible name', () => {
    render(
      <DateTimeOverlay open value={null} timezone="UTC" title="Select meeting date & time"
        onConfirm={() => {}} onClose={() => {}} />
    );
    expect(screen.getByRole('heading', { name: 'Select meeting date & time' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Select meeting date & time' })).toBeInTheDocument();
  });
});
