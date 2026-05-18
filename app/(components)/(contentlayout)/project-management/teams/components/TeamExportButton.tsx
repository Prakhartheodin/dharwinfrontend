"use client";

import { useState } from "react";
import { exportTeamsExcel } from "@/shared/lib/api/teams";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasPermission } from "@/shared/lib/permissions";

export default function TeamExportButton({
  filter,
}: {
  filter?: { teamId?: string; department?: string };
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const auth = useAuth();
  if (!hasPermission(auth, "update_team")) return null;

  const run = async (params: {
    teamId?: string;
    department?: string;
    includeInactive?: boolean;
  }) => {
    setBusy(true);
    try {
      const blob = await exportTeamsExcel(params);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `teams-export-${date}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={busy}
        className="ti-btn ti-btn-secondary"
      >
        <i className="ri-download-2-line me-1" /> Export Excel
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-white border rounded shadow z-20 min-w-[200px]">
          <button
            type="button"
            className="block w-full text-left px-3 py-2 hover:bg-gray-50"
            onClick={() => run({ ...filter })}
          >
            Export current view
          </button>
          <button
            type="button"
            className="block w-full text-left px-3 py-2 hover:bg-gray-50"
            onClick={() => run({})}
          >
            Export all teams
          </button>
          <button
            type="button"
            className="block w-full text-left px-3 py-2 hover:bg-gray-50"
            onClick={() => run({ ...filter, includeInactive: true })}
          >
            Include inactive members
          </button>
        </div>
      )}
    </div>
  );
}
