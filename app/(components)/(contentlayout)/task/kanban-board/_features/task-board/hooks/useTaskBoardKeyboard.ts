"use client";

import { useEffect } from "react";
import { useTaskUI } from "./useTaskUI";
import { getTaskBoardCapabilities } from "../lib/task-board-capabilities";
import { useAuth } from "@/shared/contexts/auth-context";
import type { TaskStatus } from "@/shared/lib/api/tasks";

export interface UseTaskBoardKeyboardOptions {
  canCreate?: boolean;
}

export function useTaskBoardKeyboard(opts: UseTaskBoardKeyboardOptions = {}): void {
  const { openDrawer, drawerMode, closeDrawer } = useTaskUI();
  const auth = useAuth();
  const canCreate = opts.canCreate ?? getTaskBoardCapabilities(auth).canCreate;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      const inField =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        el?.isContentEditable;
      if (inField && e.key !== "Escape") return;

      if (e.key === "n" && !e.metaKey && !e.ctrlKey && !e.altKey && canCreate) {
        e.preventDefault();
        openDrawer("create", undefined, "new" as TaskStatus);
        return;
      }
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        const search =
          document.querySelector<HTMLInputElement>(
            '#task-board-filters input[type="search"]'
          ) ??
          document.querySelector<HTMLInputElement>("#task-board-filters input");
        search?.focus();
        return;
      }
      if (e.key === "Escape" && drawerMode) {
        closeDrawer();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canCreate, closeDrawer, drawerMode, openDrawer]);
}
