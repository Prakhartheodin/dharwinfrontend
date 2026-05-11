"use client";
import { type ReactNode } from "react";
import { CONTAINMENT, SURFACE, TYPE, WRAP_ANYWHERE } from "./tokens";

interface RecordCardProps {
  index?: number;
  children: ReactNode;
}

// Vertical record card with primary accent stripe. Used by every list
// renderer (Block table, markdown table, candidates table, cards block).
export function RecordCard({ index, children }: RecordCardProps) {
  return (
    <div className={`relative overflow-hidden px-3 py-2.5 text-[12px] ${SURFACE.cardAccent} ${CONTAINMENT} ${WRAP_ANYWHERE}`}>
      <span className="absolute left-0 top-0 h-full w-[2.5px] bg-gradient-to-b from-primary via-primary/70 to-cyan-400/60" />
      {typeof index === "number" && (
        <div className="mb-1.5 flex items-center gap-1.5 pl-1">
          <span className={TYPE.recordId}>Record · {String(index + 1).padStart(2, "0")}</span>
        </div>
      )}
      <div className="space-y-1 pl-1">{children}</div>
    </div>
  );
}

interface SimpleCardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

// Flat surface card — KV summaries, empty states, single-record details.
export function SimpleCard({ title, children, className = "" }: SimpleCardProps) {
  return (
    <div className={`overflow-hidden px-3 py-2.5 ${SURFACE.card} ${CONTAINMENT} ${className}`}>
      {title && <p className={`mb-1.5 ${TYPE.title}`}>{title}</p>}
      {children}
    </div>
  );
}
