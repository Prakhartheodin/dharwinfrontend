"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  useLocalParticipant,
  useRemoteParticipants,
  useConnectionState,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, ConnectionState, type RemoteParticipant } from "livekit-client";
import { exchangeSupportCameraInviteToken } from "@/shared/lib/api/support-camera-invite";
import Link from "next/link";
import { ROUTES } from "@/shared/lib/constants";
import { useLiveKitBenignErrorSuppression } from "@/shared/lib/livekit-benign-logs";

type Props = {
  inviteToken: string;
  mode: "host" | "guest";
};

function remoteHasVisibleCamera(r: RemoteParticipant) {
  const pub = r.getTrackPublication(Track.Source.Camera);
  if (!pub || pub.isMuted) return false;
  return Boolean(pub.track);
}

/** Live context strip directly under the page header — status, participants, where to tap. */
function SupportSessionSubheader({ mode }: { mode: "host" | "guest" }) {
  const { localParticipant } = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const connectionState = useConnectionState();

  const isGuest = mode === "guest";
  const isConnecting =
    connectionState === ConnectionState.Connecting || connectionState === ConnectionState.Reconnecting;
  const isConnected = connectionState === ConnectionState.Connected;
  const isReconnecting = connectionState === ConnectionState.Reconnecting;

  const guestCamOn = isGuest && localParticipant?.isCameraEnabled;
  const remoteCount = remotes.length;
  const visibleVideoTiles =
    isGuest || remoteCount === 0
      ? 0
      : remotes.filter((r) => remoteHasVisibleCamera(r)).length;

  let hint = "";
  if (isConnecting || isReconnecting) {
    hint = isReconnecting
      ? "Connection dropped — we’re bringing you back."
      : "Hang tight — establishing a secure link.";
  } else if (isGuest) {
    hint = guestCamOn
      ? "You’re live. Mic and camera stay in the control bar at the bottom of the dark area."
      : "Next: use the camera button at the bottom of the video area, then allow access if the browser asks.";
  } else {
    if (remoteCount === 0) hint = "When your guest joins, their tile will appear in the stage below.";
    else if (visibleVideoTiles === 0)
      hint = "They’re in the room — once they enable the camera, video will show in the tiles below.";
    else hint = "Video is active. You can use chat or device menus from the bottom bar.";
  }

  return (
    <div
      className="support-cam-subheader mb-4 overflow-hidden rounded-xl border border-slate-200/90 bg-gradient-to-r from-slate-50/95 via-white to-slate-50/90 shadow-[0_1px_0_rgba(15,23,42,0.04)] dark:border-white/[0.08] dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950/90"
      style={{
        animation: "supportCamStripIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) both",
      }}
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
          {isConnected && !isReconnecting ? (
            <span className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/12 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/50 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              Connected
            </span>
          ) : isReconnecting ? (
            <span className="inline-flex items-center gap-2 rounded-lg bg-amber-500/15 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:text-amber-100">
              <i className="ri-refresh-line animate-spin text-sm" aria-hidden />
              Reconnecting
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-lg bg-slate-200/80 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
              <i className="ri-loader-4-line animate-spin text-sm" aria-hidden />
              Connecting
            </span>
          )}
          {!isGuest && isConnected && (
            <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
              {remoteCount === 0 ? "No guest in room yet" : `${remoteCount} in room`}
            </span>
          )}
          {isGuest && isConnected && (
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {guestCamOn ? "Camera on" : "Camera off"}
            </span>
          )}
        </div>
        <p className="max-w-xl text-xs leading-relaxed text-slate-600 dark:text-slate-400 sm:text-right">{hint}</p>
      </div>
      <div
        className="flex items-center justify-center gap-1 border-t border-slate-200/70 py-1.5 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-slate-400 dark:border-white/[0.06] dark:text-slate-500"
        aria-hidden
      >
        <i className="ri-arrow-down-s-line text-sm text-cyan-600/70 dark:text-cyan-400/70" />
        Controls live below the video
        <i className="ri-arrow-down-s-line text-sm text-cyan-600/70 dark:text-cyan-400/70" />
      </div>
    </div>
  );
}

/** Renders inside LiveKitRoom — contextual overlays + styled conference chrome. */
function SupportCameraLiveChrome({ mode }: { mode: "host" | "guest" }) {
  const { localParticipant } = useLocalParticipant();
  const remotes = useRemoteParticipants();
  const connectionState = useConnectionState();

  const isConnecting =
    connectionState === ConnectionState.Connecting || connectionState === ConnectionState.Reconnecting;

  const guestNeedsCamera =
    mode === "guest" && localParticipant && !localParticipant.isCameraEnabled;

  const hostAlone = mode === "host" && remotes.length === 0;

  const hostWaitingVideo =
    mode === "host" &&
    remotes.length > 0 &&
    !remotes.some((r) => remoteHasVisibleCamera(r));

  return (
    <>
      <SupportSessionSubheader mode={mode} />

      <div
        className="support-cam-shell relative rounded-2xl border border-slate-200/90 bg-slate-950 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.45)] dark:border-white/[0.08] dark:shadow-[0_28px_90px_-20px_rgba(0,0,0,0.65)]"
        role="region"
        aria-label="Video stage and meeting controls"
      >
        {/* Stage texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.2]"
          aria-hidden
          style={{
            backgroundImage: `repeating-linear-gradient(
              -12deg,
              transparent,
              transparent 2px,
              rgba(148,163,184,0.06) 2px,
              rgba(148,163,184,0.06) 3px
            )`,
          }}
        />

        {(isConnecting || guestNeedsCamera || hostAlone || hostWaitingVideo) && (
          <div
            className="pointer-events-none absolute inset-0 z-[1] flex flex-col items-center justify-end gap-4 px-4 pb-[min(22vh,9rem)] pt-8 text-center sm:justify-center sm:pb-8"
            aria-live="polite"
          >
            <div className="pointer-events-none max-w-md rounded-2xl border border-cyan-500/25 bg-slate-900/90 px-5 py-7 shadow-xl backdrop-blur-md dark:border-cyan-400/20 dark:bg-black/75 sm:px-6 sm:py-8">
              {isConnecting && (
                <>
                  <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/40 text-cyan-400">
                    <i className="ri-loader-4-line animate-spin text-2xl" aria-hidden />
                  </span>
                  <p className="text-base font-semibold tracking-tight text-white">Connecting to session…</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Securing an encrypted channel. This usually takes a few seconds.
                  </p>
                </>
              )}
              {!isConnecting && guestNeedsCamera && (
                <>
                  <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/30">
                    <i className="ri-vidicon-line text-3xl" aria-hidden />
                  </span>
                  <p className="text-lg font-semibold tracking-tight text-white">Turn on your camera</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Scroll if needed — the <strong className="text-slate-100">Camera</strong> button is in the{" "}
                    <strong className="text-slate-100">bottom</strong> bar of this dark area. Tap it, then allow access if
                    the browser asks. Mic is optional.
                  </p>
                </>
              )}
              {!isConnecting && hostAlone && (
                <>
                  <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/25">
                    <i className="ri-time-line text-3xl" aria-hidden />
                  </span>
                  <p className="text-lg font-semibold tracking-tight text-white">Waiting for the guest</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    They need to open their invite link and join. You’ll see them here as soon as they connect.
                  </p>
                </>
              )}
              {!isConnecting && hostWaitingVideo && !hostAlone && (
                <>
                  <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-200 ring-1 ring-cyan-400/25">
                    <i className="ri-webcam-line text-3xl" aria-hidden />
                  </span>
                  <p className="text-lg font-semibold tracking-tight text-white">Guest connected</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Video will appear when they enable their camera. If it stays blank, they may still be choosing
                    devices or reviewing permissions.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="support-cam-lk-root relative z-0 [&_.lk-video-conference]:bg-transparent [&_.lk-grid-layout]:min-h-[48vh] [&_.lk-grid-layout]:gap-3 [&_.lk-grid-layout]:p-4 [&_.lk-participant-tile]:min-h-[200px] [&_.lk-participant-tile]:rounded-xl [&_.lk-participant-tile]:border [&_.lk-participant-tile]:border-white/10 [&_.lk-participant-tile]:bg-slate-900/50 [&_.lk-focus-layout-wrapper]:min-h-[48vh]">
          <VideoConference />
        </div>
      </div>

      <RoomAudioRenderer />

      <style jsx global>{`
        @keyframes supportCamStripIn {
          from {
            opacity: 0;
            transform: translateY(-6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        /* LiveKit dark theme tokens + high contrast for our slate chrome (fixes “invisible” labels). */
        .support-cam-shell {
          --lk-fg: #f1f5f9;
          --lk-fg2: #cbd5e1;
          --lk-fg3: #94a3b8;
          --lk-control-fg: #f8fafc;
          --lk-control-bg: rgba(30, 41, 59, 0.55);
          --lk-control-hover-bg: rgba(51, 65, 85, 0.85);
          --lk-control-active-bg: rgba(13, 148, 136, 0.35);
          --lk-bg2: #1e293b;
          --lk-bg3: #334155;
          --lk-border-color: rgba(148, 163, 184, 0.28);
          --lk-accent-bg: #0d9488;
          --lk-accent-fg: #f0fdfa;
          color: var(--lk-fg);
        }
        /* Single primary exit: header Leave. Hide duplicate LiveKit disconnect control. */
        .support-cam-shell .lk-disconnect-button {
          display: none !important;
        }
        .support-cam-shell .lk-video-conference {
          min-height: min(62vh, 560px);
        }
        .support-cam-shell .lk-control-bar {
          position: sticky;
          bottom: 0;
          z-index: 4;
          isolation: isolate;
          border-top: 1px solid rgba(148, 163, 184, 0.25);
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.88) 0%, rgba(2, 6, 23, 0.98) 100%);
          padding: 0.85rem 1rem 1rem;
          gap: 0.4rem;
          box-shadow: 0 -12px 32px -8px rgba(0, 0, 0, 0.35);
        }
        .support-cam-shell .lk-button,
        .support-cam-shell .lk-button-menu {
          border-radius: 0.65rem;
          color: var(--lk-control-fg);
        }
        .support-cam-shell .lk-button svg {
          color: inherit;
        }
        .support-cam-shell .lk-device-menu {
          z-index: 50;
          max-height: min(42vh, 17.5rem);
          overflow-x: hidden;
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: 0.5rem 0.5rem 0.85rem;
          margin-bottom: 0.35rem;
          border-radius: 0.75rem;
          background-color: var(--lk-bg2) !important;
          color: var(--lk-fg);
          border: 1px solid rgba(148, 163, 184, 0.35);
          box-shadow:
            0 -6px 28px rgba(0, 0, 0, 0.45),
            0 12px 40px rgba(0, 0, 0, 0.4);
        }
        .support-cam-shell .lk-device-menu .lk-button {
          color: var(--lk-fg);
          background-color: transparent;
        }
        .support-cam-shell .lk-device-menu .lk-media-device-select li > .lk-button {
          justify-content: flex-start;
          width: 100%;
          text-align: left;
          white-space: normal;
          line-height: 1.35;
        }
        .support-cam-shell .lk-device-menu [data-active="true"] > .lk-button {
          color: var(--lk-accent-fg);
          background-color: var(--lk-accent-bg);
        }
      `}</style>
    </>
  );
}

export default function SupportCameraSessionClient({ inviteToken, mode }: Props) {
  useLiveKitBenignErrorSuppression();
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() || "";

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await exchangeSupportCameraInviteToken(inviteToken);
      if (mode === "host" && res.role !== "viewer") {
        setError("This link is for the invited user. Use the host link from the user list.");
        setLoading(false);
        return;
      }
      if (mode === "guest" && res.role !== "publisher") {
        setError("Open this page while signed in as the invited user, or ask your admin for the correct link.");
        setLoading(false);
        return;
      }
      setToken(res.token);
      setRoomName(res.roomName);
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "response" in e
          ? String((e as { response?: { data?: { message?: string } } }).response?.data?.message ?? "")
          : "";
      setError(msg || "Could not start session. The invite may have expired or you may be signed in as the wrong user.");
    } finally {
      setLoading(false);
    }
  }, [inviteToken, mode]);

  useEffect(() => {
    if (!inviteToken) {
      setError("Missing invitation.");
      setLoading(false);
      return;
    }
    connect();
  }, [inviteToken, connect]);

  if (!livekitUrl) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200/80 bg-rose-50/50 p-8 dark:border-rose-900/40 dark:bg-rose-950/20">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
          <i className="ri-settings-3-line text-xl" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">LiveKit not configured</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Set <code className="rounded bg-slate-200/80 px-1.5 py-0.5 text-xs dark:bg-white/10">NEXT_PUBLIC_LIVEKIT_URL</code>{" "}
          to your LiveKit WebSocket URL.
        </p>
        <Link href={ROUTES.defaultAfterLogin} className="ti-btn ti-btn-light mt-6 inline-flex !rounded-lg">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[52vh] flex-col items-center justify-center gap-5 px-4">
        <div className="relative">
          <div className="h-16 w-16 rounded-2xl border-2 border-cyan-500/30 border-t-cyan-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <i className="ri-shield-check-line text-2xl text-cyan-600/90 dark:text-cyan-400" aria-hidden />
          </div>
        </div>
        <div className="text-center">
          <p className="text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100">Preparing session…</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Validating your invite and token</p>
        </div>
      </div>
    );
  }

  if (error || !token || !roomName) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-slate-900/40">
        <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-400">
          <i className="ri-error-warning-line text-xl" aria-hidden />
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Support camera session</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{error}</p>
        <Link href={ROUTES.defaultAfterLogin} className="ti-btn ti-btn-primary mt-6 inline-flex !rounded-lg">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const isGuest = mode === "guest";

  return (
    <div className="support-cam-page mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-white/[0.07] dark:bg-slate-950/30">
        <header className="relative flex flex-col gap-4 border-b border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-cyan-50/40 px-5 py-5 sm:flex-row sm:items-start sm:justify-between dark:border-white/[0.06] dark:from-slate-950 dark:via-slate-950 dark:to-cyan-950/20">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.15]"
            aria-hidden
            style={{
              backgroundImage: `radial-gradient(circle at 20% 0%, rgba(6,182,212,0.12), transparent 45%),
                radial-gradient(circle at 80% 100%, rgba(14,165,233,0.08), transparent 40%)`,
            }}
          />
          <div className="relative min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] ${
                  isGuest
                    ? "bg-cyan-600/12 text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-200"
                    : "bg-amber-500/15 text-amber-900 dark:bg-amber-400/15 dark:text-amber-100"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${isGuest ? "bg-cyan-500 animate-pulse" : "bg-amber-500"}`}
                  aria-hidden
                />
                {isGuest ? "Your session" : "Support viewer"}
              </span>
              <span className="text-[0.65rem] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Encrypted
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              {isGuest ? "Share your camera" : "View support session"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {isGuest ? (
                <>
                  Allow camera (and optionally mic) when your browser asks. A designated platform operator can only see
                  your feed while this page stays open — close the tab or use{" "}
                  <strong className="font-medium text-slate-800 dark:text-slate-200">Leave session</strong> when you’re
                  done.
                </>
              ) : (
                <>
                  You’ll see the invited user once they open their link and turn on their camera. This room is for
                  consent-based assistance only.
                </>
              )}
            </p>
            {isGuest && (
              <p className="mt-3 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-500">
                <i className="ri-lock-2-line mt-0.5 shrink-0 text-slate-400" aria-hidden />
                <span>
                  Tip: use the camera menu in the control bar to pick the correct device if you have more than one
                  webcam.
                </span>
              </p>
            )}
          </div>
          <div className="relative flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <Link
              href={ROUTES.defaultAfterLogin}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 dark:border-white/15 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <i className="ri-logout-box-r-line text-lg opacity-80" aria-hidden />
              Leave session
            </Link>
            <p className="hidden text-right text-[0.65rem] text-slate-400 sm:block dark:text-slate-500">
              Ends your connection; use toolbar for mic &amp; camera
            </p>
          </div>
        </header>

        <div className="p-4 sm:p-5">
          <LiveKitRoom
            data-lk-theme="default"
            token={token}
            serverUrl={livekitUrl}
            connect
            audio={isGuest}
            video={isGuest}
            onDisconnected={() => {
              setToken(null);
              setRoomName(null);
            }}
          >
            <SupportCameraLiveChrome mode={mode} />
          </LiveKitRoom>
        </div>
      </div>
    </div>
  );
}
