"use client";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { CONTROL } from "./tokens";
import { CheckIcon, CopyIcon, SparkleIcon } from "./icons";

// ─── IconButton — header icon (clear / expand / close) ─────────────────────

export function IconButton({
  children, onClick, label, disabled = false,
}: { children: ReactNode; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={CONTROL.header}
    >
      {children}
    </button>
  );
}

// ─── Kbd — keyboard shortcut chip ──────────────────────────────────────────

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-slate-200 bg-white px-1 font-mono text-[11px] font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {children}
    </kbd>
  );
}

// ─── AgentOrb — assistant mark ─────────────────────────────────────────────
//
// Was a flat "D" disc, which read as a user initial rather than an assistant.
// Now a sparkle glyph in a brand-tinted squircle. The only motion is the
// pulse ring, and that fires only while `pulse` is true (preparing /
// streaming).

const ORB_BOX = { sm: "h-6 w-6 rounded-md", md: "h-8 w-8 rounded-lg" } as const;
const ORB_GLYPH = { sm: "h-3.5 w-3.5", md: "h-[18px] w-[18px]" } as const;

export function AgentOrb({ size = "md", pulse = false }: { size?: "sm" | "md"; pulse?: boolean }) {
  return (
    <div aria-hidden className={`relative flex-shrink-0 ${ORB_BOX[size]}`}>
      {pulse && (
        <span
          className={`absolute inset-0 bg-violet-400/30 ${ORB_BOX[size]}`}
          style={{ animation: "agent-pulse-ring 1.6s ease-out infinite" }}
        />
      )}
      <div className={`absolute inset-0 flex items-center justify-center bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 ${ORB_BOX[size]}`}>
        <SparkleIcon className={ORB_GLYPH[size]} />
      </div>
    </div>
  );
}

// ─── ReasoningIndicator — "thinking" content, rendered in the reply slot ───
//
// Sits exactly where the reply text will appear (under the same author row),
// so nothing jumps when the first token lands.

export function ReasoningIndicator() {
  return (
    <div className="flex h-[21px] items-center gap-2">
      <span aria-hidden className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary" style={{ animation: "agent-dot 1.2s ease-in-out infinite", animationDelay: "0ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary" style={{ animation: "agent-dot 1.2s ease-in-out infinite", animationDelay: "180ms" }} />
        <span className="h-1.5 w-1.5 rounded-full bg-primary" style={{ animation: "agent-dot 1.2s ease-in-out infinite", animationDelay: "360ms" }} />
      </span>
      <span className="text-[13px] text-slate-500 dark:text-slate-400">Reading your data…</span>
    </div>
  );
}

// ─── EmptyChatState — pre-conversation suggested-questions screen ─────────

export function EmptyChatState({
  fullscreen, onPick, disabled, suggestions,
}: {
  fullscreen: boolean;
  onPick: (q: string) => void;
  disabled: boolean;
  suggestions: { q: string; k: string }[];
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${fullscreen ? "py-20" : "h-full py-6 px-1"}`}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
        <SparkleIcon className="h-6 w-6" />
      </div>

      <p className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        How can I help you today?
      </p>
      <p className="mt-1.5 max-w-sm text-[13px] text-slate-600 dark:text-slate-400">
        Ask anything about employees, jobs, attendance, leave, projects &amp; more.
      </p>

      <div className={`mt-5 grid w-full gap-2 ${fullscreen ? "max-w-2xl grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {suggestions.map(({ q, k }) => (
          <button
            key={q}
            type="button"
            onClick={() => onPick(q)}
            disabled={disabled}
            className="group/sug flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-primary dark:hover:bg-slate-900"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{k}</span>
              <span className="truncate text-[13px] text-slate-800 dark:text-slate-200">{q}</span>
            </span>
            <svg className="h-3.5 w-3.5 flex-shrink-0 text-slate-400 transition-transform group-hover/sug:translate-x-0.5 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── CopyButton — quiet ghost action under an agent reply ──────────────────

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard blocked (permissions / insecure context): nothing to show */
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      title={done ? "Copied" : "Copy"}
      aria-label={done ? "Copied" : "Copy reply"}
      className={CONTROL.action}
    >
      {done ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
      {done && <span role="status" className="text-[11px] font-medium">Copied</span>}
    </button>
  );
}
