"use client";

import TeamImportContent from "./TeamImportContent";

/** Modal wrapper — same import UX as the dedicated import page. */
export default function TeamImportDialog({
  onClose,
  onImportSuccess,
}: {
  onClose: () => void;
  onImportSuccess?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl dark:bg-bodybg">
        <div className="flex items-center justify-between border-b border-defaultborder px-4 py-3 dark:border-white/10">
          <h3 className="text-base font-semibold">Import teams from Excel</h3>
          <button
            type="button"
            className="ti-btn ti-btn-sm ti-btn-light"
            onClick={onClose}
            aria-label="Close"
          >
            <i className="ri-close-line" />
          </button>
        </div>
        <TeamImportContent onImportSuccess={onImportSuccess} />
      </div>
    </div>
  );
}
