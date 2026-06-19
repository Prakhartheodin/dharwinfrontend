"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  listOwnedPlivoNumbers,
  placePlivoCall,
  getPlivoSdkToken,
  registerPlivoBrowserCallIntent,
  type OwnedPlivoNumber,
} from "@/shared/lib/api/plivo";
import { COUNTRY_PHONE_RULES } from "@/shared/lib/country-phone";

const AGENT_PHONE_KEY = "plivo_agent_phone";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

// Country dial codes, A–Z; "OTHER" has no usable dial code so it's dropped.
const DIAL_OPTIONS = COUNTRY_PHONE_RULES.filter((c) => c.code !== "OTHER")
  .map((c) => ({ code: c.code, name: c.name, dialCode: c.dialCode }))
  .sort((a, b) => a.name.localeCompare(b.name));

type Mode = "browser" | "phone";
type WebrtcStatus = "idle" | "connecting" | "ready" | "error";
type CallState = "idle" | "ringing" | "connected";

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
 * Two-mode Plivo dialer:
 *  - browser  : WebRTC softphone (plivo-browser-sdk). Talk through the laptop mic/speakers.
 *  - phone    : click-to-call bridge. Plivo rings your phone, then connects to the target.
 * Both show the chosen bought number as caller ID and are billed to the Plivo account.
 */
export default function Dialpad() {
  const [mode, setMode] = useState<Mode>("browser");

  const [owned, setOwned] = useState<OwnedPlivoNumber[]>([]);
  const [ownedLoading, setOwnedLoading] = useState(true);
  const [callerId, setCallerId] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [country, setCountry] = useState("US");
  const [dest, setDest] = useState("+1");
  const [agentCountry, setAgentCountry] = useState("US");
  const [placing, setPlacing] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // WebRTC softphone state.
  const plivoRef = useRef<any>(null);
  const [webrtc, setWebrtc] = useState<WebrtcStatus>("idle");
  const [callState, setCallState] = useState<CallState>("idle");

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

  const press = useCallback((k: string) => {
    setDest((prev) => (prev === "+" && k !== "+" ? `+${k}` : prev + k));
  }, []);

  const backspace = useCallback(() => {
    setDest((prev) => (prev.length <= 1 ? "+" : prev.slice(0, -1)));
  }, []);

  // --- WebRTC softphone --------------------------------------------------------
  const connectingRef = useRef(false);

  const connectSoftphone = useCallback(async () => {
    if (plivoRef.current || connectingRef.current) return;
    connectingRef.current = true;
    setWebrtc("connecting");
    setFeedback(null);

    // Don't spin forever: surface an actionable error if login never resolves
    // (slow token endpoint, blocked WebRTC, http page) after 60s.
    const timeout = window.setTimeout(() => {
      connectingRef.current = false;
      setWebrtc((s) => (s === "ready" ? s : "error"));
      setFeedback((f) =>
        f ?? { kind: "err", msg: "Softphone didn't connect. Page must be HTTPS; check the call-token request, then Retry." }
      );
    }, 60000);

    try {
      const mod: any = await import("plivo-browser-sdk");
      const Plivo = mod.Plivo || mod.default?.Plivo || mod.default;
      // Default WARN — DEBUG can log the access token / SIP auth. Support flips it
      // on per-browser via localStorage.setItem("plivo_debug","1") to capture logs.
      const debug = localStorage.getItem("plivo_debug") === "1" ? "DEBUG" : "WARN";
      // usePlivoStunServer: ICE needs a STUN server to gather media candidates.
      // Without it the INVITE can reach Plivo with no usable media path → call
      // rejected in "DELAYED NEGOTIATION" before the answer_url is ever fetched.
      const p = new Plivo({ debug, permOnClick: true, enableTracking: false, usePlivoStunServer: true });
      const client = p.client;
      const markReady = () => {
        window.clearTimeout(timeout);
        connectingRef.current = false;
        setWebrtc("ready");
      };
      client.on("onLogin", markReady);
      client.on("onReady", markReady);
      client.on("onLoginFailed", (e: string) => {
        window.clearTimeout(timeout);
        connectingRef.current = false;
        setWebrtc("error");
        setFeedback({ kind: "err", msg: `Softphone login failed: ${e || "unknown"}` });
      });
      // Browser-level WebRTC block (Brave Shields, no WebRTC support) — login can
      // still succeed over WSS but media never starts, so the call silently dies.
      // Surface it instead of hanging on "Connecting…".
      client.on("onWebrtcNotSupported", () => {
        window.clearTimeout(timeout);
        connectingRef.current = false;
        setWebrtc("error");
        setFeedback({
          kind: "err",
          msg: "WebRTC is blocked by this browser. In Brave, turn off Shields for this site (or use Chrome), then Retry.",
        });
      });
      // Mic permission denied/blocked — same silent-death cause.
      client.on("onMediaPermission", (perm: { audio?: boolean } | boolean) => {
        const granted = typeof perm === "boolean" ? perm : perm?.audio !== false;
        if (!granted) {
          setFeedback({
            kind: "err",
            msg: "Microphone access is blocked. Allow the mic for this site, then Retry.",
          });
        }
      });
      client.on("onCallRemoteRinging", () => setCallState("ringing"));
      client.on("onCallAnswered", () => setCallState("connected"));
      client.on("onCallTerminated", () => setCallState("idle"));
      client.on("onCallFailed", (e: string) => {
        setCallState("idle");
        setFeedback({ kind: "err", msg: `Call failed: ${e || "unknown"}` });
      });
      plivoRef.current = p;

      const { token } = await getPlivoSdkToken();
      client.loginWithAccessToken(token);
    } catch (e) {
      window.clearTimeout(timeout);
      connectingRef.current = false;
      setWebrtc("error");
      setFeedback({ kind: "err", msg: apiErr(e, "Could not start the softphone") });
    }
  }, []);

  // Connect on entering browser mode; login persists across toggles.
  useEffect(() => {
    if (mode === "browser") void connectSoftphone();
  }, [mode, connectSoftphone]);

  const retrySoftphone = useCallback(() => {
    try {
      plivoRef.current?.client?.logout?.();
    } catch {
      /* ignore */
    }
    plivoRef.current = null;
    connectingRef.current = false;
    setWebrtc("idle");
    void connectSoftphone();
  }, [connectSoftphone]);

  // Tear down the SDK on unmount.
  useEffect(() => {
    return () => {
      try {
        plivoRef.current?.client?.logout?.();
      } catch {
        /* ignore */
      }
      plivoRef.current = null;
    };
  }, []);

  const canCall =
    isE164(dest) &&
    isE164(callerId) &&
    !placing &&
    (mode === "browser" ? webrtc === "ready" && callState === "idle" : isE164(agentPhone));

  const handleBrowserCall = useCallback(async () => {
    const client = plivoRef.current?.client;
    if (!client) return;
    setFeedback(null);
    setPlacing(true);
    try {
      // Plivo often omits X-PH-callerId on sdk-answer; register intent server-side first.
      const { intent } = await registerPlivoBrowserCallIntent({ toNumber: dest.trim(), callerId });
      setCallState("ringing");
      // X-PH-* headers may reach sdk-answer; intent token is stateless across Render instances.
      client.call(dest.trim(), {
        "X-PH-callerId": callerId.replace(/\D/g, ""),
        "X-PH-intent": intent,
      });
    } catch (e) {
      setCallState("idle");
      setFeedback({ kind: "err", msg: apiErr(e, "Could not start browser call") });
    } finally {
      setPlacing(false);
    }
  }, [dest, callerId]);

  const hangup = useCallback(() => {
    try {
      plivoRef.current?.client?.hangup?.();
    } catch {
      /* ignore */
    }
    setCallState("idle");
  }, []);

  const handlePhoneCall = useCallback(async () => {
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

  const onCall = mode === "browser" ? () => void handleBrowserCall() : () => void handlePhoneCall();
  const inCall = mode === "browser" && callState !== "idle";

  return (
    <div className="box custom-box mb-5">
      <div className="box-header flex items-center justify-between gap-3">
        <div className="box-title flex items-center gap-2">
          <i className="ri-dial-pad-line text-primary" />
          Dialer
        </div>
        {/* Mode toggle: browser audio vs ring-my-phone */}
        <div className="inline-flex rounded-lg border border-defaultborder/70 p-0.5 dark:border-white/10">
          {(["browser", "phone"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              disabled={inCall}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                mode === m
                  ? "bg-primary text-white"
                  : "text-defaulttextcolor/70 hover:bg-black/[0.03] dark:text-white/70 dark:hover:bg-white/5"
              }`}
            >
              <i className={`${m === "browser" ? "ri-computer-line" : "ri-smartphone-line"} me-1`} />
              {m === "browser" ? "Browser" : "My phone"}
            </button>
          ))}
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

            {mode === "phone" ? (
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
              </label>
            ) : (
              <div className="flex items-center gap-2 text-xs">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
                    webrtc === "ready"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : webrtc === "error"
                        ? "bg-danger/10 text-danger"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  <i
                    className={
                      webrtc === "ready"
                        ? "ri-mic-line"
                        : webrtc === "error"
                          ? "ri-error-warning-line"
                          : "ri-loader-4-line animate-spin"
                    }
                  />
                  {webrtc === "ready"
                    ? "Softphone ready"
                    : webrtc === "error"
                      ? "Softphone offline"
                      : "Connecting softphone…"}
                </span>
                {webrtc === "error" ? (
                  <button
                    type="button"
                    onClick={retrySoftphone}
                    className="inline-flex items-center gap-1 rounded-full border border-defaultborder/70 px-2.5 py-1 font-semibold text-defaulttextcolor/75 transition-colors hover:bg-black/[0.03] dark:text-white/70 dark:hover:bg-white/5"
                  >
                    <i className="ri-refresh-line" />
                    Retry
                  </button>
                ) : null}
              </div>
            )}

            <p className="text-[0.7rem] leading-relaxed text-defaulttextcolor/55 dark:text-white/45">
              {mode === "browser"
                ? "You talk through this browser (mic + speakers). The recipient sees your bought number. Calls are billed to the Plivo account."
                : "Plivo rings your phone, then connects you to the dialed number. The recipient sees your bought number. Calls are billed to the Plivo account."}
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

            {inCall ? (
              <button
                type="button"
                onClick={hangup}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-danger py-3 text-sm font-semibold text-white transition-colors hover:bg-danger/90"
              >
                <i className="ri-phone-fill rotate-[135deg]" />
                {callState === "ringing" ? "Ringing… Hang up" : "Connected — Hang up"}
              </button>
            ) : (
              <button
                type="button"
                disabled={!canCall}
                onClick={onCall}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className={placing ? "ri-loader-4-line animate-spin" : "ri-phone-line"} />
                {placing ? "Calling…" : "Call"}
              </button>
            )}

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
