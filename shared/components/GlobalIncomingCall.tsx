"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useAuth } from "@/shared/contexts/auth-context";
import { useChatSocket, type IncomingCallData } from "@/shared/contexts/ChatSocketContext";
import {
  isTerminalOutgoingStatus,
  OUTGOING_TERMINAL_DISMISS_MS,
  outgoingCallCopy,
  RING_TIMEOUT_MS,
} from "@/shared/components/chat-call/callState";
import {
  CallActionButton,
  CallAvatar,
  CallSheet,
  CallUiStyles,
  RingCountdownBar,
  useDialogKeyboard,
  useRingCountdown,
} from "@/shared/components/chat-call/CallDialogs";

const TITLE_FLASH_CHAT = "Incoming call – Dharwin";
const TITLE_FLASH_SUPPORT_CAM = "Support camera – Dharwin";
/** Served from `public/sounds/ringtone.wav` (generated asset). */
const RINGTONE_SRC = "/sounds/ringtone.wav";
/** OS notifications often truncate; keep body short. */
const NOTIFICATION_BODY_MAX = 140;
/** Hang-up glyph: remixicon has no phone-off, so the phone is rotated. */
const HANGUP_ICON = "ri-phone-fill rotate-[135deg]";

function clipNotificationText(text: string, max = NOTIFICATION_BODY_MAX): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function isGroupIncomingCall(data: IncomingCallData): boolean {
  if (data.callSource === "support_camera") return false;
  if (data.callScope === "group") return true;
  return data.conversationType === "group";
}

function isSupportCameraIncoming(data: IncomingCallData): boolean {
  return data.callSource === "support_camera" && Boolean(data.supportInviteToken?.trim());
}

/** Already inside a call page — ring as a non-modal bar instead of covering the call. */
function isInCallRoute(pathname: string | null | undefined): boolean {
  const p = pathname ?? "";
  return p.startsWith("/meetings/room/") || p.startsWith("/join/room/");
}

/** Copy shared by the modal and the bar. */
function incomingCallCopy(call: IncomingCallData) {
  const supportCam = isSupportCameraIncoming(call);
  const group = isGroupIncomingCall(call);
  const isVideo = supportCam || call.callType === "video";
  const callerName = call.caller?.name?.trim() || "Unknown caller";
  const groupName = call.groupName?.trim() || "Group";
  const kind = isVideo ? "video" : "audio";
  const label = supportCam
    ? "Support camera request"
    : group
      ? `Incoming group ${kind} call`
      : `Incoming ${kind} call`;
  const acceptLabel = supportCam ? "Open" : group ? "Join" : "Accept";
  const acceptAria = supportCam
    ? "Open support camera session"
    : `${group ? "Join group" : "Accept"} ${kind} call from ${callerName}`;
  return { supportCam, group, isVideo, callerName, groupName, label, acceptLabel, acceptAria };
}

type SyntheticRingRefs = {
  ctx: AudioContext | null;
  intervalId: ReturnType<typeof setInterval> | null;
};

function stopSyntheticRing(refs: React.MutableRefObject<SyntheticRingRefs>) {
  const { ctx, intervalId } = refs.current;
  if (intervalId != null) {
    clearInterval(intervalId);
    refs.current.intervalId = null;
  }
  if (ctx) {
    ctx.close().catch(() => {});
    refs.current.ctx = null;
  }
}

/**
 * Classic dual-tone burst; repeats on interval until stopped.
 * `playId` / `playIdRef` drop any in-flight work after accept/decline (async gap before setInterval).
 */
async function startSyntheticRing(
  refs: React.MutableRefObject<SyntheticRingRefs>,
  playId: number,
  playIdRef: React.MutableRefObject<number>
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return false;

  stopSyntheticRing(refs);
  const ctx = new AC();
  refs.current.ctx = ctx;

  const playBurst = () => {
    const now = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.13, now + 0.025);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    for (const hz of [440, 480]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(hz, now);
      o.connect(g);
      o.start(now);
      o.stop(now + 0.35);
    }
  };

  await ctx.resume();
  if (playIdRef.current !== playId) {
    await ctx.close().catch(() => {});
    refs.current.ctx = null;
    return false;
  }
  playBurst();
  refs.current.intervalId = setInterval(() => {
    if (playIdRef.current !== playId) {
      if (refs.current.intervalId != null) clearInterval(refs.current.intervalId);
      refs.current.intervalId = null;
      return;
    }
    if (ctx.state === "suspended") void ctx.resume();
    playBurst();
  }, 2800);
  return true;
}

/** Pill buttons in the "Having trouble?" strip — 44 px tall. */
const HELP_CHIP_CLASS =
  "inline-flex h-11 items-center gap-1.5 rounded-full border border-defaultborder bg-white px-4 text-xs font-medium text-defaulttextcolor transition-colors duration-200 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:border-white/10 dark:bg-white/5 dark:text-white/80";

function GlobalIncomingCallInner() {
  const { user } = useAuth();
  const pathname = usePathname();
  const {
    onIncomingCall,
    onCallEnded,
    incomingCall,
    setIncomingCall,
    registerIncomingCallDismiss,
    acceptIncomingCall,
    declineIncomingCall,
  } = useChatSocket();
  const [soundUnavailable, setSoundUnavailable] = useState(false);
  const [ringtoneErrorMessage, setRingtoneErrorMessage] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : null
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Skip HTMLAudio when src failed to load (e.g. 404) so user gesture goes straight to Web Audio. */
  const audioSrcBrokenRef = useRef(false);
  const syntheticRingRef = useRef<SyntheticRingRefs>({ ctx: null, intervalId: null });
  /** Bumped on each incoming event and on dismiss; invalidates async tryPlayRingtone / synthetic ring. */
  const ringtonePlayIdRef = useRef(0);
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const originalTitleRef = useRef<string>("");
  const notificationRef = useRef<Notification | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const acceptBtnRef = useRef<HTMLButtonElement>(null);
  const incomingCallRef = useRef<IncomingCallData | null>(null);
  incomingCallRef.current = incomingCall;
  const remainingMs = useRingCountdown(incomingCall?.callId);

  // Match backend caller.id (from req.user.id); prefer `id` over legacy `_id`.
  const myId = String((user as { id?: string; _id?: string })?.id ?? (user as { _id?: string })?._id ?? "").trim();

  const stopRingtone = useCallback(() => {
    stopSyntheticRing(syntheticRingRef);
    if (audioRef.current) {
      try {
        const a = audioRef.current;
        a.loop = false;
        a.pause();
        a.currentTime = 0;
        a.pause();
        a.load();
      } catch {
        // ignore
      }
    }
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
    if (notificationRef.current) {
      try {
        notificationRef.current.close();
      } catch {
        // ignore
      }
      notificationRef.current = null;
    }
    if (typeof document !== "undefined" && originalTitleRef.current) {
      document.title = originalTitleRef.current;
    }
  }, []);

  /** Every terminal path (accept, decline, cancel, dismiss, timeout, call_ended) ends here. */
  const clearIncomingCall = useCallback(() => {
    ringtonePlayIdRef.current += 1;
    stopRingtone();
    queueMicrotask(() => {
      stopRingtone();
    });
    setTimeout(() => {
      stopRingtone();
    }, 0);
    setIncomingCall(null);
    setSoundUnavailable(false);
    setRingtoneErrorMessage(null);
    audioSrcBrokenRef.current = false;
  }, [setIncomingCall, stopRingtone]);

  useLayoutEffect(() => {
    registerIncomingCallDismiss(clearIncomingCall);
    return () => registerIncomingCallDismiss(null);
  }, [clearIncomingCall, registerIncomingCallDismiss]);

  const tryPlayRingtone = useCallback(async () => {
    const playId = ringtonePlayIdRef.current;
    stopSyntheticRing(syntheticRingRef);
    setRingtoneErrorMessage(null);
    const audio = audioRef.current;

    if (audio && !audioSrcBrokenRef.current) {
      try {
        if (audio.error) audio.load();
        audio.loop = true;
        audio.currentTime = 0;
        await audio.play();
        if (ringtonePlayIdRef.current !== playId) {
          try {
            audio.loop = false;
            audio.pause();
            audio.currentTime = 0;
            audio.pause();
          } catch {
            // ignore
          }
          return;
        }
        setSoundUnavailable(false);
        return;
      } catch (err: unknown) {
        const name = err && typeof err === "object" && "name" in err ? (err as { name: string }).name : "";
        if (name === "NotAllowedError") setSoundUnavailable(true);
        else setSoundUnavailable(false);
      }
    }

    if (ringtonePlayIdRef.current !== playId) return;

    try {
      const ok = await startSyntheticRing(syntheticRingRef, playId, ringtonePlayIdRef);
      if (ok && ringtonePlayIdRef.current === playId) {
        setSoundUnavailable(false);
        return;
      }
    } catch {
      // fall through to error message
    }

    if (ringtonePlayIdRef.current !== playId) return;

    setSoundUnavailable(true);
    setRingtoneErrorMessage(
      "Could not play ringtone. Check volume, browser permissions, and that sound is not muted for this tab."
    );
  }, []);

  // Subscribe to incoming calls (only when user is present). Popup shows only for the callee.
  useEffect(() => {
    if (!user) return;
    const unsub = onIncomingCall((data) => {
      const rawCaller = data.caller as { id?: string; _id?: string } | undefined;
      const callerId = rawCaller ? String(rawCaller.id ?? rawCaller._id ?? "").trim() : "";
      // Only skip showing the popup when we are definitely the caller (same user who started the call)
      if (callerId && myId && callerId === myId) return;
      ringtonePlayIdRef.current += 1;
      setIncomingCall(data);
      setSoundUnavailable(false);
      setRingtoneErrorMessage(null);
      audioSrcBrokenRef.current = false;

      originalTitleRef.current = typeof document !== "undefined" ? document.title : "";
      if (typeof document !== "undefined") {
        document.title = isSupportCameraIncoming(data) ? TITLE_FLASH_SUPPORT_CAM : TITLE_FLASH_CHAT;
      }

      // Ringtone starts in useLayoutEffect after the portal mounts so audioRef is attached.

      // Browser notification when tab is in background (request permission if needed)
      if (typeof document !== "undefined" && document.visibilityState === "hidden" && "Notification" in window) {
        const showNotification = (title: string, body: string, tag: string) => {
          try {
            const n = new Notification(title, {
              body,
              tag,
              icon: "/favicon.ico",
            });
            notificationRef.current = n;
            n.onclick = () => {
              window.focus();
              n.close();
              notificationRef.current = null;
            };
          } catch {
            // ignore
          }
        };
        const supportCam = isSupportCameraIncoming(data);
        const title = supportCam
          ? "Support camera request"
          : isGroupIncomingCall(data)
            ? "Incoming group call"
            : data.callType === "audio"
              ? "Incoming voice call"
              : "Incoming video call";
        const callerNm = data.caller?.name ?? "Someone";
        const body = supportCam
          ? clipNotificationText(`${callerNm} is asking you to join a support camera session`)
          : isGroupIncomingCall(data)
            ? clipNotificationText(
                data.groupName
                  ? `${callerNm} started a group call in ${data.groupName}`
                  : `${callerNm} started a group call`
              )
            : clipNotificationText(`${callerNm} is calling you`);
        const tag = supportCam ? `support-cam-${data.supportInviteToken}` : `incoming-call-${data.callId}`;
        if (Notification.permission === "granted") {
          showNotification(title, body, tag);
        } else if (Notification.permission === "default") {
          Notification.requestPermission().then((permission) => {
            if (permission === "granted") showNotification(title, body, tag);
          });
        }
      }

      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = setTimeout(() => {
        ringTimeoutRef.current = null;
        clearIncomingCall();
      }, RING_TIMEOUT_MS);
    });
    return () => {
      unsub();
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
    };
  }, [user, myId, onIncomingCall, setIncomingCall, clearIncomingCall]);

  // Start ring after modal + <audio> exist (avoids null ref when firing from socket handler).
  useLayoutEffect(() => {
    if (!incomingCall) return;
    void tryPlayRingtone();
  }, [incomingCall?.callId, tryPlayRingtone]);

  // Call ended remotely (e.g. missed) — stop ringing.
  useEffect(() => {
    const unsub = onCallEnded((data) => {
      const current = incomingCallRef.current;
      if (current && (data.conversationId === current.conversationId || data.roomName === current.roomName)) {
        clearIncomingCall();
      }
    });
    return unsub;
  }, [onCallEnded, clearIncomingCall]);

  // Sync notification permission when the modal is open (e.g. after user grants)
  useEffect(() => {
    if (!incomingCall || typeof window === "undefined" || !("Notification" in window)) return;
    setNotificationPermission(Notification.permission);
  }, [incomingCall]);

  // When incomingCall is cleared from anywhere (bar, context, socket), stop the ringtone.
  useEffect(() => {
    if (!incomingCall) stopRingtone();
  }, [incomingCall, stopRingtone]);

  /** Same-tab navigation to support camera (e.g. pasted link) leaves incomingCall set — stop ring + UI. */
  useEffect(() => {
    if (!user || !pathname) return;
    const onSupportCameraRoute = pathname.startsWith("/support/camera/join") || pathname === "/support/camera/host";
    if (onSupportCameraRoute) {
      clearIncomingCall();
    }
  }, [user, pathname, clearIncomingCall]);

  const requestNotificationPermission = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    Notification.requestPermission().then((p) => setNotificationPermission(p));
  }, []);

  const showModal = Boolean(user && incomingCall && !isInCallRoute(pathname));
  useDialogKeyboard(dialogRef, acceptBtnRef, showModal, {
    onEscape: declineIncomingCall,
    onEnter: acceptIncomingCall,
  });

  if (!user) return null;

  const ringtoneAudio = (
    <audio
      ref={audioRef}
      loop
      playsInline
      preload="auto"
      src={RINGTONE_SRC}
      hidden
      aria-hidden
      onError={() => {
        audioSrcBrokenRef.current = true;
        setSoundUnavailable(true);
      }}
    />
  );

  if (!incomingCall || !showModal) return <>{ringtoneAudio}</>;

  const copy = incomingCallCopy(incomingCall);
  const secsLeft = Math.ceil(remainingMs / 1000);
  const participantHint =
    copy.group && incomingCall.participantCount != null && incomingCall.participantCount > 0
      ? `${incomingCall.participantCount} participant${incomingCall.participantCount === 1 ? "" : "s"}`
      : null;
  const showNotifChip =
    typeof window !== "undefined" && "Notification" in window && notificationPermission !== "granted";

  const modal = (
    <>
      <CallUiStyles />
      <CallSheet rootRef={dialogRef} labelledBy="incoming-call-title" describedBy="incoming-call-desc">
        <RingCountdownBar remainingMs={remainingMs} />
        <div className="px-6 pt-10 text-center">
          <div className="mb-6 flex justify-center">
            <CallAvatar name={copy.callerName} ringing icon={copy.group ? "ri-group-line" : undefined} />
          </div>
          <h2
            id="incoming-call-title"
            className="truncate text-2xl font-semibold tracking-tight text-defaulttextcolor dark:text-white"
          >
            {copy.callerName}
          </h2>
          <p id="incoming-call-desc" className="mt-1 text-sm text-[#64748b] dark:text-white/60">
            <i className={`${copy.isVideo ? "ri-vidicon-line" : "ri-phone-line"} me-1 align-[-2px]`} aria-hidden />
            {copy.label}
            {copy.group ? ` · ${copy.groupName}` : ""}
          </p>
          {participantHint && <p className="mt-0.5 text-xs text-[#64748b] dark:text-white/50">{participantHint}</p>}
          {copy.supportCam && (
            <p className="mx-auto mt-2 max-w-[18rem] text-xs leading-relaxed text-[#64748b] dark:text-white/50">
              Platform support is requesting a consent-based camera session.
            </p>
          )}
          <p className="mt-3 text-xs tabular-nums text-[#64748b] dark:text-white/50" aria-hidden>
            {secsLeft > 0 ? `Ringing · ${secsLeft}s` : "Ending…"}
          </p>
        </div>

        <div className="mt-8 flex items-start justify-center gap-16 px-6">
          <CallActionButton
            kind="decline"
            label="Decline"
            ariaLabel={`Decline call from ${copy.callerName}`}
            icon={HANGUP_ICON}
            onClick={declineIncomingCall}
          />
          <CallActionButton
            kind="accept"
            id="incoming-call-accept"
            buttonRef={acceptBtnRef}
            label={copy.acceptLabel}
            ariaLabel={copy.acceptAria}
            icon={copy.isVideo ? "ri-vidicon-fill" : "ri-phone-fill"}
            onClick={acceptIncomingCall}
          />
        </div>
        <p className="mt-5 hidden text-center text-[11px] text-[#94a3b8] dark:text-white/40 sm:block" aria-hidden>
          Enter to answer · Esc to decline
        </p>

        {(soundUnavailable || ringtoneErrorMessage || showNotifChip) && (
          <div className="mx-6 mt-5 border-t border-defaultborder pt-4 dark:border-white/10">
            {ringtoneErrorMessage && (
              <p className="mb-3 text-center text-xs leading-snug text-warning" role="alert">
                {ringtoneErrorMessage}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {soundUnavailable && (
                <button type="button" className={HELP_CHIP_CLASS} onClick={() => void tryPlayRingtone()}>
                  <i className="ri-volume-up-line text-base text-primary" aria-hidden />
                  Play ringtone
                </button>
              )}
              {showNotifChip && (
                <button type="button" className={HELP_CHIP_CLASS} onClick={requestNotificationPermission}>
                  <i className="ri-notification-3-line text-base text-primary" aria-hidden />
                  Enable call notifications
                </button>
              )}
            </div>
          </div>
        )}
      </CallSheet>
    </>
  );

  return (
    <>
      {ringtoneAudio}
      {typeof document !== "undefined" && createPortal(modal, document.body)}
    </>
  );
}

/** Global incoming call overlay; mount inside ChatSocketProvider. Only renders when user is logged in. */
export function GlobalIncomingCall() {
  return <GlobalIncomingCallInner />;
}

/**
 * Compact incoming-call bar, shown instead of the modal while the user is already on a call
 * page (so the ongoing call is not covered). Same actions and copy as the modal.
 */
function IncomingCallBarInner() {
  const pathname = usePathname();
  const { incomingCall, acceptIncomingCall, declineIncomingCall } = useChatSocket();
  const remainingMs = useRingCountdown(incomingCall?.callId);

  if (!incomingCall || !isInCallRoute(pathname)) return null;

  const copy = incomingCallCopy(incomingCall);
  const secsLeft = Math.ceil(remainingMs / 1000);
  const pct = Math.min(100, Math.max(0, (remainingMs / RING_TIMEOUT_MS) * 100));

  const bar = (
    <>
      <CallUiStyles />
      <div
        className="cc-bar fixed inset-x-0 top-0 z-[10049] border-b border-defaultborder bg-white/95 pt-[env(safe-area-inset-top,0px)] shadow-lg backdrop-blur dark:border-white/10 dark:bg-bodybg2/95"
        role="region"
        aria-label={`${copy.label} from ${copy.callerName}`}
      >
        <p className="sr-only" aria-live="assertive">
          {copy.label} from {copy.callerName}
        </p>
        <div className="relative flex items-center gap-3 px-4 py-2">
          <CallAvatar name={copy.callerName} size="sm" ringing icon={copy.group ? "ri-group-line" : undefined} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-defaulttextcolor dark:text-white">{copy.callerName}</p>
            <p className="truncate text-xs text-[#64748b] dark:text-white/60">
              {copy.label}
              {copy.group ? ` · ${copy.groupName}` : ""}
              <span className="tabular-nums" aria-hidden>
                {secsLeft > 0 ? ` · ${secsLeft}s` : ""}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={declineIncomingCall}
              aria-label={`Decline call from ${copy.callerName}`}
              className="inline-flex h-11 min-w-[2.75rem] items-center justify-center gap-1.5 rounded-full bg-danger px-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-danger/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-danger/40 sm:px-4"
            >
              <i className={`${HANGUP_ICON} text-lg`} aria-hidden />
              <span className="hidden sm:inline">Decline</span>
            </button>
            <button
              type="button"
              onClick={acceptIncomingCall}
              aria-label={copy.acceptAria}
              className="inline-flex h-11 min-w-[2.75rem] items-center justify-center gap-1.5 rounded-full bg-success px-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-success/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-success/40 sm:px-4"
            >
              <i className={`${copy.isVideo ? "ri-vidicon-fill" : "ri-phone-fill"} text-lg`} aria-hidden />
              <span className="hidden sm:inline">{copy.acceptLabel}</span>
            </button>
          </div>
        </div>
        <div className="h-1 w-full bg-black/5 dark:bg-white/10" aria-hidden>
          <div
            className="h-full bg-success transition-[width] duration-200 ease-linear motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </>
  );
  return typeof document !== "undefined" ? createPortal(bar, document.body) : null;
}

export function IncomingCallBar() {
  return <IncomingCallBarInner />;
}

const TERMINAL_ICON: Record<string, string> = {
  declined: "ri-close-circle-line",
  no_answer: "ri-time-line",
  cancelled: "ri-phone-line",
  failed: "ri-error-warning-line",
};

function GlobalOutgoingCallInner() {
  const { user } = useAuth();
  const { outgoingCall, clearOutgoingCall, cancelOutgoingCall } = useChatSocket();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const status = outgoingCall?.status ?? null;
  const terminal = isTerminalOutgoingStatus(status);
  const ringKey = outgoingCall ? outgoingCall.callId ?? `conv:${outgoingCall.conversationId}` : null;
  // Keyed on the conversation (not the callId) so the countdown doesn't restart when the ack lands.
  const countdownKey = outgoingCall && status === "calling" ? `conv:${outgoingCall.conversationId}` : null;
  const remainingMs = useRingCountdown(countdownKey);

  // No-answer timeout: after the ring window, cancel with reason 'timeout' (server records no_answer).
  useEffect(() => {
    if (status !== "calling" || !countdownKey) return;
    const t = setTimeout(() => cancelOutgoingCall("timeout"), RING_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [status, countdownKey, cancelOutgoingCall]);

  // Terminal states close themselves after a moment.
  useEffect(() => {
    if (!terminal) return;
    const t = setTimeout(() => clearOutgoingCall(), OUTGOING_TERMINAL_DISMISS_MS);
    return () => clearTimeout(t);
  }, [terminal, ringKey, clearOutgoingCall]);

  // The Cancel button unmounts when the call ends — keep keyboard focus inside the dialog.
  useEffect(() => {
    if (terminal) closeBtnRef.current?.focus();
  }, [terminal]);

  const open = Boolean(user && outgoingCall);
  useDialogKeyboard(dialogRef, cancelBtnRef, open, {
    onEscape: () => (terminal ? clearOutgoingCall() : cancelOutgoingCall()),
  });

  if (!user || !outgoingCall || !status) return null;

  const isVideo = outgoingCall.callType === "video";
  const isGroup = outgoingCall.callScope === "group";
  const name = isGroup ? outgoingCall.groupName?.trim() || "Group" : outgoingCall.calleeName;
  const { headline, statusLine } = outgoingCallCopy({ status, isGroup, isVideo, name, error: outgoingCall.error });
  const displayName = name.trim() || "Contact";
  const statusTone =
    terminal && (status === "failed" || status === "declined") ? "text-danger" : "text-[#64748b] dark:text-white/60";

  const modal = (
    <>
      <CallUiStyles />
      <CallSheet rootRef={dialogRef} labelledBy="outgoing-call-title" describedBy="outgoing-call-status">
        {!terminal && <RingCountdownBar remainingMs={remainingMs} />}
        <div className="px-6 pt-10 text-center">
          <div className="mb-6 flex justify-center">
            <CallAvatar name={displayName} ringing={!terminal} icon={isGroup ? "ri-group-line" : undefined} />
          </div>
          <h2
            id="outgoing-call-title"
            className="truncate text-2xl font-semibold tracking-tight text-defaulttextcolor dark:text-white"
          >
            {terminal ? displayName : headline}
          </h2>
          <p
            id="outgoing-call-status"
            aria-live="polite"
            className={`mt-1 inline-flex items-center justify-center gap-1.5 text-sm ${statusTone}`}
          >
            <i
              className={terminal ? TERMINAL_ICON[status] ?? "ri-phone-line" : isVideo ? "ri-vidicon-line" : "ri-phone-line"}
              aria-hidden
            />
            <span>{terminal ? `${headline}. ${statusLine}` : statusLine}</span>
          </p>
        </div>

        <div className="mt-8 flex justify-center px-6">
          {terminal ? (
            <button
              ref={closeBtnRef}
              type="button"
              onClick={clearOutgoingCall}
              className="inline-flex h-11 min-w-[7rem] items-center justify-center rounded-full bg-black/5 px-6 text-sm font-semibold text-defaulttextcolor transition-colors duration-200 hover:bg-black/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
            >
              Close
            </button>
          ) : (
            <CallActionButton
              kind="decline"
              label="Cancel"
              ariaLabel={`Cancel call to ${displayName}`}
              icon={HANGUP_ICON}
              buttonRef={cancelBtnRef}
              onClick={() => cancelOutgoingCall()}
            />
          )}
        </div>
      </CallSheet>
    </>
  );

  return typeof document !== "undefined" ? createPortal(modal, document.body) : null;
}

/** Global outgoing (caller) call overlay; mount inside ChatSocketProvider. */
export function GlobalOutgoingCall() {
  return <GlobalOutgoingCallInner />;
}

/** Transient call notice ("This call has ended"). Polite live region; never steals focus. */
export function CallNoticeToast() {
  const { callNotice, clearCallNotice } = useChatSocket();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[10060] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      {callNotice && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-defaultborder bg-white py-0.5 pe-0.5 ps-4 text-sm font-medium text-defaulttextcolor shadow-xl dark:border-white/10 dark:bg-bodybg2 dark:text-white">
          <i className="ri-phone-line text-base text-danger" aria-hidden />
          <span>{callNotice}</span>
          <button
            type="button"
            onClick={clearCallNotice}
            aria-label="Dismiss"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[#64748b] transition-colors duration-200 hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-white/60 dark:hover:bg-white/10"
          >
            <i className="ri-close-line text-lg" aria-hidden />
          </button>
        </div>
      )}
    </div>,
    document.body
  );
}
