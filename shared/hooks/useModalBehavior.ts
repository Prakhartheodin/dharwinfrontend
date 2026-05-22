import { useEffect, useState, useCallback, useRef } from 'react';

interface UseModalBehaviorArgs {
  isOpen: boolean;
  onClose: () => void;
  isDirty?: boolean;
}

/**
 * Unifies ATS modal behaviour: ESC closes, outside click closes, background
 * scroll is locked while open, a dirty modal asks before discarding, Tab focus
 * is trapped inside the panel, and focus is restored to the opener on close.
 */
export function useModalBehavior({ isOpen, onClose, isDirty = false }: UseModalBehaviorArgs) {
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const requestClose = useCallback(() => {
    if (isDirty) setConfirmDiscardOpen(true);
    else onClose();
  }, [isDirty, onClose]);

  const confirmDiscard = useCallback(() => {
    setConfirmDiscardOpen(false);
    onClose();
  }, [onClose]);

  const cancelDiscard = useCallback(() => setConfirmDiscardOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        requestClose();
        return;
      }
      if (e.key === 'Tab' && containerRef.current) {
        const focusables = containerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, requestClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    openerRef.current = (document.activeElement as HTMLElement) ?? null;
    const focusTarget = containerRef.current?.querySelector<HTMLElement>(
      'input:not([disabled]), button:not([disabled]), textarea:not([disabled]), select:not([disabled])'
    );
    focusTarget?.focus();
    return () => {
      openerRef.current?.focus?.();
    };
  }, [isOpen]);

  const backdropProps = {
    onMouseDown: (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) requestClose();
    },
  };

  return { containerRef, backdropProps, requestClose, confirmDiscardOpen, confirmDiscard, cancelDiscard };
}
