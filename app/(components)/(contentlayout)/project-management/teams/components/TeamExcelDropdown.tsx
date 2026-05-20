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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allowed = hasPermission(auth, "update_team");
  if (!allowed) return null;

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
    queueMicrotask(() => {
      const el = document.querySelector("#teams-export-modal");
      const HSOverlay = (window as unknown as { HSOverlay?: { open: (n: Element | string) => void } })
        .HSOverlay;
      if (el && HSOverlay) HSOverlay.open("#teams-export-modal");
      else el?.classList.remove("hidden");
    });
  }, [filter?.teamId]);

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
      document.querySelector('[data-hs-overlay="#teams-export-modal"]')?.dispatchEvent(
        new Event("click")
      );
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
      <div id="teams-export-modal" className="hs-overlay hidden ti-modal">
        <div className="hs-overlay-open:mt-7 ti-modal-box mt-0 ease-out lg:!max-w-lg lg:w-full m-3 lg:!mx-auto">
          <div className="ti-modal-content">
            <div className="ti-modal-header">
              <h6 className="modal-title text-[1rem] font-semibold">Export teams to Excel</h6>
              <button
                type="button"
                className="hs-dropdown-toggle !text-[1rem] !font-semibold !text-defaulttextcolor"
                data-hs-overlay="#teams-export-modal"
              >
                <span className="sr-only">Close</span>
                <i className="ri-close-line"></i>
              </button>
            </div>
            <div className="ti-modal-body px-4">
              <p className="text-[0.8125rem] text-[#8c9097] dark:text-white/50 mb-4">
                Download team members as a spreadsheet. Choose scope and whether to include inactive members.
              </p>
              <div className="space-y-3 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="teams-export-scope"
                    className="form-check-input"
                    checked={exportScope === "current"}
                    onChange={() => setExportScope("current")}
                  />
                  <span className="text-[0.8125rem]">Current filters</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="teams-export-scope"
                    className="form-check-input"
                    checked={exportScope === "all"}
                    onChange={() => setExportScope("all")}
                  />
                  <span className="text-[0.8125rem]">All teams</span>
                </label>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                />
                <span className="text-[0.8125rem]">Include inactive members</span>
              </label>
            </div>
            <div className="ti-modal-footer">
              <button
                type="button"
                className="ti-btn ti-btn-light"
                data-hs-overlay="#teams-export-modal"
              >
                Cancel
              </button>
              <button
                type="button"
                className="ti-btn bg-primary text-white !font-medium"
                disabled={exportBusy}
                onClick={() => void handleExportSubmit()}
              >
                {exportBusy ? "Exporting…" : "Export"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

