"use client";

import React, { useRef } from "react";
import { useDialogKeyboard } from "@/shared/components/chat-call/CallDialogs";

export type SimpleModalProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible name when the dialog has no visible title element wired via aria-labelledby. */
  ariaLabel: string;
  children: React.ReactNode;
  /** Panel inside the scrim (width, padding, etc.). */
  panelClassName?: string;
  overlayClassName?: string;
  /** Element to focus when the dialog opens. Defaults to the panel root. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
};

/**
 * Lightweight modal shell: Escape, focus trap, restore focus on close.
 * Matches ATS custom overlays; use instead of duplicating keyboard handlers.
 */
export function SimpleModal({
  open,
  onClose,
  ariaLabel,
  children,
  panelClassName = "bg-white dark:bg-bodybg rounded-lg shadow-xl max-w-sm w-full overflow-hidden",
  overlayClassName = "z-[100]",
  initialFocusRef: initialFocusRefProp,
}: SimpleModalProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = initialFocusRefProp ?? panelRef;

  useDialogKeyboard(rootRef, initialFocusRef, open, { onEscape: onClose });

  if (!open) return null;

  return (
    <div
      ref={rootRef}
      className={`fixed inset-0 ${overlayClassName} flex items-center justify-center p-4 bg-black/50`}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={panelClassName}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
