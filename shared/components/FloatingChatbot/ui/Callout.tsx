"use client";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Tone } from "@/shared/types/chatResponse";
import { CONTAINMENT, TONE_CHIP, TONE_DOT, WRAP_ANYWHERE } from "./tokens";

interface CalloutProps {
  tone: Tone;
  md: string;
}

// Tone callout box with leading dot. Caller: renderers/blocks/Callout.tsx
export function Callout({ tone, md }: CalloutProps) {
  return (
    <div className={`flex gap-2 overflow-hidden rounded-lg border px-3 py-2 text-[12.5px] ${TONE_CHIP[tone]} ${CONTAINMENT} ${WRAP_ANYWHERE}`}>
      <span className={`mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full ${TONE_DOT[tone]}`} />
      <div className="min-w-0 flex-1 [&>p]:mb-0">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
      </div>
    </div>
  );
}
