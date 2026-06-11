import type { EvaluationDisplayStatus, EvaluationRow } from "@/shared/lib/api/evaluation";

export type { EvaluationDisplayStatus };

export function getCourseDisplayStatus(row: EvaluationRow): EvaluationDisplayStatus {
  return row.displayStatus ?? "Not Started";
}

export function deriveOverallStatus(courses: EvaluationRow[]): EvaluationDisplayStatus {
  if (courses.length === 0) return "Not Started";
  const statuses = courses.map(getCourseDisplayStatus);
  if (statuses.every((s) => s === "Completed")) return "Completed";
  if (statuses.some((s) => s === "In Progress" || s === "Completed")) return "In Progress";
  return "Not Started";
}

export function statusBadgeClass(status: EvaluationDisplayStatus | string): string {
  if (status === "Completed") return "border-success/20 bg-success/10 text-success";
  if (status === "In Progress") return "border-warning/25 bg-warning/10 text-warning";
  return "border-defaultborder/60 bg-slate-100/80 text-defaulttextcolor/75 dark:border-white/10 dark:bg-white/[0.06] dark:text-defaulttextcolor/80";
}

export function atRiskLabel(reason: string | null | undefined): string {
  if (reason === "not_started") return "Not started";
  if (reason === "stale") return "Stale activity";
  if (reason === "no_activity") return "No activity";
  return "At risk";
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function exportEvaluationCsv(rows: EvaluationRow[], filename = "training-evaluation.csv"): void {
  const headers = [
    "Student",
    "Course",
    "Position",
    "Categories",
    "Completion %",
    "Status",
    "Quiz Avg",
    "Quiz Best",
    "Essay",
    "Certificate",
    "At Risk",
    "Last Accessed",
    "Completed At",
  ];
  const escape = (v: string | number | boolean | null | undefined) => {
    const s = v == null ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.studentName,
        r.courseName,
        r.positionName ?? "",
        (r.categoryNames || []).join("; "),
        r.completionRate ?? 0,
        getCourseDisplayStatus(r),
        r.quizScore ?? "",
        r.quizScoreBest ?? "",
        r.essayScore ?? "",
        r.certificateIssued ? "Yes" : "No",
        r.atRisk ? atRiskLabel(r.atRiskReason) : "No",
        formatShortDate(r.lastAccessedAt),
        formatShortDate(r.completedAt),
      ]
        .map(escape)
        .join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
