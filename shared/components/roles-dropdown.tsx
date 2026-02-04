"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Role } from "@/shared/lib/types";

export interface RolesDropdownProps {
  roles: Role[];
  selectedIds: string[];
  onToggle: (roleId: string) => void;
  placeholder?: string;
  className?: string;
}

export function RolesDropdown({
  roles,
  selectedIds,
  onToggle,
  placeholder = "Select roles...",
  className = "",
}: RolesDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredRoles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter((r) => r.name.toLowerCase().includes(q));
  }, [roles, search]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedNames = roles.filter((r) => selectedIds.includes(r.id)).map((r) => r.name);
  const label = selectedNames.length > 0 ? selectedNames.join(", ") : placeholder;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="form-control border flex items-center justify-between gap-2 text-start min-h-[2.375rem]"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select roles"
      >
        <span className={selectedNames.length === 0 ? "text-defaulttextcolor/60" : ""}>
          {label}
        </span>
        <i className={`ri-arrow-down-s-line text-[1.25rem] shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border-2 border-defaultborder bg-white dark:bg-black/95 shadow-lg max-h-64 flex flex-col"
          role="listbox"
        >
          <div className="p-2 border-b border-defaultborder shrink-0">
            <input
              type="text"
              className="form-control !py-1.5 !text-[0.875rem]"
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="overflow-y-auto p-1">
            {filteredRoles.length === 0 ? (
              <p className="px-3 py-2 text-[0.875rem] text-defaulttextcolor/70">No roles match.</p>
            ) : (
              filteredRoles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-2 px-3 py-2 rounded hover:bg-primary/5 cursor-pointer text-[0.875rem]"
                  role="option"
                  aria-selected={selectedIds.includes(role.id)}
                >
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={selectedIds.includes(role.id)}
                    onChange={() => onToggle(role.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span>{role.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
