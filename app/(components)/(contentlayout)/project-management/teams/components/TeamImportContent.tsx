"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import {
  importTeamsExcel,
  downloadImportTemplate,
  type TeamImportResult,
} from "@/shared/lib/api/teams";
import TeamImportSummaryPanel from "./TeamImportSummaryPanel";

type State =
  | { kind: "idle" }
  | { kind: "uploading"; pct: number }
  | { kind: "result"; data: TeamImportResult }
  | { kind: "error"; message: string; errors?: Array<{ type: string; [k: string]: unknown }> };

export interface TeamImportContentProps {
  returnToTeamsOnBack?: boolean;
  onImportSuccess?: () => void;
}

export function prettyTeamImportError(e: { type: string; [k: string]: unknown }): string {
  switch (e.type) {
    case "missing_header":
      return `Missing column: ${String(e.header)}. Download the template.`;
    case "empty_sheet":
      return "Excel file is empty.";
    case "file_too_large":
      return "File exceeds 5 MB.";
    case "invalid_mime":
      return "Only .xlsx files are supported.";
    case "unknown_columns":
      return `Ignored columns: ${Array.isArray(e.columns) ? (e.columns as string[]).join(", ") : ""}`;
    case "row_limit_exceeded":
      return `Too many rows (${e.received}). Max ${e.limit}.`;
    default:
      return JSON.stringify(e);
  }
}

async function notifyImportOutcome(
  data: TeamImportResult,
  router: ReturnType<typeof useRouter>,
  returnToTeamsOnBack: boolean
) {
  const s = data.summary;
  const added = (s.employeesAdded ?? 0) + (s.teamsCreated ?? 0) + (s.teamsUpdated ?? 0);
  const ignored = (s.employeesIgnored ?? 0) + (s.duplicatesSkipped ?? 0);

  if (added === 0 && ignored > 0) {
    await Swal.fire({
      icon: "warning",
      title: "Import completed with issues",
      text: "No new members were added. Review the summary below for skipped rows.",
      confirmButtonText: "OK",
    });
    return;
  }

  if (added > 0 && ignored > 0) {
    await Swal.fire({
      icon: "warning",
      title: "Partial import",
      html: `Applied changes for <strong>${added}</strong> row(s).<br>${ignored} row(s) were skipped or ignored.`,
      confirmButtonText: "OK",
    });
    if (returnToTeamsOnBack) router.push("/project-management/teams");
    return;
  }

  if (added > 0) {
    await Swal.fire({
      icon: "success",
      title: "Import successful",
      text: `Import finished (${added} change${added === 1 ? "" : "s"} applied).`,
      confirmButtonText: returnToTeamsOnBack ? "Back to teams" : "OK",
    });
    if (returnToTeamsOnBack) router.push("/project-management/teams");
  }
}

export default function TeamImportContent({
  returnToTeamsOnBack = false,
  onImportSuccess,
}: TeamImportContentProps) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [file, setFile] = useState<File | null>(null);

  const downloadTemplate = async () => {
    try {
      const blob = await downloadImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "teams-import-template.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      await Swal.fire({
        icon: "error",
        title: "Template download failed",
        text: "Could not download the import template. Try again.",
      });
    }
  };

  const submit = async () => {
    if (!file) return;
    setState({ kind: "uploading", pct: 0 });
    try {
      const data = await importTeamsExcel(file, (pct) => setState({ kind: "uploading", pct }));
      setState({ kind: "result", data });
      onImportSuccess?.();
      await notifyImportOutcome(data, router, returnToTeamsOnBack);
    } catch (err: unknown) {
      const e = err as { message?: string; errors?: Array<{ type: string }> };
      const message = e?.message || "Upload failed";
      setState({ kind: "error", message, errors: e?.errors });
      await Swal.fire({
        icon: "error",
        title: "Import error",
        html:
          message +
          (Array.isArray(e?.errors) && e.errors.length > 0
            ? `<br><br>${e.errors.slice(0, 5).map((row) => prettyTeamImportError(row)).join("<br>")}`
            : ""),
      });
    }
  };


  return (
    <div className="p-6">
      {returnToTeamsOnBack ? (
        <div className="mb-4">
          <button
            type="button"
            className="ti-btn ti-btn-light !py-1 !px-2 !text-[0.75rem]"
            onClick={() => router.push("/project-management/teams")}
          >
            <i className="ri-arrow-left-line me-1 align-middle" />
            Back to teams
          </button>
        </div>
      ) : null}

      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
        <h4 className="mb-2 font-semibold text-blue-800 dark:text-blue-200">File format requirements</h4>
        <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
          <li><strong>Excel (.xlsx):</strong> one sheet with a header row</li>
          <li><strong>Required column:</strong> Team Name</li>
          <li>Optional: Team Lead Email, Department, Description, employee IDs/emails, Team Seniority</li>
          <li>Match employees by email or employee ID; max file size 5 MB</li>
        </ul>
        <button
          type="button"
          onClick={() => void downloadTemplate()}
          className="mt-3 text-sm font-medium text-primary underline"
        >
          Download import template
        </button>
      </div>

      {state.kind === "idle" && (
        <>
          <label className="block cursor-pointer rounded-lg border-2 border-dashed border-defaultborder p-8 text-center hover:bg-light dark:border-white/10 dark:hover:bg-white/5">
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <i className="ri-file-excel-2-line text-4xl text-green-600" />
            <p className="mt-2 text-sm">{file ? file.name : "Drop .xlsx here or click to choose"}</p>
          </label>
          <div className="mt-4">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!file}
              className="ti-btn ti-btn-primary-full !py-2 !px-4"
            >
              <i className="ri-upload-2-line me-1" /> Import
            </button>
          </div>
        </>
      )}

      {state.kind === "uploading" && (
        <div className="py-8 text-center">
          <p className="text-sm font-medium">Uploading… {state.pct}%</p>
          <div className="mt-2 h-2 w-full rounded bg-gray-200 dark:bg-white/10">
            <div className="h-2 rounded bg-primary transition-all" style={{ width: `${state.pct}%` }} />
          </div>
        </div>
      )}

      {state.kind === "result" && <TeamImportSummaryPanel result={state.data} />}

      {state.kind === "error" && (
        <div className="rounded-lg border border-danger/30 bg-danger/5 p-4 text-danger">
          <p className="font-semibold">{state.message}</p>
          {Array.isArray(state.errors) && state.errors.length > 0 && (
            <ul className="ml-6 mt-2 list-disc text-sm">
              {state.errors.map((e, i) => (
                <li key={i}>{prettyTeamImportError(e)}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
