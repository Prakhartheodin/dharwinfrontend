'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDiscardDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmBusyLabel?: string;
  busy?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function ConfirmDiscardDialog({
  open,
  onConfirm,
  onCancel,
  title = 'Discard unsaved changes?',
  description = 'Your changes will be lost if you close now.',
  confirmLabel = 'Discard',
  cancelLabel = 'Keep editing',
  confirmBusyLabel,
  busy = false,
}: ConfirmDiscardDialogProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    openerRef.current = (document.activeElement as HTMLElement) ?? null;
    cancelRef.current?.focus();
    return () => {
      openerRef.current?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (!busy) onCancel();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        e.stopPropagation();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        e.stopPropagation();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const node = (
    <div
      className="fixed inset-0 z-[12060] flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        aria-busy={busy || undefined}
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl dark:bg-bodybg"
      >
        <h4 id={titleId} className="mb-1 text-sm font-semibold text-defaulttextcolor dark:text-white">
          {title}
        </h4>
        <p id={descId} className="mb-4 text-sm text-gray-600 dark:text-white/70">
          {description}
        </p>
        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            className="ti-btn ti-btn-light !mb-0 min-h-11"
            disabled={busy}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="ti-btn ti-btn-danger !mb-0 min-h-11"
            disabled={busy}
            onClick={onConfirm}
          >
            {busy ? confirmBusyLabel || confirmLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}
