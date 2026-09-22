"use client";

import React from "react";

export interface EadScanNoticeProps {
  /** Scanned value for a field the user had already filled in. Undefined renders nothing. */
  pending?: string;
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
export function EadScanNotice({ pending, onReplace, onKeep }: EadScanNoticeProps) {
  if (!pending) return null;
  return (
    <p className="text-xs mt-1">
      Scanned: <strong>{pending}</strong>{" "}
      <button type="button" className="underline" onClick={onReplace}>
        Replace
      </button>{" "}
      <button type="button" className="underline" onClick={onKeep}>
        Keep mine
      </button>
    </p>
  );
}
