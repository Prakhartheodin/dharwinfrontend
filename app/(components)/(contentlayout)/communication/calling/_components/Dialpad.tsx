"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  listOwnedPlivoNumbers,
  placePlivoCall,
  type OwnedPlivoNumber,
} from "@/shared/lib/api/plivo";
import { COUNTRY_PHONE_RULES } from "@/shared/lib/country-phone";

const AGENT_PHONE_KEY = "plivo_agent_phone";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

// Country dial codes, A–Z; "OTHER" has no usable dial code so it's dropped.
const DIAL_OPTIONS = COUNTRY_PHONE_RULES.filter((c) => c.code !== "OTHER")
  .map((c) => ({ code: c.code, name: c.name, dialCode: c.dialCode }))
  .sort((a, b) => a.name.localeCompare(b.name));

function isE164(v: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(v.trim());
}

// Plivo returns owned numbers without a leading "+"; E.164 needs it.
function toE164(v: string): string {
  const t = (v || "").trim();
  return t.startsWith("+") ? t : `+${t}`;
}

function apiErr(e: unknown, fallback: string): string {
  const msg =
    e && typeof e === "object" && "response" in e
      ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
      : null;
  return msg || (e instanceof Error ? e.message : fallback);
}

/**
 * Click-to-call dialer. Plivo rings the agent's own phone first, then bridges to
 * the dialed number showing a bought number as caller ID — so there's no in-browser
 * audio to manage. Numbers to call FROM are the voice-enabled ones bought in Settings.
 */
export default function Dialpad() {
  const [owned, setOwned] = useState<OwnedPlivoNumber[]>([]);
  const [ownedLoading, setOwnedLoading] = useState(true);
  const [callerId, setCallerId] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [country, setCountry] = useState("US");
  const [dest, setDest] = useState("+1");
  const [placing, setPlacing] = useState(false);

  const [agentCountry, setAgentCountry] = useState("US");

  // Swap a dial-code prefix on a field, keeping any national digits already typed.
  const swapDial = useCallback(
    (prevCode: string, nextCode: string, set: React.Dispatch<React.SetStateAction<string>>) => {
      const next = DIAL_OPTIONS.find((o) => o.code === nextCode);
      if (!next) return;
      const prev = DIAL_OPTIONS.find((o) => o.code === prevCode);
      set((d) => {
        const national = prev && d.startsWith(prev.dialCode) ? d.slice(prev.dialCode.length) : "";
        return next.dialCode + national;
      });
    },
    []
  );

  const handleCountry = useCallback(
    (code: string) => {
      swapDial(country, code, setDest);
      setCountry(code);
    },
    [country, swapDial]
  );

  const handleAgentCountry = useCallback(
    (code: string) => {
      swapDial(agentCountry, code, setAgentPhone);
      setAgentCountry(code);
    },
    [agentCountry, swapDial]
  );
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // Voice-capable bought numbers are the only valid caller IDs.
  const voiceNumbers = useMemo(() => owned.filter((n) => n.voiceEnabled), [owned]);

  useEffect(() => {
    setAgentPhone(localStorage.getItem(AGENT_PHONE_KEY) || "");
    (async () => {
      try {
        const res = await listOwnedPlivoNumbers();
        const nums = res.numbers || [];
        setOwned(nums);
        const firstVoice = nums.find((n) => n.voiceEnabled);
        if (firstVoice) setCallerId(toE164(firstVoice.number));
      } catch {
        /* surfaced via the "no numbers" hint below */
      } finally {
        setOwnedLoading(false);
      }
    })();
  }, []);

  const press = useCallback((k: string) => {
    setDest((prev) => (prev === "+" && k !== "+" ? `+${k}` : prev + k));
  }, []);

  const backspace = useCallback(() => {
    setDest((prev) => (prev.length <= 1 ? "+" : prev.slice(0, -1)));
  }, []);

  const canCall = isE164(dest) && isE164(agentPhone) && isE164(callerId) && !placing;

  const handleCall = useCallback(async () => {
    setFeedback(null);
    localStorage.setItem(AGENT_PHONE_KEY, agentPhone.trim());
    setPlacing(true);
    try {
      const res = await placePlivoCall({
        toNumber: dest.trim(),
        agentPhone: agentPhone.trim(),
        callerId,
      });
      setFeedback({ kind: "ok", msg: res.message || "Call initiated — your phone will ring." });
    } catch (e) {
      setFeedback({ kind: "err", msg: apiErr(e, "Failed to place call") });
    } finally {
      setPlacing(false);
    }
  }, [dest, agentPhone, callerId]);

  return (
    <div className="box custom-box mb-5">
      <div className="box-header">
        <div className="box-title flex items-center gap-2">
          <i className="ri-dial-pad-line text-primary" />
          Dialer
        </div>
      </div>
      <div className="box-body">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Left: setup */}
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-defaulttextcolor/70 dark:text-white/60">
                Call from (caller ID)
              </span>
              {ownedLoading ? (
                <div className="text-sm text-defaulttextcolor/50">Loading your numbers…</div>
              ) : voiceNumbers.length === 0 ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                  No voice-enabled numbers yet.{" "}
                  <Link href="/settings/company-email" className="font-semibold underline">
                    Buy a work number
                  </Link>{" "}
                  to call.
                </div>
              ) : (
                <select
                  className="form-select w-full rounded-lg border-defaultborder/70 bg-white text-sm dark:bg-black/20 dark:text-white"
                  value={callerId}
                  onChange={(e) => setCallerId(e.target.value)}
                >
                  {voiceNumbers.map((n) => (
                    <option key={n.number} value={toE164(n.number)}>
                      {toE164(n.number)}
                      {n.alias ? ` — ${n.alias}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-defaulttextcolor/70 dark:text-white/60">
                Your phone (rings first)
              </span>
              <div className="flex items-center gap-2 rounded-lg border border-defaultborder/70 bg-white px-2 dark:border-white/10 dark:bg-black/20">
                <select
                  className="shrink-0 rounded-md border-0 bg-transparent py-2 text-sm font-medium text-defaulttextcolor focus:outline-none dark:text-white"
                  value={agentCountry}
                  onChange={(e) => handleAgentCountry(e.target.value)}
                  aria-label="Your phone country dial code"
                  title="Country dial code"
                >
                  {DIAL_OPTIONS.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.code} {o.dialCode}
                    </option>
                  ))}
                </select>
                <span className="h-5 w-px shrink-0 bg-defaultborder/70 dark:bg-white/10" aria-hidden />
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="+14155550100"
                  className="w-full bg-transparent py-2 text-sm focus:outline-none text-defaulttextcolor dark:text-white"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                />
              </div>
              {agentPhone && !isE164(agentPhone) ? (
                <span className="mt-1 block text-[0.7rem] text-danger">Use E.164 format, e.g. +14155550100</span>
              ) : null}
            </label>

            <p className="text-[0.7rem] leading-relaxed text-defaulttextcolor/55 dark:text-white/45">
              Plivo rings your phone, then connects you to the dialed number. The recipient sees
              your bought number. Calls are billed to the Plivo account.
            </p>
          </div>

          {/* Right: keypad */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg border border-defaultborder/70 bg-white px-2 py-2 dark:border-white/10 dark:bg-black/20">
              <select
                className="shrink-0 rounded-md border-0 bg-transparent text-sm font-medium text-defaulttextcolor focus:outline-none dark:text-white"
                value={country}
                onChange={(e) => handleCountry(e.target.value)}
                aria-label="Country dial code"
                title="Country dial code"
              >
                {DIAL_OPTIONS.map((o) => (
                  <option key={o.code} value={o.code}>
                    {o.code} {o.dialCode}
                  </option>
                ))}
              </select>
              <span className="h-5 w-px shrink-0 bg-defaultborder/70 dark:bg-white/10" aria-hidden />
              <input
                type="tel"
                inputMode="tel"
                className="w-full bg-transparent text-lg font-mono tracking-wide text-defaulttextcolor focus:outline-none dark:text-white"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                aria-label="Number to dial"
              />
              <button
                type="button"
                onClick={backspace}
                className="shrink-0 text-defaulttextcolor/60 hover:text-danger"
                aria-label="Backspace"
              >
                <i className="ri-delete-back-2-line text-lg" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => press(k)}
                  className="rounded-lg border border-defaultborder/70 py-3 text-lg font-semibold text-defaulttextcolor transition-colors hover:bg-primary/10 hover:border-primary/40 dark:text-white dark:hover:bg-white/5"
                >
                  {k}
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={!canCall}
              onClick={() => void handleCall()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className={placing ? "ri-loader-4-line animate-spin" : "ri-phone-line"} />
              {placing ? "Calling…" : "Call"}
            </button>

            {feedback ? (
              <div
                className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${
                  feedback.kind === "ok"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-danger/10 text-danger"
                }`}
                role="status"
              >
                <i
                  className={`mt-0.5 ${feedback.kind === "ok" ? "ri-check-line" : "ri-error-warning-line"}`}
                />
                <span>{feedback.msg}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
