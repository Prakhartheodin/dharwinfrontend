"use client";

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { useAuth } from "@/shared/contexts/auth-context";
import { useChatSocket, type IncomingCallData } from "@/shared/contexts/ChatSocketContext";
import { updateCall } from "@/shared/lib/api/chat";

const RING_TIMEOUT_MS = 45 * 1000;
const TITLE_FLASH_CHAT = "Incoming call – Dharwin";
const TITLE_FLASH_SUPPORT_CAM = "Support camera – Dharwin";
/** Served from `public/sounds/ringtone.wav` (generated asset). */
const RINGTONE_SRC = "/sounds/ringtone.wav";
/** OS notifications often truncate; keep body short. */
const NOTIFICATION_BODY_MAX = 140;

function clipNotificationText(text: string, max = NOTIFICATION_BODY_MAX): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function isGroupIncomingCall(data: IncomingCallData): boolean {
  return data.callSource !== "support_camera" && data.conversationType === "group" && Boolean(data.groupName?.trim());
}

function isSupportCameraIncoming(data: IncomingCallData): boolean {
  return data.callSource === "support_camera" && Boolean(data.supportInviteToken?.trim());
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

function GlobalIncomingCallInner() {
  const { user } = useAuth();
  const pathname = usePathname();
  const { onIncomingCall, onCallEnded, incomingCall, setIncomingCall, registerIncomingCallDismiss } = useChatSocket();
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
  const modalRef = useRef<HTMLDivElement>(null);
  const incomingCallRef = useRef<IncomingCallData | null>(null);
  incomingCallRef.current = incomingCall;

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

  const acceptCall = useCallback(() => {
    if (!incomingCall) return;
    if (isSupportCameraIncoming(incomingCall)) {
      const t = incomingCall.supportInviteToken!.trim();
      clearIncomingCall();
      window.open(`/support/camera/join/${encodeURIComponent(t)}`, "_blank", "noopener");
      return;
    }
    const convId = incomingCall.conversationId;
    const callType = incomingCall.callType || "video";
    const params = new URLSearchParams();
    if (convId) params.set("conv", convId);
    params.set("from", "chat");
    if (incomingCall.callId) params.set("callId", incomingCall.callId);
    if (callType === "audio") params.set("video", "0");
    else params.set("video", "1");
    const url = `/meetings/room/${encodeURIComponent(incomingCall.roomName)}?${params.toString()}`;
    clearIncomingCall();
    window.open(url, "_blank", "noopener");
  }, [incomingCall, clearIncomingCall]);

  const declineCall = useCallback(() => {
    const call = incomingCall;
    clearIncomingCall();
    if (call?.callSource === "support_camera") return;
    if (call?.callId) {
      updateCall(call.callId, { status: "declined" }).catch(() => {
        // Call may already be ended; ignore
      });
    }
  }, [incomingCall, clearIncomingCall]);

  // Subscribe to incoming_call (only when user is present). Popup shows only for the callee (person receiving the call).
  useEffect(() => {
    if (!user) return;
    const unsub = onIncomingCall((data) => {
      const rawCaller = data.caller as { id?: string; _id?: string } | undefined;
      const callerId = rawCaller ? String(rawCaller.id ?? rawCaller._id ?? "").trim() : "";
      const myIdNorm = myId;
      // Only skip showing the popup when we are definitely the caller (same user who started the call)
      if (callerId && myIdNorm && callerId === myIdNorm) return;
      ringtonePlayIdRef.current += 1;
      setIncomingCall(data);
      setSoundUnavailable(false);
      setRingtoneErrorMessage(null);
      audioSrcBrokenRef.current = false;

      originalTitleRef.current = typeof document !== "undefined" ? document.title : "";
      if (typeof document !== "undefined") {
        document.title = isSupportCameraIncoming(data) ? TITLE_FLASH_SUPPORT_CAM : TITLE_FLASH_CHAT;
      }

      // Ringtone starts in useLayoutEffect after portal mounts so audioRef is attached.

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
          : data.callType === "audio"
            ? "Incoming voice call"
            : "Incoming video call";
        const callerNm = data.caller?.name ?? "Someone";
        const body = supportCam
          ? clipNotificationText(`${callerNm} is asking you to join a support camera session`)
          : isGroupIncomingCall(data) && data.groupName
            ? clipNotificationText(`${callerNm} is calling you in ${data.groupName}`)
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

  // Subscribe to call_ended to clear when call is ended remotely (e.g. missed)
  useEffect(() => {
    const unsub = onCallEnded((data) => {
      const current = incomingCallRef.current;
      if (current && (data.conversationId === current.conversationId || data.roomName === current.roomName)) {
        clearIncomingCall();
      }
    });
    return unsub;
  }, [onCallEnded, clearIncomingCall]);

  // Sync notification permission when modal is open (e.g. after user grants)
  useEffect(() => {
    if (!incomingCall || typeof window === "undefined" || !("Notification" in window)) return;
    setNotificationPermission(Notification.permission);
  }, [incomingCall]);

  // Focus primary action (accept) when modal opens
  useEffect(() => {
    if (!incomingCall || !modalRef.current) return;
    const acceptBtn = modalRef.current.querySelector<HTMLElement>("#incoming-call-accept");
    acceptBtn?.focus();
  }, [incomingCall]);

  // When incomingCall is cleared (e.g. from global bar Accept/Decline), stop ringtone
  useEffect(() => {
    if (!incomingCall) stopRingtone();
  }, [incomingCall, stopRingtone]);

  /** Same-tab navigation to support camera (e.g. pasted link) leaves incomingCall set — stop ring + UI. */
  useEffect(() => {
    if (!user || !pathname) return;
    const onSupportCameraRoute =
      pathname.startsWith("/support/camera/join") || pathname === "/support/camera/host";
    if (onSupportCameraRoute) {
      clearIncomingCall();
    }
  }, [user, pathname, clearIncomingCall]);

  const requestNotificationPermission = useCallback(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    Notification.requestPermission().then((p) => setNotificationPermission(p));
  }, []);

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

  if (!incomingCall) return <>{ringtoneAudio}</>;

  const supportCam = isSupportCameraIncoming(incomingCall);
  const callLabel = supportCam
    ? "Support camera request"
    : incomingCall.callType === "audio"
      ? "Incoming voice call"
      : "Incoming video call";
  const isVideo = supportCam || incomingCall.callType === "video";
  const callKindShort = supportCam ? "Camera" : isVideo ? "Video" : "Voice";
  const showGroupContext = isGroupIncomingCall(incomingCall);
  const groupDisplayName = incomingCall.groupName?.trim() || "Group";
  const modalDescribedBy = showGroupContext
    ? "incoming-call-desc incoming-call-group-subtitle"
    : "incoming-call-desc";

  const modal = (
    <div
      className="incoming-call-overlay fixed inset-0 z-[10050] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incoming-call-title"
      aria-describedby={modalDescribedBy}
    >
      <style>{`
        @keyframes ic-backdrop-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ic-sheet-in {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ic-stagger-1 { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ic-ring-breathe {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(1.12); opacity: 0.08; }
        }
        @keyframes ic-ring-breathe-2 {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.2); opacity: 0.05; }
        }
        .incoming-call-overlay {
          animation: ic-backdrop-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          background: radial-gradient(ellipse 80% 60% at 50% 40%, rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.88));
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .incoming-call-card {
          animation: ic-sheet-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.06) inset,
            0 24px 48px -12px rgba(0,0,0,0.35),
            0 12px 24px -8px rgba(0,0,0,0.2);
        }
        .ic-stagger-a { animation: ic-stagger-1 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both; }
        .ic-stagger-b { animation: ic-stagger-1 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.12s both; }
        .ic-stagger-c { animation: ic-stagger-1 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both; }
        .ic-avatar-ring-1 { animation: ic-ring-breathe 2.4s ease-in-out infinite; }
        .ic-avatar-ring-2 { animation: ic-ring-breathe-2 2.4s ease-in-out 0.4s infinite; }
        .ic-btn-decline {
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .ic-btn-decline:hover { transform: scale(1.04); }
        .ic-btn-decline:active { transform: scale(0.96); }
        .ic-btn-accept {
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .ic-btn-accept:hover { transform: scale(1.06); }
        .ic-btn-accept:active { transform: scale(0.97); }
        .ic-chip { transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease; }
      `}</style>
      <div
        ref={modalRef}
        className="incoming-call-card relative w-full max-w-[24rem] overflow-hidden rounded-2xl border border-black/[0.06] bg-white dark:border-white/[0.08] dark:bg-[#14151a]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/[0.12] to-transparent dark:from-primary/[0.18]"
          aria-hidden
        />
        <p id="incoming-call-announce" className="sr-only" aria-live="assertive">
          {callLabel} from {incomingCall.caller?.name ?? "Unknown"}
          {showGroupContext ? `, group ${groupDisplayName}` : ""}
          {supportCam ? ". Open the session to share your camera with support." : ""}
        </p>

        <div className="relative px-6 pb-2 pt-8 text-center">
          <div className="ic-stagger-a relative mx-auto mb-5 inline-flex">
            <span
              className="ic-avatar-ring-1 absolute -inset-3 rounded-full bg-primary/25 dark:bg-primary/20"
              aria-hidden
            />
            <span
              className="ic-avatar-ring-2 absolute -inset-5 rounded-full bg-primary/15 dark:bg-primary/10"
              aria-hidden
            />
            <span className="relative flex h-[5.5rem] w-[5.5rem] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200 shadow-inner ring-2 ring-white dark:from-white/10 dark:to-white/5 dark:ring-white/10">
              <img
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(incomingCall.caller?.name || "U")}&size=128&background=f1f5f9&color=334155`}
                alt=""
                className="h-full w-full rounded-full object-cover"
              />
            </span>
          </div>

          <p
            id="incoming-call-desc"
            className="ic-stagger-b mb-2 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-[#64748b] dark:text-white/45"
          >
            <span className="inline-flex items-center justify-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/40 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {supportCam
                ? "Support session · Camera"
                : showGroupContext
                  ? `Incoming group · ${callKindShort}`
                  : `Incoming · ${callKindShort}`}
            </span>
          </p>

          <h2
            id="incoming-call-title"
            className="ic-stagger-b mb-2 text-[1.375rem] font-bold leading-tight tracking-tight text-[#0f172a] dark:text-white sm:text-[1.5rem]"
          >
            {incomingCall.caller?.name || "Unknown"}
          </h2>
          {showGroupContext && (
            <p
              id="incoming-call-group-subtitle"
              className="ic-stagger-b -mt-1 mb-2 truncate px-1 text-sm font-medium text-[#64748b] dark:text-white/55"
              title={groupDisplayName}
            >
              {groupDisplayName}
            </p>
          )}
          <p className="ic-stagger-c mx-auto max-w-[16rem] text-sm leading-relaxed text-[#64748b] dark:text-white/50">
            {supportCam
              ? "Platform support is requesting a consent-based camera session. Accept to open the join page."
              : isVideo
                ? "Video call — answer to join with camera and mic."
                : "Voice call — answer to connect with audio only."}
          </p>
        </div>

        <div className="ic-stagger-c px-6 pb-6 pt-4">
          <div className="flex items-end justify-center gap-8 sm:gap-10">
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                className="ic-btn-decline flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-rose-50 text-rose-600 shadow-md shadow-rose-900/10 ring-1 ring-rose-200/80 dark:bg-rose-950/50 dark:text-rose-400 dark:ring-rose-500/25"
                onClick={declineCall}
                title="Decline"
                aria-label="Decline call"
              >
                <i className="ri-phone-fill text-2xl rotate-[135deg]" aria-hidden />
              </button>
              <span className="text-xs font-medium text-[#64748b] dark:text-white/40">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                id="incoming-call-accept"
                className="ic-btn-accept flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-900/25 ring-2 ring-emerald-300/50 ring-offset-2 ring-offset-white dark:from-emerald-500 dark:to-emerald-700 dark:ring-emerald-400/30 dark:ring-offset-[#14151a]"
                onClick={acceptCall}
                title="Accept"
                aria-label={supportCam ? "Accept support camera session" : isVideo ? "Accept video call" : "Accept voice call"}
              >
                <i
                  className={`text-[1.75rem] leading-none ${isVideo ? "ri-vidicon-fill" : "ri-phone-fill"}`}
                  aria-hidden
                />
              </button>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400/90">Accept</span>
            </div>
          </div>
        </div>

        {(soundUnavailable ||
          ringtoneErrorMessage ||
          (typeof window !== "undefined" &&
            "Notification" in window &&
            notificationPermission !== "granted")) && (
          <div className="border-t border-black/[0.06] bg-neutral-50/90 px-4 py-3 dark:border-white/[0.06] dark:bg-black/20">
            <p className="mb-2 text-center text-[0.6875rem] font-medium uppercase tracking-wider text-[#94a3b8] dark:text-white/35">
              Having trouble?
            </p>
            {ringtoneErrorMessage && (
              <p
                className="mb-2 text-center text-xs leading-snug text-amber-800 dark:text-amber-200/90"
                role="alert"
              >
                {ringtoneErrorMessage}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {soundUnavailable && (
                <button
                  type="button"
                  className="ic-chip inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-[#475569] hover:border-primary/35 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:border-primary/40"
                  onClick={tryPlayRingtone}
                  onKeyDown={(e) => e.key === "Enter" && tryPlayRingtone()}
                >
                  <i className="ri-volume-up-line text-base text-primary" aria-hidden />
                  Play ringtone
                </button>
              )}
              {typeof window !== "undefined" &&
                "Notification" in window &&
                notificationPermission !== "granted" && (
                  <button
                    type="button"
                    className="ic-chip inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-[#475569] hover:border-primary/35 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:border-primary/40"
                    onClick={requestNotificationPermission}
                  >
                    <i className="ri-notification-3-line text-base text-primary" aria-hidden />
                    Notifications
                  </button>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
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

/** Top “signal strip” when there is an incoming call (every page). Syncs countdown with modal ring timeout. */
function IncomingCallBarInner() {
  const { incomingCall, dismissIncomingCall } = useChatSocket();
  const [remainingMs, setRemainingMs] = useState(RING_TIMEOUT_MS);

  useEffect(() => {
    if (!incomingCall) return;
    setRemainingMs(RING_TIMEOUT_MS);
    const started = Date.now();
    const tick = () => setRemainingMs(Math.max(0, RING_TIMEOUT_MS - (Date.now() - started)));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [incomingCall?.callId]);

  const acceptFromBar = useCallback(() => {
    if (!incomingCall) return;
    if (isSupportCameraIncoming(incomingCall)) {
      const t = incomingCall.supportInviteToken!.trim();
      dismissIncomingCall();
      window.open(`/support/camera/join/${encodeURIComponent(t)}`, "_blank", "noopener");
      return;
    }
    const convId = incomingCall.conversationId;
    const callType = incomingCall.callType || "video";
    const params = new URLSearchParams();
    if (convId) params.set("conv", convId);
    params.set("from", "chat");
    if (incomingCall.callId) params.set("callId", incomingCall.callId);
    if (callType === "audio") params.set("video", "0");
    else params.set("video", "1");
    const url = `/meetings/room/${encodeURIComponent(incomingCall.roomName)}?${params.toString()}`;
    dismissIncomingCall();
    window.open(url, "_blank", "noopener");
  }, [incomingCall, dismissIncomingCall]);
  const declineFromBar = useCallback(() => {
    const call = incomingCall;
    dismissIncomingCall();
    if (call?.callSource === "support_camera") return;
    if (call?.callId) updateCall(call.callId, { status: "declined" }).catch(() => {});
  }, [incomingCall, dismissIncomingCall]);

  if (!incomingCall) return null;

  const supportBar = isSupportCameraIncoming(incomingCall);
  const isVideo = supportBar || incomingCall.callType === "video";
  const label = supportBar ? "Support camera" : isVideo ? "Video" : "Voice";
  const progressPct = Math.min(100, Math.max(0, (remainingMs / RING_TIMEOUT_MS) * 100));
  const secsLeft = Math.ceil(remainingMs / 1000);
  const urgent = remainingMs > 0 && remainingMs <= 12_000;
  const callerName = incomingCall.caller?.name ?? "Someone";
  const showGroupBar = isGroupIncomingCall(incomingCall);
  const groupBarName = incomingCall.groupName?.trim() || "Group";
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(callerName)}&size=64&background=f1f5f9&color=334155`;
  const barAriaLabel = supportBar
    ? `Support camera request from ${callerName}`
    : `Incoming ${label.toLowerCase()} call from ${callerName}${
        showGroupBar ? `, group ${groupBarName}` : ""
      }`;

  const bar = (
    <>
      <style>{`
        @keyframes ic-bar-slide-in {
          from { transform: translateY(-100%); opacity: 0.85; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes ic-bar-pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.85); }
        }
        @keyframes ic-bar-shimmer {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(220%); }
        }
        .ic-bar-shell {
          animation: ic-bar-slide-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        .ic-bar-live-dot {
          animation: ic-bar-pulse-dot 1.2s ease-in-out infinite;
        }
        .ic-bar-shimmer-layer {
          animation: ic-bar-shimmer 2.8s ease-in-out infinite;
        }
      `}</style>
      <div
        className="ic-bar-shell fixed left-0 right-0 top-0 z-[10049] overflow-hidden border-b border-slate-200/70 bg-gradient-to-b from-white/97 to-slate-50/95 pt-[env(safe-area-inset-top,0px)] shadow-[0_8px_30px_-8px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/[0.08] dark:from-slate-950/98 dark:to-slate-900/95 dark:shadow-[0_12px_40px_-10px_rgba(0,0,0,0.55)]"
        role="banner"
        aria-live="assertive"
        aria-label={barAriaLabel}
      >
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-[3px] w-full bg-slate-200/80 dark:bg-white/10"
          aria-hidden
        >
          <div
            className={`h-full rounded-r-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-[width] duration-200 ease-linear dark:from-emerald-400 dark:to-teal-500 ${urgent ? "opacity-100" : "opacity-90"}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-emerald-400 via-primary to-teal-600 opacity-90 dark:opacity-100"
          aria-hidden
        />

        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.07] dark:opacity-[0.12]" aria-hidden>
          <div
            className="ic-bar-shimmer-layer absolute -inset-y-8 w-1/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white to-transparent dark:via-white/80"
            style={{ animationDelay: "0.6s" }}
          />
        </div>

        <div className="relative flex min-h-[3.25rem] items-center gap-3 px-3 py-2.5 pl-4 sm:gap-4 sm:px-4 sm:pl-5 sm:py-3">
          <div className="relative shrink-0">
            <span
              className={`absolute -inset-0.5 rounded-full opacity-60 blur-[2px] ${urgent ? "bg-amber-400/50" : "bg-emerald-400/40"}`}
              aria-hidden
            />
            <span className="relative block h-11 w-11 overflow-hidden rounded-full ring-2 ring-white shadow-md dark:ring-slate-800">
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            </span>
            <span
              className="ic-bar-live-dot absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 dark:border-slate-900"
              title="Ringing"
              aria-hidden
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-[0.625rem] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-white/45">
                Live · {supportBar ? "Support camera" : showGroupBar ? `Group ${label}` : label}
              </span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline dark:bg-white/25" aria-hidden />
              <span
                className={`text-[0.625rem] font-semibold tabular-nums tracking-tight ${urgent ? "text-amber-600 dark:text-amber-400" : "text-slate-400 dark:text-white/35"}`}
              >
                {secsLeft > 0 ? `${secsLeft}s left` : "Ending…"}
              </span>
            </div>
            <p className="truncate text-[0.9375rem] font-bold leading-tight tracking-tight text-slate-900 dark:text-white sm:text-base">
              {callerName}
            </p>
            {showGroupBar && (
              <p
                className="truncate text-[0.6875rem] font-semibold text-slate-600 dark:text-white/55"
                title={groupBarName}
              >
                {groupBarName}
              </p>
            )}
            <p className="truncate text-[0.6875rem] text-slate-500 dark:text-white/40">
              {supportBar
                ? "Support session opens in a new tab"
                : isVideo
                  ? "Video meeting opens in a new tab"
                  : "Voice only — opens in a new tab"}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="flex rounded-full border border-slate-200/90 bg-white/80 p-0.5 shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
              <button
                type="button"
                className="inline-flex h-9 min-w-[2.25rem] items-center justify-center gap-1 rounded-full px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 sm:px-3 dark:text-white/80 dark:hover:bg-rose-950/50 dark:hover:text-rose-300"
                onClick={declineFromBar}
                aria-label="Decline call"
              >
                <i className="ri-phone-fill rotate-[135deg] text-base text-rose-500 sm:text-sm" />
                <span className="hidden sm:inline">Decline</span>
              </button>
              <button
                type="button"
                className="inline-flex h-9 min-w-[2.25rem] items-center justify-center gap-1 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 px-2.5 text-xs font-semibold text-white shadow-md shadow-emerald-900/15 transition hover:from-emerald-400 hover:to-teal-500 sm:px-3.5 dark:shadow-emerald-950/40"
                onClick={acceptFromBar}
                aria-label={supportBar ? "Accept support camera session" : isVideo ? "Accept video call" : "Accept voice call"}
              >
                <i
                  className={`text-base sm:text-sm ${isVideo ? "ri-vidicon-fill" : "ri-phone-fill"}`}
                  aria-hidden
                />
                <span className="hidden sm:inline">Accept</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
  return typeof document !== "undefined" ? createPortal(bar, document.body) : null;
}

export function IncomingCallBar() {
  return <IncomingCallBarInner />;
}
