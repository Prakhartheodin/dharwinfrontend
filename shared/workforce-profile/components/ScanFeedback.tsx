"use client";

import React from "react";

/**
 * Feedback for a scanned document (EAD card, visa).
 *
 * Both pieces live here rather than inline at each call site because they carry two
 * requirements that were previously wrong in six places at once: the warning colour
 * must clear WCAG AA, and a result that arrives asynchronously must be announced.
 */

/**
 * `text-warning` resolves to rgb(245 184 73), which is 1.77:1 on white — far under the
 * 4.5:1 AA floor for text this size, and these warnings ("that looks like a USCIS#, not
 * a Card#") are the messages that stop a wrong number being saved. amber-700 measures
 * 5.02:1 on white and amber-400 10.0:1 on the dark body, so both themes pass.
 */
const WARNING_TEXT = "text-amber-700 dark:text-amber-400";

export interface ScanWarningsProps {
  warnings: string[];
  /** Names the document so a screen reader knows which scan spoke. */
  label: string;
}

/**
 * role="alert" because the scan is asynchronous: without it the reader is told nothing
 * when a card is rejected, and silence reads as success.
 */
export function ScanWarnings({ warnings, label }: ScanWarningsProps) {
  if (!warnings.length) return null;
  return (
    <div role="alert" aria-label={`${label} scan warnings`}>
      {warnings.map((w) => (
        <p key={w} className={`text-xs mt-1 ${WARNING_TEXT}`}>
          {w}
        </p>
      ))}
    </div>
  );
}

export interface ScanResultItem {
  label: string;
  value: string;
}

export interface ScanResultSummaryProps {
  items: ScanResultItem[];
  /** Where the filled fields ended up, e.g. "the Personal step". */
  filledInto: string;
}

/**
 * Shown where a scan was started from a document row, since the fields it fills sit on
 * another step and the fill would otherwise be invisible.
 *
 * A description list rather than one separated line: read aloud, "Card number
 * SRC0000000701 · Valid from 2018-03-07" ran together into a single unparsable string.
 */
export function ScanResultSummary({ items, filledInto }: ScanResultSummaryProps) {
  return (
    <div aria-live="polite" className="text-xs mt-2 text-gray-600 dark:text-gray-400">
      <dl className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex gap-1">
            <dt>{item.label}:</dt>
            <dd className="font-semibold text-gray-800 dark:text-gray-200">
              {item.value || "not readable"}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-1">Filled into {filledInto} — review before saving.</p>
    </div>
  );
}
