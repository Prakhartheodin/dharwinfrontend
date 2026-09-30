"use client";

// Sage write draft. Confirm / Cancel call the actions API directly — no chat
// message, no LLM round trip. The backend's atomic claim makes a retry or a
// second tab safe (it answers 409 with the stored result), so the card only
// has to show what the server says.

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ConfirmBlock, ConfirmOutcome, Tone } from "@/shared/types/chatResponse";
import {
  cancelSageAction,
  confirmSageAction,
  type SageActionResult,
} from "@/shared/lib/api/chatAssistant";
import { Callout, CONTAINMENT, CONTROL, SURFACE, TYPE, WRAP_ANYWHERE } from "../ui";

export type ConfirmResolved = NonNullable<ConfirmBlock["resolved"]>;

/** FloatingChatbot provides this to write a settled card back into the stored message. */
export const ConfirmResolveContext = createContext<(key: string, resolved: ConfirmResolved) => void>(() => {});

const EXPIRED_TEXT = "This draft expired — ask Sage again";
const TICK_MS = 15_000;

const OUTCOME_TONE: Record<ConfirmOutcome, Tone> = {
  done: "success",
  failed: "danger",
  cancelled: "neutral",
  expired: "neutral",
};

const DEFAULT_MESSAGE: Record<ConfirmOutcome, string> = {
  done: "Done.",
  failed: "The action failed.",
  cancelled: "Cancelled.",
  expired: EXPIRED_TEXT,
};

type Op = "confirm" | "cancel";

/** A settled outcome, or a note when the card should stay confirmable (retry is safe). */
function interpret(r: SageActionResult): { resolved: ConfirmResolved } | { note: string } {
  const settle = (state: ConfirmOutcome, message?: string) => ({
    resolved: { state, message: message || DEFAULT_MESSAGE[state] },
  });
  const { httpStatus, status, message } = r;

  if (httpStatus === 410) return settle("expired", EXPIRED_TEXT);
  if (httpStatus === 403 || httpStatus === 404) return settle("failed", message || "This action is not available.");
  if (httpStatus < 300 || httpStatus === 409 || httpStatus >= 500) {
    if (status === "done" || status === "failed" || status === "cancelled") return settle(status, message);
    if (status === "expired") return settle("expired", EXPIRED_TEXT);
  }
  // 409 `executing` (another tab is running it), 429, or a 5xx with no stored outcome:
  // leave Confirm live; the next click returns the real stored result.
  if (httpStatus === 429) return { note: "Too many requests — try again in a moment." };
  return { note: message || "Something went wrong. Try again in a moment." };
}

function msLeft(expiresAt: string, now: number): number | null {
  const t = Date.parse(expiresAt);
  return Number.isNaN(t) ? null : t - now;
}

function expiryText(ms: number): string {
  if (ms < 60_000) return "expires in under a minute";
  return `expires in ${Math.ceil(ms / 60_000)} min`;
}

export function ConfirmBlockView({ block }: { block: ConfirmBlock }) {
  const onResolve = useContext(ConfirmResolveContext);
  const [now, setNow] = useState(() => Date.now());
  const [resolved, setResolved] = useState<ConfirmResolved | null>(() => {
    if (block.resolved) return block.resolved;
    const left = msLeft(block.expiresAt, Date.now());
    return left !== null && left <= 0 ? { state: "expired", message: EXPIRED_TEXT } : null;
  });
  const [busy, setBusy] = useState<Op | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const inFlight = useRef(false);

  const left = msLeft(block.expiresAt, now);

  useEffect(() => {
    if (resolved) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [resolved]);

  // Clock ran out while the card sat pending: expire without a call. A request
  // already in flight decides for itself.
  useEffect(() => {
    if (resolved || busy || left === null || left > 0) return;
    const r: ConfirmResolved = { state: "expired", message: EXPIRED_TEXT };
    setResolved(r);
    onResolve(block.key, r);
  }, [resolved, busy, left, block.key, onResolve]);

  const run = async (op: Op) => {
    if (inFlight.current || resolved) return;
    inFlight.current = true;
    setBusy(op);
    setNote(null);
    try {
      const out = interpret(await (op === "confirm" ? confirmSageAction(block.key) : cancelSageAction(block.key)));
      if ("resolved" in out) {
        setResolved(out.resolved);
        onResolve(block.key, out.resolved);
      } else {
        setNote(out.note);
      }
    } catch {
      setNote("Couldn't reach the server. Try again.");
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

  const count = block.targetCount;
  const people = `${count} ${count === 1 ? "person" : "people"}`;

  return (
    <div className={`space-y-2.5 px-3.5 py-3 ${SURFACE.card} ${CONTAINMENT} ${WRAP_ANYWHERE}`}>
      <div className="space-y-1">
        <p className={TYPE.title}>{block.title}</p>
        <p className={TYPE.meta}>
          {people}
          {!resolved && left !== null && left > 0 && <> · {expiryText(left)}</>}
        </p>
      </div>

      {block.lines.length > 0 && (
        <ul className={`ml-4 list-disc space-y-0.5 marker:text-slate-400 ${TYPE.body}`}>
          {block.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}

      <div role="status" aria-live="polite">
        {resolved ? (
          <Callout tone={OUTCOME_TONE[resolved.state]} md={resolved.message} />
        ) : (
          note && <p className="text-[12.5px] text-rose-700 dark:text-rose-300">{note}</p>
        )}
      </div>

      {!resolved && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => run("confirm")}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-slate-900"
          >
            {busy === "confirm" && (
              <span
                aria-hidden
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white motion-reduce:animate-none"
              />
            )}
            {busy === "confirm" ? "Confirming…" : block.confirmLabel || "Confirm"}
          </button>
          <button
            type="button"
            onClick={() => run("cancel")}
            disabled={busy !== null}
            className={`inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800 ${CONTROL.focus}`}
          >
            {busy === "cancel" && (
              <span
                aria-hidden
                className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 motion-reduce:animate-none dark:border-slate-600 dark:border-t-slate-200"
              />
            )}
            {busy === "cancel" ? "Cancelling…" : "Cancel"}
          </button>
        </div>
      )}
    </div>
  );
}

export default ConfirmBlockView;
