"use client";

import { useEffect } from "react";
import { SHELL_DEFERRED_STYLESHEETS } from "@/shared/lib/iconStylesheetPaths";
import { scheduleStylesheetInjection } from "@/shared/lib/injectStylesheet";

/**
 * Shell icon CSS (boxicons sidebar/header, feather chevrons). Loaded after first paint.
 * line-awesome / bootstrap-icons removed from global load — not used on /ats/employees or sidebar.
 */
export default function DeferredStylesheets() {
  useEffect(() => scheduleStylesheetInjection(SHELL_DEFERRED_STYLESHEETS), []);

  return null;
}
