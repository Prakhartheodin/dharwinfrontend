"use client";
import { type ReactNode } from "react";
import { TYPE } from "./tokens";

interface FieldRowProps {
  label: string;
  children: ReactNode;
}

// Label + value pair. Stacked on narrow viewports, side-by-side on sm+.
// Used inside RecordCard and KVBlock.
export function FieldRow({ label, children }: FieldRowProps) {
  return (
    <div className="flex flex-col border-b border-slate-200/60 pb-1 leading-snug last:border-b-0 last:pb-0 dark:border-slate-700/40 sm:flex-row sm:items-baseline sm:gap-3">
      <span className={`${TYPE.label} sm:min-w-[6rem] sm:max-w-[40%]`}>{label}</span>
      <span className={TYPE.value}>{children}</span>
    </div>
  );
}
