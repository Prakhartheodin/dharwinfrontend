"use client";

import React from "react";

export interface EadScanNoticeProps {
  /** Scanned value for a field the user had already filled in. Undefined renders nothing. */
  pending?: string;
  /**
   * The field this prompt belongs to, e.g. "EAD card number". Several of these can be on
   * screen at once, so without it a screen reader announces "Replace" three times with
   * nothing to tell them apart.
   */
  fieldLabel: string;
  onReplace: () => void;
  onKeep: () => void;
}

/**
 * Offers a scanned value for a field the user has already typed into.
 *
 * A card scan never overwrites something a human entered — a misread card number that
 * silently replaced a correct one would stay invisible until it mattered. The scanned
 * value is shown beside the field and applied only on an explicit click.
 */
export function EadScanNotice({ pending, fieldLabel, onReplace, onKeep }: EadScanNoticeProps) {
  if (!pending) return null;
  // min-h-[44px] on the row and py-2 px-1 on the buttons: these were 12px underlined text
  // in roughly a 40x16 hit area, well under the 44px minimum for a pointer target.
  return (
    <p className="text-xs mt-1 flex flex-wrap items-center gap-x-2 min-h-[44px]">
      <span>
        Scanned: <strong>{pending}</strong>
      </span>
      <button
        type="button"
        className="underline px-1 py-2 rounded hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label={`Replace ${fieldLabel} with the scanned value ${pending}`}
        onClick={onReplace}
      >
        Replace
      </button>
      <button
        type="button"
        className="underline px-1 py-2 rounded hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label={`Keep the ${fieldLabel} you entered`}
        onClick={onKeep}
      >
        Keep mine
      </button>
    </p>
  );
}
