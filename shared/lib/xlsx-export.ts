import * as XLSX from "xlsx";

/** A leading =, +, -, or @ is quoted so Excel treats the cell as text, not a formula. */
export function defangCell(v: unknown): string | number {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return v;
  const s = String(v);
  return /^[=+\-@]/.test(s) ? `'${s}` : s;
}

/** "YYYY-MM-DD HH:mm" UTC — readable in a cell, unlike a raw ISO string. */
export function fmtExportDateTime(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 16).replace("T", " ");
}

/** "YYYY-MM-DD" UTC for date-only fields. */
export function fmtExportDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
}

/**
 * One sheet per section, header on row 1, so every sheet sorts and filters.
 * Columns are sized to their longest value (clamped 10..60) so nothing truncates.
 */
export function addSheet(
  wb: XLSX.WorkBook,
  name: string,
  headers: string[],
  rows: unknown[][]
): void {
  const aoa = [headers, ...rows.map((r) => r.map(defangCell))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = headers.map((h, col) => {
    const longest = aoa.reduce((max, row) => {
      const len = String(row[col] ?? "").length;
      return len > max ? len : max;
    }, h.length);
    return { wch: Math.min(Math.max(longest + 2, 10), 60) };
  });
  const lastCol = XLSX.utils.encode_col(headers.length - 1);
  ws["!autofilter"] = { ref: `A1:${lastCol}${aoa.length}` };
  XLSX.utils.book_append_sheet(wb, ws, name);
}

export function downloadWorkbook(wb: XLSX.WorkBook, filename: string): void {
  XLSX.writeFile(wb, filename);
}
