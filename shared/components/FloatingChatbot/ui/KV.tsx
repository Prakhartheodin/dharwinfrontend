"use client";
import type { Tone } from "@/shared/types/chatResponse";
import { CONTAINMENT, SURFACE, TYPE } from "./tokens";

interface KVProps {
  title?: string;
  pairs: { label: string; value: string; tone?: Tone }[];
}

// Title + label/value list card. Caller: renderers/blocks/KV.tsx
export function KV({ title, pairs }: KVProps) {
  return (
    <div className={`overflow-hidden px-3 py-2.5 ${SURFACE.card} ${CONTAINMENT}`}>
      {title && <p className={`mb-1.5 ${TYPE.title}`}>{title}</p>}
      <div className="space-y-1">
        {pairs.map((p, i) => (
          <div key={i} className="flex flex-col gap-0.5 text-[12.5px] sm:flex-row sm:items-baseline sm:gap-3">
            <span className={`${TYPE.label} sm:min-w-[7.5rem]`}>{p.label}</span>
            <span className={`${TYPE.value} tabular-nums ${p.tone ? "font-medium" : ""}`}>{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
