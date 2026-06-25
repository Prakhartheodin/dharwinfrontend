"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useSavedViews } from "../hooks/useSavedViews";
import { useTaskFilters } from "../hooks/useTaskFilters";
import { useTaskUI } from "../hooks/useTaskUI";
import { toast } from "../lib/toast";
import styles from "../../../kanban-board.module.css";

const MENU_WIDTH = 256;
const MENU_EST_HEIGHT = 220;
const VIEWPORT_PAD = 8;

export interface SavedViewsMenuProps {
  userId: string;
  /** Optional hook after a saved view is applied (e.g. close mobile drawer). */
  onAfterApply?: () => void;
}

export function SavedViewsMenu({
  userId,
  onAfterApply,
}: SavedViewsMenuProps): React.JSX.Element {
  const { filters } = useTaskFilters();
  const { viewMode, density } = useTaskUI();
  const { views, loading, create, remove, loadView } = useSavedViews(userId);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPos = useCallback(() => {
    const btn = triggerRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menu = menuRef.current;
    const menuWidth = Math.max(
      MENU_WIDTH,
      Math.min(menu?.offsetWidth ?? MENU_WIDTH, window.innerWidth - VIEWPORT_PAD * 2)
    );
    const menuHeight = menu?.offsetHeight ?? MENU_EST_HEIGHT;

    let left = rect.right - menuWidth;
    left = Math.max(
      VIEWPORT_PAD,
      Math.min(left, window.innerWidth - menuWidth - VIEWPORT_PAD)
    );

    let top = rect.bottom + 4;
    if (top + menuHeight > window.innerHeight - VIEWPORT_PAD) {
      top = Math.max(VIEWPORT_PAD, rect.top - menuHeight - 4);
    }

    setMenuPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPos();
  }, [open, updateMenuPos, views.length]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", updateMenuPos);
    window.addEventListener("scroll", updateMenuPos, true);
    return () => {
      window.removeEventListener("resize", updateMenuPos);
      window.removeEventListener("scroll", updateMenuPos, true);
    };
  }, [open, updateMenuPos]);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  const handleSave = useCallback(async () => {
    const name = window.prompt("Name this view");
    if (!name?.trim()) return;
    setSaving(true);
    try {
      await create({
        name: name.trim(),
        filters,
        view: viewMode,
        density,
      });
      toast.success("View saved.");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save view.");
    } finally {
      setSaving(false);
    }
  }, [create, density, filters, viewMode]);

  const handleApply = useCallback(
    (id: string) => {
      const v = views.find((x) => x.id === id);
      if (!v) return;
      loadView(v);
      onAfterApply?.();
      setOpen(false);
    },
    [views, loadView, onAfterApply]
  );

  const handleDelete = useCallback(
    async (id: string, name: string) => {
      const result = await toast.confirm(`Delete "${name}"?`, {
        title: "Delete saved view",
      });
      if (!result.isConfirmed) return;
      try {
        await remove(id);
        toast.success("View deleted.");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not delete view.");
      }
    },
    [remove]
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={loading || saving}
        onClick={() => setOpen((v) => !v)}
        className={styles.kbSavedViewsTrigger}
      >
        <i className="ri-bookmark-line" aria-hidden />
        Saved views
        <i className={`ri-arrow-${open ? "up" : "down"}-s-line`} aria-hidden />
      </button>
      {mounted && open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className={styles.kbSavedViewsMenu}
              style={
                menuPos
                  ? { position: "fixed", top: menuPos.top, left: menuPos.left }
                  : {
                      position: "fixed",
                      top: -9999,
                      left: -9999,
                      visibility: "hidden",
                    }
              }
            >
              <button
                type="button"
                role="menuitem"
                className={styles.kbSavedViewsItem}
                onClick={() => void handleSave()}
              >
                <i className="ri-save-line" aria-hidden />
                Save current filters
              </button>
              {views.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-500">
                  No saved views yet.
                </p>
              ) : (
                views.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-1 px-1 hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className={`${styles.kbSavedViewsItem} min-w-0 flex-1 truncate`}
                      onClick={() => handleApply(v.id)}
                    >
                      {v.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${v.name}`}
                      className="rounded p-1.5 text-slate-400 hover:text-red-600"
                      onClick={() => void handleDelete(v.id, v.name)}
                    >
                      <i className="ri-delete-bin-line" aria-hidden />
                    </button>
                  </div>
                ))
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
