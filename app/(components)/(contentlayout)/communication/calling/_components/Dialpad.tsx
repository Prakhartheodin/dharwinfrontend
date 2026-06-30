"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  listOwnedTelephonyNumbers,
  placeTelephonyCall,
  getTelephonySdkToken,
  registerTelephonyBrowserCallIntent,
  type OwnedTelephonyNumber,
  type TelephonyProvider,
} from "@/shared/lib/api/telephony";
import { COUNTRY_PHONE_RULES } from "@/shared/lib/country-phone";

const AGENT_PHONE_KEY = "telephony_agent_phone";
const LEGACY_AGENT_PHONE_KEY = "plivo_agent_phone";
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

// Country dial codes, A–Z; "OTHER" has no usable dial code so it's dropped.
const DIAL_OPTIONS = COUNTRY_PHONE_RULES.filter((c) => c.code !== "OTHER")
  .map((c) => ({ code: c.code, name: c.name, dialCode: c.dialCode }))
  .sort((a, b) => a.name.localeCompare(b.name));

type Mode = "browser" | "phone";
type WebrtcStatus = "idle" | "connecting" | "ready" | "error";
type CallState = "idle" | "ringing" | "connected";
type TwilioCall = import("@twilio/voice-sdk").Call;
type IncomingCallInfo = {
  from: string;
  to: string;
  callSid: string;
};

function isE164(v: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(v.trim());
}

// Plivo returns owned numbers without a leading "+"; E.164 needs it.
function toE164(v: string): string {
  const t = (v || "").trim();
  return t.startsWith("+") ? t : `+${t}`;
}

function fmtElapsed(total: number): string {
  const s = Math.max(0, Math.floor(total));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function apiErr(e: unknown, fallback: string): string {
  const msg =
    e && typeof e === "object" && "response" in e
      ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
      : null;
  return msg || (e instanceof Error ? e.message : fallback);
}

function getTwilioCallParam(call: TwilioCall, key: string): string {
  const c = call as unknown as {
    customParameters?: Map<string, string> | { get?: (name: string) => string | undefined };
    parameters?: Record<string, string | undefined>;
  };
  const custom = c.customParameters;
  const fromCustom = typeof custom?.get === "function" ? custom.get(key) : undefined;
  return fromCustom || c.parameters?.[key] || "";
}

/**
 * Two-mode telephony dialer (Plivo or Twilio via backend facade):
 *  - browser  : WebRTC softphone (browser mic/speakers).
 *  - phone    : click-to-call bridge — rings your phone, then connects to the target.
 */
export default function Dialpad({
  defaultTo,
  embedded = false,
  onCallPlaced,
}: { defaultTo?: string; embedded?: boolean; onCallPlaced?: () => void } = {}) {
  const [mode, setMode] = useState<Mode>("browser");
  const [provider, setProvider] = useState<TelephonyProvider>("plivo");

  const [owned, setOwned] = useState<OwnedTelephonyNumber[]>([]);
  const [ownedLoading, setOwnedLoading] = useState(true);
  const [callerId, setCallerId] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [country, setCountry] = useState("US");
  const [dest, setDest] = useState("+1");
  const [agentCountry, setAgentCountry] = useState("US");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false); // bridge call accepted — lock the button
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  // WebRTC softphone state.
  const plivoRef = useRef<any>(null);
  const twilioDeviceRef = useRef<import("@twilio/voice-sdk").Device | null>(null);
  const twilioCallRef = useRef<TwilioCall | null>(null);
  const incomingTwilioCallRef = useRef<TwilioCall | null>(null);
  const [webrtc, setWebrtc] = useState<WebrtcStatus>("idle");
  const [callState, setCallState] = useState<CallState>("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);
  const [elapsed, setElapsed] = useState(0); // seconds since the call connected
  const [muted, setMuted] = useState(false);

  // ponytail: toll-free numbers are inbound-only — Plivo rejects them as an outbound
  // caller ID, surfacing as "Busy" with no CDR. Keep them out of originating options.
  const voiceNumbers = useMemo(
    () => owned.filter((n) => n.voiceEnabled && n.type !== "tollfree"),
    [owned]
  );

  useEffect(() => {
    setAgentPhone(localStorage.getItem(AGENT_PHONE_KEY) || localStorage.getItem(LEGACY_AGENT_PHONE_KEY) || "");
    (async () => {
      try {
        const res = await listOwnedTelephonyNumbers();
        const nums = res.numbers || [];
        setOwned(nums);
        const firstVoice = nums.find((n) => n.voiceEnabled && n.type !== "tollfree");
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

  // Prefill the dial field from a ?to= deep link (profile click-to-call). Applied
  // once on mount so the user can still edit/clear it afterwards.
  const searchParams = useSearchParams();
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current) return;
    const raw = defaultTo ?? searchParams.get("to");
    if (!raw) return;
    const e164 = toE164(raw.trim());
    if (isE164(e164)) {
      setDest(e164);
      // Sync the country dropdown to the number's dial code (longest prefix
      // wins, so +91 → IN not a shorter match). Without this the selector
      // stays on its default and swapDial would strip the wrong prefix.
      const match = DIAL_OPTIONS.filter((o) => o.dialCode && e164.startsWith(o.dialCode)).sort(
        (a, b) => b.dialCode.length - a.dialCode.length
      )[0];
      if (match) setCountry(match.code);
      prefilledRef.current = true;
    }
  }, [searchParams, defaultTo]);

  const press = useCallback((k: string) => {
    setDest((prev) => (prev === "+" && k !== "+" ? `+${k}` : prev + k));
  }, []);

  const backspace = useCallback(() => {
    setDest((prev) => (prev.length <= 1 ? "+" : prev.slice(0, -1)));
  }, []);

  // --- WebRTC softphone --------------------------------------------------------
  const connectingRef = useRef(false);

  const resetTwilioCallState = useCallback((call?: TwilioCall | null) => {
    if (!call || twilioCallRef.current === call) twilioCallRef.current = null;
    if (!call || incomingTwilioCallRef.current === call) incomingTwilioCallRef.current = null;
    setIncomingCall(null);
    setMuted(false);
    setCallState("idle");
  }, []);

  const attachTwilioCallEvents = useCallback(
    (call: TwilioCall, opts: { incoming?: boolean } = {}) => {
      call.on("accept", () => {
        twilioCallRef.current = call;
        if (opts.incoming) {
          incomingTwilioCallRef.current = null;
          setIncomingCall(null);
        }
        setMuted(false);
        setCallState("connected");
      });
      call.on("disconnect", () => resetTwilioCallState(call));
      call.on("cancel", () => resetTwilioCallState(call));
      call.on("reject", () => resetTwilioCallState(call));
      call.on("error", () => {
        resetTwilioCallState(call);
        setFeedback({ kind: "err", msg: "Call failed" });
      });
    },
    [resetTwilioCallState]
  );

  const connectSoftphone = useCallback(async () => {
    if (plivoRef.current || twilioDeviceRef.current || connectingRef.current) return;
    connectingRef.current = true;
    setWebrtc("connecting");
    setFeedback(null);

    const timeout = window.setTimeout(() => {
      connectingRef.current = false;
      setWebrtc((s) => (s === "ready" ? s : "error"));
      setFeedback((f) =>
        f ?? { kind: "err", msg: "Softphone didn't connect. Page must be HTTPS; check the call-token request, then Retry." }
      );
    }, 60000);

    try {
      const tokenRes = await getTelephonySdkToken();
      const activeProvider = tokenRes.provider === "twilio" ? "twilio" : "plivo";
      setProvider(activeProvider);

      if (activeProvider === "twilio") {
        const { Device } = await import("@twilio/voice-sdk");
        const device = new Device(tokenRes.token, { logLevel: "warn" });
        const markReady = () => {
          window.clearTimeout(timeout);
          connectingRef.current = false;
          setWebrtc("ready");
        };
        device.on("registered", markReady);
        device.on("error", (err) => {
          window.clearTimeout(timeout);
          connectingRef.current = false;
          setWebrtc("error");
          setFeedback({ kind: "err", msg: `Softphone error: ${err?.message || "unknown"}` });
        });
        device.on("incoming", (call) => {
          if (twilioCallRef.current || incomingTwilioCallRef.current) {
            call.reject();
            return;
          }
          const from = getTwilioCallParam(call, "From") || getTwilioCallParam(call, "Caller") || "Unknown caller";
          const to = getTwilioCallParam(call, "To") || callerId || "your work number";
          const callSid = getTwilioCallParam(call, "CallSid");
          incomingTwilioCallRef.current = call;
          setIncomingCall({ from, to, callSid });
          setMuted(false);
          setCallState("ringing");
          setFeedback(null);
          attachTwilioCallEvents(call, { incoming: true });
        });
        twilioDeviceRef.current = device;
        await device.register();
        if (device.state === "registered") markReady();
        return;
      }

      const mod: any = await import("plivo-browser-sdk");
      const Plivo = mod.Plivo || mod.default?.Plivo || mod.default;
      // Default WARN — DEBUG can log the access token / SIP auth. Support flips it
      // on per-browser via localStorage.setItem("plivo_debug","1") to capture logs.
      const debug = localStorage.getItem("plivo_debug") === "1" ? "DEBUG" : "WARN";
      // usePlivoStunServer: ICE needs a STUN server to gather media candidates.
      // (useDefaultAudioDevice is intentionally left default/false: enabling it
      // makes the SDK match output devices and it crashes with "Invalid output
      // device id" when none is selected. The real outbound fix was pointing the
      // caller-ID number's Plivo application at our sdk-answer URL, not this.)
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

      client.loginWithAccessToken(tokenRes.token);
    } catch (e) {
      window.clearTimeout(timeout);
      connectingRef.current = false;
      setWebrtc("error");
      setFeedback({ kind: "err", msg: apiErr(e, "Could not start the softphone") });
    }
  }, [attachTwilioCallEvents, callerId]);

  // Connect on entering browser mode; login persists across toggles.
  useEffect(() => {
    if (mode === "browser") void connectSoftphone();
  }, [mode, connectSoftphone]);

  // Live call timer: tick once a second only while connected; reset otherwise.
  useEffect(() => {
    if (callState !== "connected") {
      setElapsed(0);
      return;
    }
    setElapsed(0);
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [callState]);

  const retrySoftphone = useCallback(() => {
    try {
      plivoRef.current?.client?.logout?.();
      twilioDeviceRef.current?.destroy?.();
    } catch {
      /* ignore */
    }
    plivoRef.current = null;
    twilioDeviceRef.current = null;
    twilioCallRef.current = null;
    incomingTwilioCallRef.current = null;
    setIncomingCall(null);
    connectingRef.current = false;
    setWebrtc("idle");
    void connectSoftphone();
  }, [connectSoftphone]);

  // Tear down the SDK on unmount.
  useEffect(() => {
    return () => {
      try {
        plivoRef.current?.client?.logout?.();
        twilioDeviceRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      plivoRef.current = null;
      twilioDeviceRef.current = null;
      twilioCallRef.current = null;
      incomingTwilioCallRef.current = null;
    };
  }, []);

  const canCall =
    isE164(dest) &&
    isE164(callerId) &&
    !placing &&
    (mode === "browser" ? webrtc === "ready" && callState === "idle" : isE164(agentPhone));

  const handleBrowserCall = useCallback(async () => {
    setFeedback(null);
    setPlacing(true);
    try {
      if (provider === "twilio") {
        const device = twilioDeviceRef.current;
        if (!device) return;
        setCallState("ringing");
        const call = await device.connect({
          params: {
            To: dest.trim(),
            CallerId: callerId,
          },
        });
        twilioCallRef.current = call;
        attachTwilioCallEvents(call);
        return;
      }

      const client = plivoRef.current?.client;
      if (!client) return;
      const { intent } = await registerTelephonyBrowserCallIntent({ toNumber: dest.trim(), callerId });
      setCallState("ringing");
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
  }, [attachTwilioCallEvents, dest, callerId, provider]);

  const acceptIncoming = useCallback(() => {
    const call = incomingTwilioCallRef.current;
    if (!call) return;
    setFeedback(null);
    try {
      call.accept();
    } catch (e) {
      resetTwilioCallState(call);
      setFeedback({ kind: "err", msg: apiErr(e, "Could not answer incoming call") });
    }
  }, [resetTwilioCallState]);

  const rejectIncoming = useCallback(() => {
    const call = incomingTwilioCallRef.current;
    try {
      call?.reject?.();
    } catch {
      /* ignore */
    }
    resetTwilioCallState(call);
  }, [resetTwilioCallState]);

  const hangup = useCallback(() => {
    try {
      if (provider === "twilio") {
        if (incomingTwilioCallRef.current && !twilioCallRef.current) {
          incomingTwilioCallRef.current.reject();
        } else {
          twilioCallRef.current?.disconnect?.();
          twilioDeviceRef.current?.disconnectAll?.();
        }
      } else {
        plivoRef.current?.client?.hangup?.();
      }
    } catch {
      /* ignore */
    }
    twilioCallRef.current = null;
    incomingTwilioCallRef.current = null;
    setIncomingCall(null);
    setMuted(false);
    setCallState("idle");
  }, [provider]);

  // Mute/unmute the live call. Twilio: Call.mute(bool); Plivo: client.mute()/unmute().
  const toggleMute = useCallback(() => {
    const next = !muted;
    try {
      if (provider === "twilio") {
        twilioCallRef.current?.mute?.(next);
      } else if (next) {
        plivoRef.current?.client?.mute?.();
      } else {
        plivoRef.current?.client?.unmute?.();
      }
      setMuted(next);
    } catch {
      /* ignore — leave state unchanged if the SDK rejects */
    }
  }, [muted, provider]);

  const handlePhoneCall = useCallback(async () => {
    setFeedback(null);
    localStorage.setItem(AGENT_PHONE_KEY, agentPhone.trim());
    setPlacing(true);
    try {
      const res = await placeTelephonyCall({
        toNumber: dest.trim(),
        agentPhone: agentPhone.trim(),
        callerId,
      });
      setFeedback({ kind: "ok", msg: res.message || "Call initiated — your phone will ring." });
      setPlaced(true);
      onCallPlaced?.();
    } catch (e) {
      setFeedback({ kind: "err", msg: apiErr(e, "Failed to place call") });
    } finally {
      setPlacing(false);
    }
  }, [dest, agentPhone, callerId, onCallPlaced]);

  // A fresh edit means a new call — unlock the button.
  useEffect(() => {
    setPlaced(false);
  }, [dest, callerId, agentPhone, mode]);

  const onCall = mode === "browser" ? () => void handleBrowserCall() : () => void handlePhoneCall();
  const inCall = mode === "browser" && callState !== "idle";

  return (
    <div className={embedded ? "" : "box custom-box mb-5"}>
      <div
        className={
          embedded
            ? "mb-4 flex items-center justify-end gap-3"
            : "box-header flex items-center justify-between gap-3"
        }
      >
        {!embedded && (
          <div className="box-title flex items-center gap-2">
            <i className="ri-dial-pad-line text-primary" />
            Dialer
          </div>
        )}
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
      <div className={embedded ? "" : "box-body"}>
        <div className={embedded ? "space-y-4" : "grid grid-cols-1 gap-5 md:grid-cols-2"}>
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
                    className="w-full min-w-0 bg-transparent py-2 text-sm focus:outline-none text-defaulttextcolor dark:text-white"
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
                ? "You talk through this browser (mic + speakers). The recipient sees your bought number. Calls are billed to the telephony account."
                : provider === "twilio"
                  ? "Your phone rings first, then connects to the dialed number. The recipient sees your bought number."
                  : "Your phone rings first, then connects to the dialed number. The recipient sees your bought number."}
            </p>
          </div>

          {/* Right: keypad */}
          <div className="space-y-3">
            {embedded && (
              <span className="block text-xs font-medium text-defaulttextcolor/70 dark:text-white/60">
                To (number to call)
              </span>
            )}
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
                className="w-full min-w-0 bg-transparent text-lg font-mono tracking-wide text-defaulttextcolor focus:outline-none dark:text-white"
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

            {!embedded && (
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
            )}

            {incomingCall ? (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.07] p-3">
                <div className="mb-3 flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <i className="ri-phone-line text-lg" />
                  </span>
                  <div className="min-w-0">
                    <p className="mb-0 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      Incoming call
                    </p>
                    <p className="mb-0 truncate text-sm font-semibold text-defaulttextcolor dark:text-white">
                      {incomingCall.from}
                    </p>
                    <p className="mb-0 truncate text-[0.7rem] text-defaulttextcolor/55 dark:text-white/45">
                      To {incomingCall.to}
                      {incomingCall.callSid ? ` · ${incomingCall.callSid}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={rejectIncoming}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-danger py-2.5 text-sm font-semibold text-white transition-colors hover:bg-danger/90"
                  >
                    <i className="ri-phone-fill rotate-[135deg]" />
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={acceptIncoming}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    <i className="ri-phone-fill" />
                    Accept
                  </button>
                </div>
              </div>
            ) : inCall ? (
              <div className="flex items-center gap-2">
                {callState === "connected" ? (
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-pressed={muted}
                    title={muted ? "Unmute" : "Mute"}
                    className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                      muted
                        ? "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-400"
                        : "border-defaultborder/70 text-defaulttextcolor/75 hover:bg-black/[0.03] dark:text-white/70 dark:hover:bg-white/5"
                    }`}
                  >
                    <i className={muted ? "ri-mic-off-line" : "ri-mic-line"} />
                    {muted ? "Muted" : "Mute"}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={hangup}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-danger py-3 text-sm font-semibold text-white transition-colors hover:bg-danger/90"
                >
                  <i className="ri-phone-fill rotate-[135deg]" />
                  {callState === "ringing"
                    ? "Ringing… Hang up"
                    : `Connected ${fmtElapsed(elapsed)} — Hang up`}
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!canCall || placed}
                onClick={onCall}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className={placed ? "ri-check-line" : placing ? "ri-loader-4-line animate-spin" : "ri-phone-line"} />
                {placed ? "Call placed" : placing ? "Calling…" : "Call"}
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
