"use client";

import React from "react";

export interface ScanReplaceItem {
  /** Human label for the field, e.g. "Card number". */
  label: string;
  /** The scanned value waiting for confirmation. */
  value: string;
}

export interface EadScanNoticeProps {
  /** Fields the scan read that the user had already filled in. Empty renders nothing. */
  items: ScanReplaceItem[];
  /** Names the document, e.g. "EAD card" — used in the button labels. */
  documentLabel: string;
  onReplaceAll: () => void;
  onKeepAll: () => void;
}

/**
 * Offers the scanned values for fields the user has already typed into.
 *
 * A scan never overwrites something a human entered — a misread number that silently
 * replaced a correct one would stay invisible until it mattered. But the confirmation
 * is per document, not per field: a card is read as one unit, so accepting its number
 * while leaving its dates stale is never what anyone means, and asking three times for
 * one card was three chances to end up in that state.
 */
export function EadScanNotice({
  items,
  documentLabel,
  onReplaceAll,
  onKeepAll,
}: EadScanNoticeProps) {
  if (!items.length) return null;
  const summary = items.map((i) => `${i.label} ${i.value}`).join(", ");
  return (
    <div className="text-xs mt-1">
      <p className="mb-1">
        Scanned from the {documentLabel}, replacing what you entered:
      </p>
      <dl className="flex flex-wrap gap-x-4 gap-y-1 mb-1">
        {items.map((item) => (
          <div key={item.label} className="flex gap-1">
            <dt>{item.label}:</dt>
            <dd className="font-semibold">{item.value}</dd>
          </div>
        ))}
      </dl>
      {/* min-h-[44px] and padded buttons: these were 12px underlined text in roughly a
          40x16 hit area, under the 44px minimum for a pointer target. */}
      <div className="flex flex-wrap items-center gap-x-3 min-h-[44px]">
        <button
          type="button"
          className="underline px-1 py-2 rounded hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={`Use the scanned ${documentLabel} details: ${summary}`}
          onClick={onReplaceAll}
        >
          {items.length > 1 ? "Use scanned details" : "Use scanned value"}
        </button>
        <button
          type="button"
          className="underline px-1 py-2 rounded hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          aria-label={`Keep the ${documentLabel} details you entered`}
          onClick={onKeepAll}
        >
          Keep mine
        </button>
      </div>
    </div>
  );
}
