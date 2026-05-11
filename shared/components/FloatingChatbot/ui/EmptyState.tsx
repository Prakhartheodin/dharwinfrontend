"use client";
import { CONTAINMENT, SURFACE } from "./tokens";

interface EmptyStateProps {
  title?: string;
  noun?: string;
}

// Canonical empty card — replaces inline empty-state markup in TableBlockView,
// CardsBlockView, listingRenderer "No X found". One copy, one heading.
export function EmptyState({ title, noun }: EmptyStateProps) {
  const heading = title ?? `No ${noun || "records"} found`;
  return (
    <div className={`overflow-hidden px-3 py-2.5 text-center ${SURFACE.card} ${CONTAINMENT}`}>
      <h3 className="text-[12.5px] font-semibold text-slate-700 dark:text-slate-200">
        {heading}
      </h3>
    </div>
  );
}
