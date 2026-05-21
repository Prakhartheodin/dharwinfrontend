import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AgentMultiSelect from '../AgentMultiSelect';

afterEach(cleanup);

const AGENTS = [
  { id: 'a1', name: 'Meera Nair', email: 'meera@dharwin.in' },
  { id: 'a2', name: 'Rohit Sharma', email: 'rohit@dharwin.in' },
];

describe('AgentMultiSelect', () => {
  it('shows an error state with a retry button', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(
      <AgentMultiSelect options={[]} loading={false} error="boom"
        value={[]} onChange={() => {}} onRetry={onRetry} />
    );
    await user.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders selected agents as chips', () => {
    render(
      <AgentMultiSelect options={AGENTS} loading={false} error={null}
        value={['a1']} onChange={() => {}} />
    );
    expect(screen.getByText('Meera Nair')).toBeInTheDocument();
  });

  it('calls onChange with the agent id when one is added', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AgentMultiSelect options={AGENTS} loading={false} error={null}
        value={[]} onChange={onChange} />
    );
    await user.click(screen.getByLabelText('Agents'));
    await user.click(await screen.findByText('Rohit Sharma'));
    expect(onChange).toHaveBeenCalledWith(['a2']);
  });
});
