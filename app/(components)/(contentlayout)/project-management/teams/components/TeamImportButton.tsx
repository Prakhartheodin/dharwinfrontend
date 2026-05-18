"use client";

import { useState } from "react";
import { useAuth } from "@/shared/contexts/auth-context";
import { hasPermission } from "@/shared/lib/permissions";
import TeamImportDialog from "./TeamImportDialog";

export default function TeamImportButton({
  onImportSuccess,
}: {
  onImportSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const auth = useAuth();
  const allowed = hasPermission(auth, "update_team");
  if (!allowed) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ti-btn ti-btn-secondary"
      >
        <i className="ri-upload-2-line me-1" /> Import Excel
      </button>
      {open && (
        <TeamImportDialog
          onClose={() => setOpen(false)}
          onImportSuccess={onImportSuccess}
        />
      )}
    </>
  );
}
