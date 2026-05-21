import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TimezoneSelect from '../TimezoneSelect';

afterEach(cleanup);

describe('TimezoneSelect', () => {
  it('shows the current zone with its offset', () => {
    render(<TimezoneSelect value="Asia/Kolkata" onChange={() => {}} />);
    expect(screen.getByText(/Asia\/Kolkata/)).toBeInTheDocument();
    expect(screen.getByText(/UTC \+05:30/)).toBeInTheDocument();
  });

  it('normalizes a legacy alias for display', () => {
    render(<TimezoneSelect value="Asia/Calcutta" onChange={() => {}} />);
    expect(screen.getByLabelText('Time zone')).toBeInTheDocument();
    expect(screen.getByText(/Asia\/Kolkata/)).toBeInTheDocument();
  });

  it('calls onChange with the picked zone', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TimezoneSelect value="UTC" onChange={onChange} />);
    await user.click(screen.getByLabelText('Time zone'));
    await user.type(screen.getByLabelText('Time zone'), 'Kolkata');
    await user.click(await screen.findByText(/Asia\/Kolkata/));
    expect(onChange).toHaveBeenCalledWith('Asia/Kolkata');
  });
});
