"use client";
import type { Tone } from "@/shared/types/chatResponse";
import { TONE_CHIP, TONE_DOT } from "./tokens";

interface ChipProps {
  tone?: Tone;
  label: string;
  count?: number;
}

// Tone-colored pill with optional count. Used in BadgeRow + table badge cells.
export function Chip({ tone = "neutral", label, count }: ChipProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CHIP[tone]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[tone]}`} />
      <span>{label}</span>
      {typeof count === "number" && (
        <span className="rounded-md bg-white/60 px-1 font-mono text-[10px] tabular-nums dark:bg-slate-900/40">
          {count}
        </span>
      )}
    </span>
  );
}
