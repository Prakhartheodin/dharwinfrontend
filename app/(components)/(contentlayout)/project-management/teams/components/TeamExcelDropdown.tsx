"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasPermission } from "@/shared/lib/permissions";
import { downloadImportTemplate, exportTeamsExcel } from "@/shared/lib/api/teams";

type ExportScope = "current" | "all";

export default function TeamExcelDropdown({
  filter,
  onImportSuccess,
}: {
  filter?: { teamId?: string; department?: string };
  onImportSuccess?: () => void;
}) {
  const router = useRouter();
  const auth = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>("current");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allowed = hasPermission(auth, "update_team");

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const openExportModal = useCallback(() => {
    setMenuOpen(false);
    setExportScope(filter?.teamId ? "current" : "all");
    setIncludeInactive(false);
    setExportOpen(true);
  }, [filter?.teamId]);

  // Permission gate AFTER all hooks — auth resolves async, so an early return
  // above the hooks changes the hook count between renders (Rules of Hooks
  // violation) and crashes the component, leaving the button dead on click.
  if (!allowed) return null;

  const downloadTemplate = async () => {
    setMenuOpen(false);
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
        text: "Could not download the import template.",
      });
    }
  };

  const handleExportSubmit = async () => {
    setExportBusy(true);
    try {
      const params =
        exportScope === "all"
          ? { includeInactive }
          : { ...filter, includeInactive };
      const blob = await exportTeamsExcel(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `teams-export-${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
      await Swal.fire({
        icon: "success",
        title: "Export ready",
        text: "Your spreadsheet download has started.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Export failed";
      await Swal.fire({ icon: "error", title: "Export failed", text: message });
    } finally {
      setExportBusy(false);
    }
  };

  return (
    <>
      <div ref={dropdownRef} className="relative z-30">
        <button
          type="button"
          className="ti-btn ti-btn-primary !py-1 !px-2 !text-[0.75rem]"
          id="teams-excel-dropdown-button"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((o) => !o);
          }}
        >
          <i className="ri-file-excel-2-line font-semibold align-middle me-1" />
          Excel
          <i className="ri-arrow-down-s-line align-middle ms-1 inline-block" />
        </button>
        {menuOpen ? (
          <ul
            className="absolute end-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-defaultborder bg-white py-1 shadow-lg dark:border-defaultborder/20 dark:bg-bodybg"
            role="menu"
            aria-labelledby="teams-excel-dropdown-button"
          >
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                onClick={() => {
                  setMenuOpen(false);
                  router.push("/project-management/teams/import");
                }}
              >
                <i className="ri-upload-2-line me-2 align-middle inline-block" />
                Import
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                onClick={openExportModal}
              >
                <i className="ri-file-excel-2-line me-2 align-middle inline-block" />
                Export
              </button>
            </li>
            <li role="none">
              <button
                type="button"
                role="menuitem"
                className="ti-dropdown-item !py-2 !px-[0.9375rem] !text-[0.8125rem] !font-medium w-full text-left"
                onClick={() => void downloadTemplate()}
              >
                <i className="ri-download-line me-2 align-middle inline-block" />
                Template
              </button>
            </li>
          </ul>
        ) : null}
      </div>
      {exportOpen ? (
      <div
        id="teams-export-modal"
        className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/55"
        role="presentation"
        onClick={() => { if (!exportBusy) setExportOpen(false); }}
      >
        <div
          className="w-[96vw] max-w-md bg-bodybg border border-defaultborder rounded-xl shadow-xl flex flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="teams-export-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-defaultborder">
            <div>
              <h6 id="teams-export-title" className="mb-0.5 text-[1rem] font-semibold leading-tight">
                Export teams to Excel
              </h6>
              <p className="mb-0 text-[0.75rem] text-muted dark:text-white/50 leading-snug">
                Download team members as a spreadsheet.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close"
              className="shrink-0 grid place-items-center h-8 w-8 rounded-lg text-muted hover:bg-light dark:hover:bg-white/5"
              onClick={() => setExportOpen(false)}
            >
              <i className="ri-close-line text-[1.1rem]" />
            </button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div>
              <span className="block mb-2 text-[0.75rem] font-semibold uppercase tracking-wide text-muted dark:text-white/50">
                Scope
              </span>
              <div className="space-y-2">
                {([
                  { v: "current", label: "Current filters", hint: "Only teams matching the active filter" },
                  { v: "all", label: "All teams", hint: "Every team in the organisation" },
                ] as const).map((opt) => (
                  <label
                    key={opt.v}
                    className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      exportScope === opt.v
                        ? "border-primary bg-primary/5"
                        : "border-defaultborder hover:bg-light dark:hover:bg-white/5"
                    }`}
                  >
                    <input
                      type="radio"
                      name="teams-export-scope"
                      className="form-check-input mt-0.5"
                      checked={exportScope === opt.v}
                      onChange={() => setExportScope(opt.v)}
                    />
                    <span className="min-w-0">
                      <span className="block text-[0.8125rem] font-medium">{opt.label}</span>
                      <span className="block text-[0.75rem] text-muted dark:text-white/45">{opt.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                className="form-check-input"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              <span className="text-[0.8125rem]">Include inactive members</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-defaultborder bg-light/40 dark:bg-white/[0.02]">
            <button
              type="button"
              className="ti-btn ti-btn-light !mb-0"
              disabled={exportBusy}
              onClick={() => setExportOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ti-btn ti-btn-primary !mb-0 !font-medium"
              disabled={exportBusy}
              onClick={() => void handleExportSubmit()}
            >
              {exportBusy ? "Exporting…" : "Export"}
            </button>
          </div>
        </div>
      </div>
      ) : null}
    </>
  );
}

