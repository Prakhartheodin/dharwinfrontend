// uat.dharwin.frontend/shared/components/FloatingChatbot/ui/tokens.ts
//
// Single source of truth for chatbot visual tokens. Every primitive +
// renderer imports from here — never inlines tone classes, radii, or
// animation keyframes.

import type { Tone } from "@/shared/types/chatResponse";

export const TONE_CHIP: Record<Tone, string> = {
  neutral: "border-slate-200/80 bg-slate-100/70 text-slate-700 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-200",
  info:    "border-sky-200/70 bg-sky-50/80 text-sky-700 dark:border-sky-800/50 dark:bg-sky-900/30 dark:text-sky-200",
  success: "border-emerald-200/70 bg-emerald-50/80 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-900/30 dark:text-emerald-200",
  warn:    "border-amber-200/70 bg-amber-50/80 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/30 dark:text-amber-200",
  danger:  "border-rose-200/70 bg-rose-50/80 text-rose-700 dark:border-rose-800/50 dark:bg-rose-900/30 dark:text-rose-200",
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-slate-400",
  info:    "bg-sky-500",
  success: "bg-emerald-500",
  warn:    "bg-amber-500",
  danger:  "bg-rose-500",
};

// Card surfaces.
export const SURFACE = {
  card:        "rounded-xl border border-slate-200/70 bg-white dark:border-slate-700/60 dark:bg-slate-800/60",
  cardAccent:  "rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/60 dark:border-slate-700/60 dark:from-slate-800/60 dark:to-slate-900/60",
  console:     "border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/60",
  bubbleAgent: "rounded-2xl rounded-tl-sm border border-slate-200/70 bg-white text-slate-900 shadow-[0_3px_14px_-6px_rgba(15,23,42,.08)] dark:border-slate-700/60 dark:bg-slate-800/70 dark:text-slate-100",
  bubbleUser:  "rounded-2xl rounded-tr-sm bg-gradient-to-br from-primary to-purple-600 text-white shadow-[0_5px_18px_-8px_rgb(132_90_223_/_0.6)] ring-1 ring-white/15",
} as const;

// Containment — every chatbot inner box uses these to prevent overflow.
export const CONTAINMENT = "w-full min-w-0 max-w-full box-border";
export const WRAP_ANYWHERE = "[overflow-wrap:anywhere]";

// Typography scale.
export const TYPE = {
  label:    "font-mono text-[9.5px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400",
  recordId: "font-mono text-[9px] uppercase tracking-[0.2em] text-primary/70",
  title:    "font-mono text-[10px] uppercase tracking-[0.18em] text-primary/75",
  value:    "min-w-0 flex-1 break-words text-slate-800 dark:text-slate-100",
  heading1: "text-[14px] font-semibold tracking-tight text-slate-900 dark:text-slate-50",
  heading2: "text-[13px] font-semibold text-slate-900 dark:text-slate-50",
  heading3: "font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-primary/80",
  body:     "text-[12.5px] text-slate-800 dark:text-slate-100",
  meta:     "font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400",
} as const;

export const TABLE_PAGE_SIZE = 10;

// Console animation keyframes — injected once via <ConsoleStyles/>.
export const CONSOLE_KEYFRAMES = `
@keyframes agent-grid-drift {
  0% { background-position: 0 0, 0 0; }
  100% { background-position: 32px 32px, 32px 32px; }
}
@keyframes agent-orbit {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes agent-pulse-ring {
  0% { transform: scale(0.55); opacity: 0.85; }
  100% { transform: scale(1.7); opacity: 0; }
}
@keyframes agent-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(220%); }
}
@keyframes agent-dot {
  0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
}
@keyframes agent-bar {
  0%, 100% { transform: scaleX(0.2); opacity: 0.45; }
  50% { transform: scaleX(1); opacity: 1; }
}
@keyframes agent-mesh-drift {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(-4%, 3%, 0) scale(1.08); }
}
.agent-grid-bg {
  background-image:
    linear-gradient(rgba(132, 90, 223, 0.06) 1px, transparent 1px),
    linear-gradient(90deg, rgba(132, 90, 223, 0.06) 1px, transparent 1px);
  background-size: 32px 32px, 32px 32px;
  animation: agent-grid-drift 26s linear infinite;
}
.dark .agent-grid-bg {
  background-image:
    linear-gradient(rgba(165, 138, 240, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(165, 138, 240, 0.07) 1px, transparent 1px);
}
.agent-scrollbar::-webkit-scrollbar { width: 6px; }
.agent-scrollbar::-webkit-scrollbar-track { background: transparent; }
.agent-scrollbar::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(132,90,223,0.35), rgba(34,211,238,0.25));
  border-radius: 999px;
}
.agent-scrollbar::-webkit-scrollbar-thumb:hover {
  background: linear-gradient(180deg, rgba(132,90,223,0.55), rgba(34,211,238,0.45));
}
`;

