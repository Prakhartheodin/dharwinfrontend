"use client";

import Swal from "sweetalert2";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  createAssignmentRun,
  type AssignmentRunEnvelope,
  type AssignmentGenerationMeta,
} from "@/shared/lib/api/pmAssistant";

export type { AssignmentGenerationMeta };

/** Self-contained markup + tokens for the long-running assignment Swal (one accent + slate neutrals). */
function assignmentProgressModalHtml(): string {
  return `
<style>
  .pm-assign-root {
    --pm-n50: #f8fafc;
    --pm-n100: #f1f5f9;
    --pm-n200: #e2e8f0;
    --pm-n400: #94a3b8;
    --pm-n600: #475569;
    --pm-n800: #1e293b;
    --pm-n900: #0f172a;
    --pm-a400: #818cf8;
    --pm-a500: #6366f1;
    --pm-a600: #4f46e5;
    --pm-a700: #4338ca;
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    text-align: start;
    color: var(--pm-n800);
  }
  .pm-assign-root * { box-sizing: border-box; }
  .pm-assign-lead {
    margin: 0 0 1rem;
    font-size: 0.875rem;
    line-height: 1.55;
    color: var(--pm-n600);
  }
  .pm-assign-lead strong { color: var(--pm-n900); font-weight: 600; }
  .pm-assign-card {
    border-radius: 0.75rem;
    border: 1px solid var(--pm-n200);
    background: linear-gradient(165deg, var(--pm-n50) 0%, #fff 48%, var(--pm-n100) 100%);
    padding: 1rem 1.1rem 1.05rem;
    box-shadow: 0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -8px rgb(15 23 42 / 0.08);
    animation: pm-assign-card-in 0.5s cubic-bezier(0.34, 1.2, 0.64, 1) both;
  }
  @keyframes pm-assign-card-in {
    from { opacity: 0; transform: translate3d(0, 8px, 0) scale(0.985); }
    to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
  }
  .pm-assign-steps {
    list-style: none;
    margin: 0 0 1rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .pm-assign-step {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    font-size: 0.8125rem;
    line-height: 1.45;
    color: var(--pm-n600);
    padding: 0.45rem 0.55rem;
    border-radius: 0.5rem;
    border: 1px solid transparent;
    background: transparent;
    transition: border-color 0.35s cubic-bezier(0.4, 0, 0.2, 1), background 0.35s cubic-bezier(0.4, 0, 0.2, 1), color 0.25s ease;
  }
  .pm-assign-step-ic {
    flex-shrink: 0;
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 999px;
    border: 2px solid var(--pm-n200);
    display: grid;
    place-items: center;
    margin-top: 0.05rem;
    transition: border-color 0.35s ease, background 0.35s ease, transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  .pm-assign-step-ic svg { width: 0.7rem; height: 0.7rem; color: #fff; opacity: 0; transform: scale(0.5); transition: opacity 0.25s ease, transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1); }
  .pm-assign-step-title { font-weight: 600; color: var(--pm-n800); display: block; margin-bottom: 0.1rem; }
  .pm-assign-step-desc { font-size: 0.75rem; color: var(--pm-n400); margin: 0; }
  .pm-assign-step[data-state="pending"] .pm-assign-step-ic { border-color: var(--pm-n200); background: #fff; }
  .pm-assign-step[data-state="active"] {
    border-color: rgb(99 102 241 / 0.25);
    background: rgb(99 102 241 / 0.06);
    color: var(--pm-n800);
  }
  .pm-assign-step[data-state="active"] .pm-assign-step-ic {
    border-color: var(--pm-a500);
    background: linear-gradient(145deg, var(--pm-a400), var(--pm-a600));
    animation: pm-assign-step-pulse 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  .pm-assign-step[data-state="active"] .pm-assign-step-title { color: var(--pm-a700); }
  .pm-assign-step[data-state="complete"] .pm-assign-step-ic {
    border-color: var(--pm-a600);
    background: var(--pm-a600);
    animation: pm-assign-check-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  .pm-assign-step[data-state="complete"] .pm-assign-step-ic svg { opacity: 1; transform: scale(1); }
  .pm-assign-step[data-state="complete"] .pm-assign-step-title { color: var(--pm-n900); }
  @keyframes pm-assign-step-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgb(99 102 241 / 0.25); }
    50% { box-shadow: 0 0 0 6px rgb(99 102 241 / 0); }
  }
  @keyframes pm-assign-check-pop {
    from { transform: scale(0.85); }
    to { transform: scale(1); }
  }
  .pm-assign-elapsed-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.65rem;
  }
  .pm-assign-elapsed-label {
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--pm-n400);
  }
  .pm-assign-elapsed-val {
    font-variant-numeric: tabular-nums;
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--pm-a600);
    letter-spacing: -0.02em;
  }
  .pm-assign-track {
    position: relative;
    height: 6px;
    border-radius: 999px;
    background: var(--pm-n200);
    overflow: hidden;
  }
  .pm-assign-track-slab {
    position: absolute;
    top: 0;
    left: 0;
    width: min(42%, 11rem);
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--pm-a700), var(--pm-a400), var(--pm-a500));
    box-shadow: 0 0 12px rgb(99 102 241 / 0.35);
    will-change: transform;
    animation: pm-assign-indet 2.4s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }
  @keyframes pm-assign-indet {
    0% { transform: translate3d(-100%, 0, 0); opacity: 0.9; }
    55% { opacity: 1; }
    100% { transform: translate3d(320%, 0, 0); opacity: 0.9; }
  }
  .pm-assign-footnote {
    margin: 0.65rem 0 0;
    font-size: 0.65rem;
    line-height: 1.45;
    color: var(--pm-n400);
  }
  /* Loader: dual rings (counter-rotate) + stagger dots + status copy cycle — transforms/opacity only */
  .pm-assign-loader-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 1.15rem;
    gap: 0.55rem;
  }
  .pm-assign-loader-visual {
    position: relative;
    width: 3.5rem;
    height: 3.5rem;
    display: grid;
    place-items: center;
  }
  .pm-assign-rings-svg {
    width: 3.5rem;
    height: 3.5rem;
    display: block;
    color: var(--pm-a600);
  }
  .pm-assign-ring-outer {
    transform-origin: 28px 28px;
    animation: pm-assign-spin-cw 2.85s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }
  .pm-assign-ring-inner {
    transform-origin: 28px 28px;
    animation: pm-assign-spin-ccw 2.15s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  @keyframes pm-assign-spin-cw {
    to { transform: rotate(360deg); }
  }
  @keyframes pm-assign-spin-ccw {
    to { transform: rotate(-360deg); }
  }
  .pm-assign-dots {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    pointer-events: none;
  }
  .pm-assign-dots span {
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: var(--pm-a600);
    opacity: 0.38;
    will-change: transform, opacity;
    animation: pm-assign-dot 1.05s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
  .pm-assign-dots span:nth-child(2) {
    animation-delay: 0.14s;
    background: var(--pm-a500);
  }
  .pm-assign-dots span:nth-child(3) {
    animation-delay: 0.28s;
  }
  @keyframes pm-assign-dot {
    0%, 72%, 100% {
      opacity: 0.35;
      transform: translate3d(0, 0, 0) scale(1);
    }
    36% {
      opacity: 1;
      transform: translate3d(0, -5px, 0) scale(1.12);
    }
  }
  .pm-assign-loader-kicker {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--pm-n400);
  }
  .pm-assign-msg-wrap {
    position: relative;
    width: 100%;
    min-height: 2.35rem;
    text-align: center;
  }
  .pm-assign-msg {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    margin: 0;
    padding: 0 0.25rem;
    font-size: 0.72rem;
    font-weight: 500;
    line-height: 1.4;
    color: var(--pm-n600);
    animation-duration: 9s;
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    animation-iteration-count: infinite;
    will-change: opacity, transform;
  }
  .pm-assign-msg--a {
    animation-name: pm-assign-msg-a;
  }
  .pm-assign-msg--b {
    animation-name: pm-assign-msg-b;
  }
  .pm-assign-msg--c {
    animation-name: pm-assign-msg-c;
  }
  @keyframes pm-assign-msg-a {
    0%, 24% { opacity: 1; transform: translate3d(0, 0, 0); }
    30%, 100% { opacity: 0; transform: translate3d(0, -6px, 0); }
  }
  @keyframes pm-assign-msg-b {
    0%, 30% { opacity: 0; transform: translate3d(0, 6px, 0); }
    36%, 57% { opacity: 1; transform: translate3d(0, 0, 0); }
    63%, 100% { opacity: 0; transform: translate3d(0, -6px, 0); }
  }
  @keyframes pm-assign-msg-c {
    0%, 63% { opacity: 0; transform: translate3d(0, 6px, 0); }
    69%, 90% { opacity: 1; transform: translate3d(0, 0, 0); }
    96%, 100% { opacity: 0; transform: translate3d(0, -6px, 0); }
  }
  .pm-assign-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  @media (prefers-reduced-motion: reduce) {
    .pm-assign-root .pm-assign-card,
    .pm-assign-root .pm-assign-track-slab,
    .pm-assign-root .pm-assign-step[data-state="active"] .pm-assign-step-ic,
    .pm-assign-root .pm-assign-ring-outer,
    .pm-assign-root .pm-assign-ring-inner,
    .pm-assign-root .pm-assign-dots span,
    .pm-assign-root .pm-assign-msg {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
    .pm-assign-root .pm-assign-card { animation: none; opacity: 1; transform: none; }
    .pm-assign-root .pm-assign-msg--b,
    .pm-assign-root .pm-assign-msg--c { display: none !important; }
    .pm-assign-root .pm-assign-msg--a {
      position: static;
      opacity: 1 !important;
      transform: none !important;
    }
  }
</style>
<div class="pm-assign-root" role="status" aria-live="polite" aria-atomic="true">
  <p class="pm-assign-lead">
    Screening the roster, then matching tasks with the model.
    Typical total time <strong>15–90s</strong>.
  </p>
  <div class="pm-assign-card">
    <ul class="pm-assign-steps" aria-label="Assignment stages">
      <li class="pm-assign-step" id="pm-assign-step-1" data-state="active">
        <span class="pm-assign-step-ic" aria-hidden="true">
          <svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 5l3.5 3.5L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span>
          <span class="pm-assign-step-title">Prepare &amp; screen roster</span>
          <p class="pm-assign-step-desc">Eligibility rules run on the server (same as apply).</p>
        </span>
      </li>
      <li class="pm-assign-step" id="pm-assign-step-2" data-state="pending">
        <span class="pm-assign-step-ic" aria-hidden="true">
          <svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 5l3.5 3.5L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <span>
          <span class="pm-assign-step-title">AI match tasks to candidates</span>
          <p class="pm-assign-step-desc">Model assigns the heaviest work — this is usually most of the wait.</p>
        </span>
      </li>
    </ul>
    <div class="pm-assign-elapsed-row">
      <span class="pm-assign-elapsed-label">Elapsed</span>
      <span id="pm-assign-elapsed" class="pm-assign-elapsed-val" aria-live="polite">0s</span>
    </div>
    <div class="pm-assign-track" aria-hidden="true">
      <div class="pm-assign-track-slab"></div>
    </div>
    <p class="pm-assign-footnote">
      Counts of screened vs excluded from the AI pool appear on the next screen after the run is created.
    </p>
  </div>
  <div class="pm-assign-loader-wrap">
    <span class="pm-assign-loader-kicker">In progress</span>
    <div class="pm-assign-loader-visual" aria-hidden="true">
      <svg class="pm-assign-rings-svg" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g class="pm-assign-ring-outer">
          <circle cx="28" cy="28" r="22" stroke="#c7d2fe" stroke-width="2" />
          <circle cx="28" cy="28" r="22" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="32 106" pathLength="100" />
        </g>
        <g class="pm-assign-ring-inner">
          <circle cx="28" cy="28" r="14" stroke="#e0e7ff" stroke-width="1.75" />
          <circle cx="28" cy="28" r="14" stroke="#6366f1" stroke-width="2" stroke-linecap="round" stroke-dasharray="22 68" pathLength="100" />
        </g>
      </svg>
      <div class="pm-assign-dots"><span></span><span></span><span></span></div>
    </div>
    <div class="pm-assign-msg-wrap" aria-hidden="true">
      <p class="pm-assign-msg pm-assign-msg--a">Matching tasks to the best candidates…</p>
      <p class="pm-assign-msg pm-assign-msg--b">The model is comparing skills, capacity, and fit.</p>
      <p class="pm-assign-msg pm-assign-msg--c">Large rosters can take up to a minute — still on it.</p>
    </div>
    <span class="pm-assign-sr-only">Assignment matching is running. Elapsed seconds update above.</span>
  </div>
</div>`;
}

function readMeta(run: unknown): AssignmentGenerationMeta | null {
  if (!run || typeof run !== "object") return null;
  const gm = (run as { generationMeta?: AssignmentGenerationMeta }).generationMeta;
  if (!gm || typeof gm !== "object") return null;
  return gm;
}

function summaryHtml(meta: AssignmentGenerationMeta | null): string {
  if (!meta || meta.rosterFetched == null) {
    return '<p class="text-sm text-[#8c9097] mb-0">Roster statistics were not returned by the server.</p>';
  }
  const screened = meta.rosterFetched;
  const sent = meta.eligibleForAi ?? 0;
  const cap = meta.excludedAtCapacity ?? 0;
  const mo = meta.excludedMissingOwner ?? 0;
  const notSent = cap + mo;
  const scopeExplain =
    meta.rosterScope === "admin_capacity_filtered"
      ? `<p class="text-[0.7rem] text-[#8c9097] mb-2">Pool = assignees + <strong class="text-defaulttextcolor">${meta.rosterPoolMode === "admin" ? "same-admin candidates" : "all active ATS candidates"}</strong> (cap ${meta.rosterQueryLimit ?? "—"}), then capacity filter.</p>`
      : meta.rosterScope === "project_assignees"
        ? `<p class="text-[0.7rem] text-[#8c9097] mb-2"><strong class="text-defaulttextcolor">Legacy run:</strong> pool was project assignees only (${meta.projectAssigneeCount ?? 0} user(s)).</p>`
        : meta.rosterScope === "admin_fallback"
          ? `<p class="text-[0.7rem] text-[#8c9097] mb-2"><strong class="text-defaulttextcolor">Legacy run:</strong> capped admin shortlist (limit ${meta.adminFallbackLimit ?? "—"}).</p>`
          : "";
  return `<div class="text-start text-[0.8125rem] space-y-2 text-defaulttextcolor">
    <p class="mb-0 font-semibold">Roster screening (same rules as Apply)</p>
    ${scopeExplain}
    <ul class="list-none space-y-1.5 mb-0 ps-0 text-[#8c9097]">
      <li class="flex justify-between gap-2"><span>Checked in pool</span><strong class="text-defaulttextcolor tabular-nums">${screened}</strong></li>
      <li class="flex justify-between gap-2"><span>Sent to AI matcher</span><strong class="text-primary tabular-nums">${sent}</strong></li>
      <li class="flex justify-between gap-2"><span>Not sent (capacity / no user)</span><strong class="text-defaulttextcolor tabular-nums">${notSent}</strong></li>
    </ul>
    <p class="text-[0.7rem] text-[#8c9097] mb-0 border-t border-defaultborder pt-2 mt-2">
      “Not sent” means already on <strong>2+</strong> other active projects as project assignee (elsewhere), unless already on this project — or missing a linked user on the candidate.
    </p>
    ${
      meta.assignmentAllTasksSingleRequest
        ? `<p class="text-[0.7rem] text-[#8c9097] mb-0 pt-2 mt-1">Every task was sent in <strong class="text-defaulttextcolor">one</strong> matcher request. Rows with a <strong class="text-defaulttextcolor">gap</strong> should include a <strong class="text-defaulttextcolor">job draft</strong> for hiring; assigned rows include fit notes (or a short summary if the model left notes blank).</p>`
        : meta.assignmentBatchCount != null && meta.assignmentBatchCount > 1
          ? `<p class="text-[0.7rem] text-[#8c9097] mb-0 pt-2 mt-1">Legacy run: <strong class="text-defaulttextcolor">${meta.assignmentBatchCount}</strong> matcher batches. Open the run for gap notes and job drafts.</p>`
          : `<p class="text-[0.7rem] text-[#8c9097] mb-0 pt-2 mt-1">If a task shows a <strong class="text-defaulttextcolor">gap</strong>, open the run for notes and optional <strong class="text-defaulttextcolor">job draft</strong> to recruit.</p>`
    }
  </div>`;
}

export type AssignmentGenerationUiOptions = {
  afterError?: () => void;
};

/**
 * Opens a non-blocking progress dialog (elapsed timer), runs assignment generation, shows roster summary, navigates to review.
 * Does not await the initial Swal (loader-only dialogs would otherwise deadlock before {@link createAssignmentRun}).
 */
export async function runAssignmentGenerationWithUi(
  projectId: string,
  router: Pick<AppRouterInstance, "push">,
  options?: AssignmentGenerationUiOptions
): Promise<void> {
  const started = Date.now();
  let tick: ReturnType<typeof setInterval> | null = null;
  let stageTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimers = () => {
    if (tick) {
      clearInterval(tick);
      tick = null;
    }
    if (stageTimer) {
      clearTimeout(stageTimer);
      stageTimer = null;
    }
  };

  Swal.fire({
    title: "AI employee assignment",
    html: assignmentProgressModalHtml(),
    width: 520,
    padding: "1.35rem",
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => {
      const step1 = document.getElementById("pm-assign-step-1");
      const step2 = document.getElementById("pm-assign-step-2");
      stageTimer = setTimeout(() => {
        step1?.setAttribute("data-state", "complete");
        step2?.setAttribute("data-state", "active");
      }, 480);
      tick = setInterval(() => {
        const el = document.getElementById("pm-assign-elapsed");
        if (el) {
          const s = Math.floor((Date.now() - started) / 1000);
          el.textContent = `${s}s`;
        }
      }, 400);
    },
    willClose: () => {
      if (stageTimer) {
        clearTimeout(stageTimer);
        stageTimer = null;
      }
      if (tick) {
        clearInterval(tick);
        tick = null;
      }
    },
  });

  try {
    const res: AssignmentRunEnvelope = await createAssignmentRun(projectId);
    clearTimers();
    Swal.close();

    const run = res.run as { _id?: string; id?: string } | undefined;
    const runId = String(run?._id ?? run?.id ?? "");
    if (!runId) throw new Error("Missing run id");

    const meta = readMeta(res.run);

    await Swal.fire({
      icon: "success",
      title: "Assignment run ready",
      html: `${summaryHtml(meta)}<p class="text-xs text-[#8c9097] mt-3 mb-0">Opening the review page…</p>`,
      timer: 2400,
      timerProgressBar: true,
      showConfirmButton: true,
      confirmButtonText: "Open now",
    });

    router.push(`/apps/projects/assignment/${runId}`);
  } catch (err: unknown) {
    clearTimers();
    Swal.close();
    const message =
      (err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
        : undefined) ??
      "Could not start assignment. The project needs at least one task, and your role needs candidates.read (and project access).";
    await Swal.fire({ icon: "warning", title: "AI employee assignment", text: message });
    options?.afterError?.();
  }
}
