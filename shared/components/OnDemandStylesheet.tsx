"use client";

import { useEffect } from "react";
import { scheduleStylesheetInjection } from "@/shared/lib/injectStylesheet";

/** Loads CSS only on routes that use the given icon pack / library. */
export default function OnDemandStylesheet({ hrefs }: { hrefs: readonly string[] }) {
  useEffect(() => scheduleStylesheetInjection(hrefs), [hrefs]);
  return null;
}
