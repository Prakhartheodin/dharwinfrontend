"use client";
import type { Tone } from "@/shared/types/chatResponse";
import { CONTAINMENT, SURFACE, TYPE } from "./tokens";

interface KVProps {
  title?: string;
  pairs: { label: string; value: string; tone?: Tone }[];
}

/** Job HTML is plain before it arrives. If a tag still gets here, do not show it. */
export function plainKvValue(value: string): string {
  try {
    let s = String(value ?? "");
    if (!s.trim()) return "";
    s = s.replace(/<script\b[^>]*>[\s\S]*?(?:<\/script>|$)/gi, "");
    s = s.replace(/<style\b[^>]*>[\s\S]*?(?:<\/style>|$)/gi, "");
    s = s.replace(/<br\s*\/?>/gi, "\n");
    s = s.replace(/<\/p>/gi, "\n");
    s = s.replace(/<li\b[^>]*>/gi, "\n");
    s = s.replace(/<[^>]*>/g, "");
    s = s
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'");
    if (/<[^>]+>/.test(s)) s = s.replace(/<script\b[^>]*>[\s\S]*?(?:<\/script>|$)/gi, "").replace(/<[^>]*>/g, "");
    return s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return "";
  }
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
            <span className={`${TYPE.value} whitespace-pre-line tabular-nums ${p.tone ? "font-medium" : ""}`}>{plainKvValue(p.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
