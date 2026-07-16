"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { PRIORITY_OPTIONS } from "../lib/constants";
import { countAdvancedFilters } from "../lib/advanced-filter-count";
import { useTaskFilters } from "../hooks/useTaskFilters";
import { TaskFilterChip } from "./TaskFilterChip";
import styles from "../../../kanban-board.module.css";

const PANEL_WIDTH = 280;
const PANEL_EST_HEIGHT = 220;
const VIEWPORT_PAD = 8;

export interface TaskAdvancedFilterProps {
  leavingCount?: number;
}

export function TaskAdvancedFilter({
  leavingCount = 0,
}: TaskAdvancedFilterProps): React.JSX.Element {
  const { filters, patchFilters, priorities, togglePriority } = useTaskFilters();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeCount = countAdvancedFilters(filters);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePanelPos = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const panel = panelRef.current;
    const panelWidth = Math.max(
      PANEL_WIDTH,
      Math.min(panel?.offsetWidth ?? PANEL_WIDTH, window.innerWidth - VIEWPORT_PAD * 2)
    );
    const panelHeight = panel?.offsetHeight ?? PANEL_EST_HEIGHT;

    let left = rect.left;
    left = Math.max(
      VIEWPORT_PAD,
      Math.min(left, window.innerWidth - panelWidth - VIEWPORT_PAD)
    );

    let top = rect.bottom + 8;
    if (top + panelHeight > window.innerHeight - VIEWPORT_PAD) {
      top = Math.max(VIEWPORT_PAD, rect.top - panelHeight - 8);
    }

    setPanelPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    updatePanelPos();
  }, [open, updatePanelPos, activeCount]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", updatePanelPos);
    window.addEventListener("scroll", updatePanelPos, true);
    return () => {
      window.removeEventListener("resize", updatePanelPos);
      window.removeEventListener("scroll", updatePanelPos, true);
    };
  }, [open, updatePanelPos]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          activeCount > 0
            ? `Advanced filters, ${activeCount} active`
            : "Advanced filters"
        }
        onClick={() => setOpen((v) => !v)}
        className={`${styles.kbAdvancedFilterTrigger} ${activeCount > 0 ? styles.kbAdvancedFilterTriggerActive : ""}`}
      >
        <i className="ri-filter-3-line" aria-hidden />
        Advanced filter
        {activeCount > 0 ? (
          <span className={styles.kbAdvancedFilterBadge} aria-hidden>
            {activeCount}
          </span>
        ) : null}
        <i className={`ri-arrow-${open ? "up" : "down"}-s-line`} aria-hidden />
      </button>
      {mounted && open
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Advanced filters"
              className={styles.kbAdvancedFilterPanel}
              style={
                panelPos
                  ? { position: "fixed", top: panelPos.top, left: panelPos.left }
                  : {
                      position: "fixed",
                      top: -9999,
                      left: -9999,
                      visibility: "hidden",
                    }
              }
            >
              <div className={styles.kbAdvancedFilterSection}>
                <div className={styles.kbAdvancedFilterLabel}>Priority</div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Priority">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <TaskFilterChip
                      key={opt.value}
                      label={opt.label}
                      active={priorities.includes(opt.value)}
                      onClick={() => togglePriority(opt.value)}
                    />
                  ))}
                </div>
              </div>
              <label className={styles.kbAdvancedFilterCheck}>
                <input
                  type="checkbox"
                  checked={filters.leaving}
                  onChange={(e) => patchFilters({ leaving: e.target.checked })}
                />
                {leavingCount > 0 ? `Leaving · ${leavingCount}` : "Leaving"}
              </label>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
