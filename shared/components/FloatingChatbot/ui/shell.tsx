"use client";
import { type ReactNode, useState } from "react";
import { TYPE } from "./tokens";

// ─── IconButton — header icon (clear / expand / close) ─────────────────────

export function IconButton({
  children, onClick, label,
}: { children: ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-primary/10 hover:text-primary active:bg-primary/15 dark:text-slate-400 dark:hover:bg-primary/20 dark:hover:text-purple-300"
    >
      {children}
    </button>
  );
}

// ─── Kbd — keyboard shortcut chip ──────────────────────────────────────────

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded border border-slate-200 bg-white px-1 font-mono text-[9px] font-semibold text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      {children}
    </kbd>
  );
}

// ─── AgentOrb — orbiting gradient avatar ───────────────────────────────────

const ORB_SIZE = { sm: "h-7 w-7", md: "h-10 w-10", lg: "h-16 w-16" } as const;
const ORB_INNER = {
  sm: "inset-[2px] text-[10px]",
  md: "inset-[3px] text-[12px]",
  lg: "inset-[5px] text-[18px]",
} as const;

export function AgentOrb({
  size = "md", pulse = false, label = "D",
}: { size?: "sm" | "md" | "lg"; pulse?: boolean; label?: string }) {
  const orbitDuration = size === "sm" ? "4s" : size === "md" ? "7s" : "8s";
  return (
    <div className={`relative ${ORB_SIZE[size]} flex-shrink-0`}>
      <span
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(132,90,223,0.7), rgba(34,211,238,0.6), rgba(132,90,223,0.7))",
          animation: `agent-orbit ${orbitDuration} linear infinite`,
          WebkitMask: "radial-gradient(circle, transparent 55%, black 56%)",
          mask: "radial-gradient(circle, transparent 55%, black 56%)",
        }}
      />
      {pulse && (
        <span
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary/35"
          style={{ animation: "agent-pulse-ring 1.6s ease-out infinite" }}
        />
      )}
      <div className={`absolute flex items-center justify-center rounded-full bg-gradient-to-br from-primary via-purple-500 to-cyan-400 font-bold text-white ring-1 ring-white/30 ${ORB_INNER[size]}`}>
        <span className="absolute inset-0 rounded-full bg-gradient-to-br from-white/30 to-transparent" />
        <span className="relative">{label}</span>
      </div>
    </div>
  );
}

// ─── ReasoningIndicator — "Agent · Thinking" with animated dots ────────────

export function ReasoningIndicator() {
  return (
    <div className="mb-4 flex justify-start">
      <div className="mr-2 flex-shrink-0">
        <AgentOrb size="sm" />
      </div>
      <div className="flex flex-col">
        <span className={`mb-1 px-1 ${TYPE.recordId}`}>Agent · Thinking</span>
        <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-slate-200/70 bg-white px-3.5 py-2.5 shadow-[0_3px_14px_-6px_rgba(15,23,42,.08)] dark:border-slate-700/60 dark:bg-slate-800/70">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" style={{ animation: "agent-dot 1.2s ease-in-out infinite", animationDelay: "0ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" style={{ animation: "agent-dot 1.2s ease-in-out infinite", animationDelay: "180ms" }} />
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animation: "agent-dot 1.2s ease-in-out infinite", animationDelay: "360ms" }} />
          </span>
          <span className="text-[11.5px] text-slate-500 dark:text-slate-400">Reasoning over your data…</span>
        </div>
      </div>
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
      <div className="relative mb-5">
        <div
          aria-hidden
          className="absolute inset-0 -m-6 rounded-full opacity-70 blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(132,90,223,0.55), rgba(34,211,238,0.18) 55%, transparent 70%)",
            animation: "agent-mesh-drift 9s ease-in-out infinite",
          }}
        />
        <div className="relative">
          <span
            aria-hidden
            className="absolute inset-0 -m-2 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(132,90,223,0.7), rgba(34,211,238,0.6), rgba(132,90,223,0.7))",
              animation: "agent-orbit 8s linear infinite",
              WebkitMask: "radial-gradient(circle, transparent 60%, black 61%)",
              mask: "radial-gradient(circle, transparent 60%, black 61%)",
            }}
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-cyan-400 text-white shadow-[0_10px_28px_-8px_rgb(132_90_223_/_0.55)] ring-1 ring-white/20">
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 to-transparent" />
            <svg className="relative h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
        </div>
      </div>

      <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.06] px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.22em] text-primary/85">
        <span className="h-1 w-1 rounded-full bg-emerald-400" />
        Agent Ready
      </span>
      <p className="mt-1 text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
        How can I help you today?
      </p>
      <p className="mt-1 max-w-sm text-[12px] text-slate-500 dark:text-slate-400">
        Ask anything about employees, jobs, attendance, leave, projects &amp; more.
      </p>

      <div className={`mt-5 grid w-full gap-2 ${fullscreen ? "max-w-2xl grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
        {suggestions.map(({ q, k }) => (
          <button
            key={q}
            onClick={() => onPick(q)}
            disabled={disabled}
            className="group/sug relative flex items-center justify-between gap-2 overflow-hidden rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-left transition-all hover:border-primary/40 hover:shadow-[0_4px_14px_-6px_rgb(132_90_223_/_0.35)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-primary/40"
          >
            <span aria-hidden className="absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-primary to-cyan-400/60 opacity-0 transition-opacity group-hover/sug:opacity-100" />
            <span className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-primary/70">{k}</span>
              <span className="truncate text-[12.5px] text-slate-700 dark:text-slate-200">{q}</span>
            </span>
            <svg className="h-3 w-3 flex-shrink-0 text-slate-300 transition-all group-hover/sug:translate-x-0.5 group-hover/sug:text-primary dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── CopyButton — used after agent message ─────────────────────────────────

export function CopyButton({ text, compact = false }: { text: string; compact?: boolean }) {
  const [done, setDone] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* ignore */
    }
  };
  return (
    <button
      type="button"
      onClick={onCopy}
      title={done ? "Copied" : "Copy"}
      aria-label={done ? "Copied" : "Copy"}
      className={[
        "inline-flex items-center gap-1 rounded-md font-mono text-[10px] uppercase tracking-[0.14em]",
        "border transition-all px-1.5 py-0.5",
        compact
          ? "border-slate-200/60 dark:border-slate-700/60 text-slate-500 dark:text-slate-400 hover:border-primary/40 hover:text-primary"
          : "border-slate-700/50 text-slate-400 hover:text-cyan-300 hover:border-cyan-400/40",
      ].join(" ")}
    >
      {done ? (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v10a2 2 0 002 2h7M16 17V5a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2h2" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}
