export type HolidayBulkSkip = {
  studentName: string;
  holidayTitle: string;
  date: string;
  reason: string;
};

export type EmailBulkSkip = { email: string; reason: string };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** HTML block for holiday assign/remove responses that include skipped rows. */
export function holidaySkippedSummaryHtml(skipped: HolidayBulkSkip[], preview = 5): string {
  if (!skipped?.length) return "";
  const rows = skipped.slice(0, preview).map(
    (s) =>
      `<li>${escapeHtml(s.studentName)} — ${escapeHtml(s.holidayTitle)} (${escapeHtml(s.date)}): ${escapeHtml(s.reason)}</li>`
  );
  const more =
    skipped.length > preview
      ? `<p class="text-xs text-defaulttextcolor/70 mt-1">…and ${skipped.length - preview} more skipped.</p>`
      : "";
  return `<div class="text-left text-sm mt-3 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-warning"><p class="font-semibold">Skipped (${skipped.length})</p><ul class="list-disc pl-5 text-xs mt-1 space-y-0.5">${rows.join("")}</ul>${more}</div>`;
}

export function emailSkippedSummaryText(skipped: EmailBulkSkip[], preview = 5): string {
  if (!skipped?.length) return "";
  const parts = skipped
    .slice(0, preview)
    .map((s) => `${s.email} (${s.reason})`)
    .join("; ");
  const more = skipped.length > preview ? ` …and ${skipped.length - preview} more` : "";
  return `${skipped.length} skipped: ${parts}${more}`;
}

/** SweetAlert icon when a bulk op updated some rows but skipped others. */
export function bulkOutcomeIcon(updatedCount: number, skippedCount: number): "success" | "warning" {
  if (skippedCount > 0) return "warning";
  return updatedCount > 0 ? "success" : "success";
}
