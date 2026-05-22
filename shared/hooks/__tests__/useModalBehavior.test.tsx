import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { useModalBehavior } from '../useModalBehavior';

function Harness({ onClose, isDirty }: { onClose: () => void; isDirty: boolean }) {
  const { containerRef, backdropProps } = useModalBehavior({ isOpen: true, onClose, isDirty });
  return (
    <div data-testid="backdrop" {...backdropProps}>
      <div ref={containerRef}>
        <button>inside</button>
      </div>
    </div>
  );
}

describe('useModalBehavior', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  it('calls onClose on Escape when not dirty', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} isDirty={false} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close immediately on Escape when dirty', () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} isDirty />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('locks body scroll while open and restores it on unmount', () => {
    const prior = document.body.style.overflow;
    const { unmount } = render(<Harness onClose={() => {}} isDirty={false} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe(prior);
  });

  it('restores focus to the opener element on close', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { unmount } = render(<Harness onClose={() => {}} isDirty={false} />);
    unmount();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
