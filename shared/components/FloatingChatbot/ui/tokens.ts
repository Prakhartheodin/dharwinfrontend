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
//
// The agent reply is FRAMELESS on purpose. The panel is already a container;
// wrapping records in a bordered bubble double-framed every answer (bubble
// border + card border + accent stripe = three edges around one datum).
// One frame only, and it belongs to the record card.
//
// User bubble: brand fill only (Restrained accent). `rounded-xl` is 1rem in
// this repo's tailwind.config (the scale stops at xl; `rounded-2xl` emits no
// CSS). Trailing corner clipped for chat directionality. Padding lives here
// (px-3.5 py-2) so glyphs clear the curve. Inset ring for edge definition
// instead of a purple glow. Text is tinted near-white so it stays >=4.5:1 on
// primary without pure #fff.
//
// Never pair a padded surface with the `max-w-full` utility: app/globals.scss
// has `.max-w-full:not(input)... { padding: 0 !important }`, which beats even
// inline styles. That rule is why the user bubble rendered flush to its edge.
export const SURFACE = {
  card:        "rounded-lg border border-slate-200 bg-white dark:border-slate-700/60 dark:bg-slate-800/50",
  console:     "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
  bubbleAgent: "text-slate-800 dark:text-slate-100",
  bubbleUser:
    "rounded-xl rounded-br-md bg-primary px-3.5 py-2 text-violet-50 " +
    "shadow-[0_1px_2px_rgb(15_23_42_/_0.06)] ring-1 ring-inset ring-white/15 " +
    "dark:shadow-[0_1px_2px_rgb(0_0_0_/_0.35)] dark:ring-white/10 " +
    "selection:bg-white/25 selection:text-white",
} as const;

// Accessible brand ink. `primary` (#845ADF) is 4.66:1 on white — it only
// clears AA at full strength, so it must never carry an opacity modifier on
// text. `violet-700` (7.1:1) is the same hue with headroom; use it wherever
// brand-coloured text sits under 14px.
export const BRAND_INK = "text-violet-700 dark:text-violet-300";

// Containment — every chatbot inner box uses these to prevent overflow.
// `max-w-[100%]`, not `max-w-full`: same CSS, but it dodges the global
// `.max-w-full { padding: 0 !important }` rule (see SURFACE) that was
// silently stripping the padding off every card that used CONTAINMENT.
export const CONTAINMENT = "w-full min-w-0 max-w-[100%] box-border";
export const WRAP_ANYWHERE = "[overflow-wrap:anywhere]";

// Typography scale — five steps: 11 / 12.5 / 13 / 15 / 17.
//
// This replaced a 13-size drift (8.5 … 15px). Half-pixel steps are invisible,
// so they bought no hierarchy while costing all consistency, and nine
// unrelated roles all wore font-mono + uppercase + wide tracking, which meant
// the word "You" carried the same weight as the answer's own title.
//
// `author` was the last mono-uppercase role; it is now plain sans too, and
// only agent turns show it (the user bubble's side + fill already says who
// spoke). Do not add mono-uppercase roles. Hierarchy comes from size + weight.
// 11px is the floor; nothing renders smaller.
export const TYPE = {
  author:   "text-[12.5px] font-semibold text-slate-700 dark:text-slate-200",
  label:    "text-[11px] font-medium text-slate-500 dark:text-slate-400",
  meta:     "text-[11px] text-slate-500 dark:text-slate-400",
  title:    "text-[13px] font-semibold text-slate-900 dark:text-slate-50",
  value:    "min-w-0 flex-1 break-words text-[13px] text-slate-800 dark:text-slate-100",
  body:     "text-[13px] text-slate-800 dark:text-slate-100",
  heading3: "text-[13px] font-semibold text-slate-900 dark:text-slate-50",
  heading2: "text-[15px] font-semibold text-slate-900 dark:text-slate-50",
  heading1: "text-[17px] font-semibold tracking-tight text-slate-900 dark:text-slate-50",
} as const;

// Layout — fullscreen is one centered reading column shared by the thread and
// the composer, so both have the same width and the same left edge. Wide
// structured blocks (tables, card grids) may break out to 64rem from lg up.
export const LAYOUT = {
  column:   "mx-auto w-full max-w-3xl",
  gutter:   "px-4 sm:px-6",
  breakout: "lg:relative lg:left-1/2 lg:w-[min(64rem,calc(100vw-7rem))] lg:max-w-none lg:-translate-x-1/2",
} as const;

// Controls — one icon-button recipe. `header` is a 36px target with an 18px
// glyph; `action` is the 32px ghost button under agent replies.
const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
export const CONTROL = {
  focus: FOCUS_RING,
  header:
    "inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors duration-150 " +
    "hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-35 " +
    "dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 " + FOCUS_RING,
  action:
    "inline-flex h-8 min-w-8 items-center justify-center gap-1.5 rounded-md px-2 text-slate-500 transition-colors duration-150 " +
    "hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 " + FOCUS_RING,
} as const;

export const TABLE_PAGE_SIZE = 10;

// Console animation keyframes — injected once via <ConsoleStyles/>.
//
// Deleted: agent-grid-drift, agent-shimmer, agent-mesh-drift and the
// gradient scrollbar. All four ran forever and conveyed nothing; combined
// with a per-message orbiting conic gradient they left a 20-message thread
// running ~20 concurrent compositor animations for zero information.
//
// What survives is state-bearing only: pulse-ring, dots and the streaming
// caret fire while the agent is actually working, never at rest. `agent-rise`
// runs once when the "Jump to latest" pill appears. Under reduced motion the
// block at the bottom collapses every animation to its end state, which
// leaves the caret static and visible.
//
// Message actions (Copy, …) are quiet: hidden until the turn is hovered or
// focused on pointer devices, always visible on touch (hover: none).
export const CONSOLE_KEYFRAMES = `
@keyframes agent-pulse-ring {
  0% { transform: scale(0.55); opacity: 0.85; }
  100% { transform: scale(1.7); opacity: 0; }
}
@keyframes agent-dot {
  0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-3px); }
}
@keyframes agent-caret {
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
}
@keyframes agent-rise {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.agent-streaming > :last-child:not(ul):not(ol)::after,
.agent-streaming > :is(ul, ol):last-child > li:last-child::after {
  content: "";
  display: inline-block;
  width: 2px;
  height: 1.05em;
  margin-left: 2px;
  vertical-align: -0.15em;
  border-radius: 1px;
  background: rgb(109 40 217);
  animation: agent-caret 1s linear infinite;
}
.dark .agent-streaming > :last-child:not(ul):not(ol)::after,
.dark .agent-streaming > :is(ul, ol):last-child > li:last-child::after { background: rgb(196 181 253); }
.agent-msg-actions { transition: opacity 150ms cubic-bezier(0.16, 1, 0.3, 1); }
@media (hover: hover) {
  .agent-msg:not(:hover):not(:focus-within) .agent-msg-actions { opacity: 0; }
}
.agent-scrollbar { scrollbar-width: thin; scrollbar-color: rgb(203 213 225) transparent; }
.dark .agent-scrollbar { scrollbar-color: rgb(51 65 85) transparent; }
.agent-scrollbar::-webkit-scrollbar { width: 8px; }
.agent-scrollbar::-webkit-scrollbar-track { background: transparent; }
.agent-scrollbar::-webkit-scrollbar-thumb { background: rgb(203 213 225); border-radius: 999px; }
.dark .agent-scrollbar::-webkit-scrollbar-thumb { background: rgb(51 65 85); }
@media (prefers-reduced-motion: reduce) {
  .agent-console *, .agent-console *::before, .agent-console *::after,
  .agent-fab, .agent-fab *, .agent-fab *::before, .agent-fab *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

