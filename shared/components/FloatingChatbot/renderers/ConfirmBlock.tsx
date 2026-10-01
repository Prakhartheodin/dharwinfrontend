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
import { BRAND_INK, Callout, CONTAINMENT, CONTROL, SURFACE, TYPE, WRAP_ANYWHERE } from "../ui";
import { EXPIRED_TEXT, expiryLabel, serverSettlesExpired } from "./confirmExpiry.js";

export type ConfirmResolved = NonNullable<ConfirmBlock["resolved"]>;

/** FloatingChatbot provides this to write a settled card back into the stored message. */
export const ConfirmResolveContext = createContext<(key: string, resolved: ConfirmResolved) => void>(() => {});

const TICK_MS = 15_000;
// A task plan can list up to 60 titles; show this many until asked.
const LINES_SHOWN = 8;
// One focus recipe for both buttons; the offset keeps the ring visible on the filled Confirm.
const BUTTON_FOCUS = `${CONTROL.focus} focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900`;
// Backend lines that start with "• " are items under the line above (e.g. each recipient).
const SUB_ITEM = /^•\s*/;

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

  if (serverSettlesExpired(httpStatus, status)) return settle("expired", EXPIRED_TEXT);
  if (httpStatus === 403 || httpStatus === 404) return settle("failed", message || "This action is not available.");
  if (httpStatus < 300 || httpStatus === 409 || httpStatus >= 500) {
    if (status === "done" || status === "failed" || status === "cancelled") return settle(status, message);
  }
  // 409 `executing` (another tab is running it), 429, or a 5xx with no stored outcome:
  // leave Confirm live; the next click returns the real stored result.
  if (httpStatus === 429) return { note: "Too many requests — try again in a moment." };
  return { note: message || "Something went wrong. Try again in a moment." };
}

export function ConfirmBlockView({ block }: { block: ConfirmBlock }) {
  const onResolve = useContext(ConfirmResolveContext);
  const [now, setNow] = useState(() => Date.now());
  // A laptop clock must not write expired into stored state. Only the server settles that.
  const [resolved, setResolved] = useState<ConfirmResolved | null>(block.resolved ?? null);
  const [busy, setBusy] = useState<Op | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const inFlight = useRef(false);

  const label = expiryLabel(block.expiresAt, now);

  useEffect(() => {
    if (resolved) return;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [resolved]);

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

  const hidden = showAll ? 0 : Math.max(0, block.lines.length - LINES_SHOWN);
  const lines = hidden ? block.lines.slice(0, LINES_SHOWN) : block.lines;

  return (
    <div className={`space-y-2.5 px-3.5 py-3 ${SURFACE.card} ${CONTAINMENT} ${WRAP_ANYWHERE}`}>
      <div className="space-y-1">
        <p className={TYPE.title}>{block.title}</p>
        {!resolved && (
          <p className={`text-[11px] font-medium ${BRAND_INK}`}>
            Draft · nothing is sent or changed until you confirm
            {label && <span className="font-normal text-slate-500 dark:text-slate-400"> · {label}</span>}
          </p>
        )}
      </div>

      {lines.length > 0 && (
        <ul className={`ml-4 list-disc space-y-0.5 marker:text-slate-400 ${TYPE.body}`}>
          {lines.map((line, i) =>
            SUB_ITEM.test(line) ? (
              <li key={i} className="ml-4 list-[circle]">{line.replace(SUB_ITEM, "")}</li>
            ) : (
              <li key={i}>{line}</li>
            )
          )}
        </ul>
      )}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className={`rounded text-[12.5px] font-medium ${BRAND_INK} hover:underline ${CONTROL.focus}`}
        >
          Show {hidden} more
        </button>
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
            className={`inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50 ${BUTTON_FOCUS}`}
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
            className={`inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:bg-slate-800 ${BUTTON_FOCUS}`}
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
