"use client";

import { useState, useEffect } from "react";
import * as livekitApi from "@/shared/lib/api/livekit";

interface WaitingParticipant {
  identity: string;
  name: string;
  joinedAt: string;
}

interface WaitingParticipantsPanelProps {
  roomName: string;
  hostEmail?: string;
  onParticipantAdmitted?: (identity: string) => void;
  onWaitingParticipantsChange?: (identities: string[]) => void;
}

const AVATAR_COLORS = [
  "bg-primary/20 text-primary",
  "bg-emerald-500/20 text-emerald-400",
  "bg-amber-500/20 text-amber-400",
  "bg-rose-500/20 text-rose-400",
  "bg-blue-500/20 text-blue-400",
];

function getInitials(name: string): string {
  const parts = (name || "").trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  return (name || "?").slice(0, 2).toUpperCase();
}

function avatarColor(identity: string): string {
  let n = 0;
  for (let i = 0; i < identity.length; i++) n += identity.charCodeAt(i);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export function WaitingParticipantsPanel({
  roomName,
  hostEmail,
  onParticipantAdmitted,
  onWaitingParticipantsChange,
}: WaitingParticipantsPanelProps) {
  const [waitingParticipants, setWaitingParticipants] = useState<WaitingParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [admitting, setAdmitting] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [admittingAll, setAdmittingAll] = useState(false);

  const fetchWaitingParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = hostEmail
        ? await livekitApi.getWaitingParticipantsPublic(roomName, hostEmail)
        : await livekitApi.getWaitingParticipants(roomName);
      const participants = response.participants || [];
      setWaitingParticipants(participants);
      onWaitingParticipantsChange?.(participants.map((p) => p.identity));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || "Failed to load waiting participants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitingParticipants();
    const interval = setInterval(fetchWaitingParticipants, 5000);
    return () => clearInterval(interval);
  }, [roomName, hostEmail]);

  const handleAdmit = async (participant: WaitingParticipant) => {
    try {
      setAdmitting(participant.identity);
      setError(null);
      if (hostEmail?.trim()) {
        await livekitApi.admitParticipantPublic(
          roomName,
          participant.identity,
          participant.name,
          undefined,
          hostEmail.trim()
        );
      } else {
        await livekitApi.admitParticipant(roomName, participant.identity, participant.name);
      }
      const nextList = waitingParticipants.filter((p) => p.identity !== participant.identity);
      setWaitingParticipants(nextList);
      onWaitingParticipantsChange?.(nextList.map((p) => p.identity));
      onParticipantAdmitted?.(participant.identity);
      setTimeout(fetchWaitingParticipants, 500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || "Failed to admit participant");
    } finally {
      setAdmitting(null);
    }
  };

  const handleAdmitAll = async () => {
    if (waitingParticipants.length === 0) return;
    try {
      setAdmittingAll(true);
      setError(null);
      for (const p of [...waitingParticipants]) {
        if (hostEmail?.trim()) {
          await livekitApi.admitParticipantPublic(roomName, p.identity, p.name, undefined, hostEmail.trim());
        } else {
          await livekitApi.admitParticipant(roomName, p.identity, p.name);
        }
        setWaitingParticipants((prev) => prev.filter((x) => x.identity !== p.identity));
        onParticipantAdmitted?.(p.identity);
      }
      onWaitingParticipantsChange?.([]);
      setTimeout(fetchWaitingParticipants, 500);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || "Failed to admit all");
    } finally {
      setAdmittingAll(false);
    }
  };

  const handleRemove = async (participant: WaitingParticipant) => {
    try {
      setRemoving(participant.identity);
      setError(null);
      if (hostEmail?.trim()) {
        await livekitApi.removeParticipantPublic(roomName, participant.identity, hostEmail.trim());
      } else {
        await livekitApi.removeParticipant(roomName, participant.identity);
      }
      const nextList = waitingParticipants.filter((p) => p.identity !== participant.identity);
      setWaitingParticipants(nextList);
      onWaitingParticipantsChange?.(nextList.map((p) => p.identity));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } }; message?: string };
      setError(e?.response?.data?.message || "Failed to remove participant");
    } finally {
      setRemoving(null);
    }
  };

  const count = waitingParticipants.length;

  return (
    <>
      {/* Full-screen amber edge alert — a light snake chases around the border while anyone waits */}
      {count > 0 && <div aria-hidden className="waiting-snake-glow" />}
      <style jsx>{`
        @property --snake-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        .waiting-snake-glow {
          position: fixed;
          inset: 0;
          z-index: 998;
          pointer-events: none;
          padding: 5px;
          border-radius: 14px;
          background: conic-gradient(
            from var(--snake-angle),
            rgba(251, 191, 36, 0) 0deg,
            rgba(251, 191, 36, 0) 210deg,
            rgba(251, 191, 36, 0.85) 300deg,
            #fde68a 340deg,
            rgba(251, 191, 36, 0) 360deg
          );
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          filter: drop-shadow(0 0 9px rgba(251, 191, 36, 0.7));
          animation: waiting-snake-run 2.4s linear infinite;
        }
        @keyframes waiting-snake-run {
          to {
            --snake-angle: 360deg;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .waiting-snake-glow {
            animation: none;
            background: none;
            box-shadow: inset 0 0 60px 12px rgba(251, 191, 36, 0.45);
          }
        }
      `}</style>

      {/* Drawer tab when closed — loud when someone is waiting, quiet otherwise */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        aria-label={count > 0 ? `${count} ${count === 1 ? "person" : "people"} waiting to join — review now` : "Waiting room"}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-[999] flex items-center gap-2 pl-3 pr-2.5 py-2.5 rounded-l-xl border border-r-0 shadow-lg transition-colors ${
          count > 0
            ? "bg-[#1a1a1f] border-amber-400 ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.55)] hover:bg-[#242018] motion-safe:animate-pulse"
            : "bg-[#1a1a1f] border-white/10 hover:bg-[#222]"
        }`}
        title={count > 0 ? `${count} waiting to join` : "Waiting room"}
      >
        <span className="relative flex items-center justify-center">
          <i className={`ti ti-user-search text-lg ${count > 0 ? "text-amber-300" : "text-primary"}`} />
          {count > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-2.5 w-2.5">
              <span className="motion-safe:animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
            </span>
          )}
        </span>
        <span className={`text-sm font-semibold ${count > 0 ? "text-amber-100" : "text-white font-medium"}`}>
          {count > 0 ? `${count} waiting` : "Waiting"}
        </span>
        {count > 0 && (
          <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-400 text-[#1a1a1f] text-xs font-bold flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      {/* Backdrop when open */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[1000]"
          onClick={() => setDrawerOpen(false)}
          aria-hidden
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-[1001] w-full max-w-[380px] bg-[#1a1a1f] border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-200 ease-out ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <i className="ti ti-user-wait text-primary text-xl" />
            <h3 className="text-white font-semibold">Waiting room</h3>
            {count > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
                {count}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <i className="ti ti-x text-lg" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && count === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Loading…</p>
          ) : count === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No one waiting</p>
          ) : (
            <>
              {error && (
                <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
                  {error}
                </div>
              )}
              {count > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleAdmitAll();
                  }}
                  disabled={admittingAll}
                  className="w-full mb-4 py-2.5 rounded-xl bg-primary/20 text-primary font-medium text-sm hover:bg-primary/30 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {admittingAll ? (
                    <i className="ti ti-loader-2 animate-spin text-base" />
                  ) : (
                    <i className="ti ti-users-plus text-base" />
                  )}
                  Admit all ({count})
                </button>
              )}
              <ul className="space-y-2">
                {waitingParticipants.map((participant) => (
                  <li
                    key={participant.identity}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${avatarColor(participant.identity)}`}
                    >
                      {getInitials(participant.name || participant.identity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{participant.name || participant.identity}</p>
                      <p className="text-gray-500 text-xs truncate">{participant.identity}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void handleAdmit(participant);
                        }}
                        disabled={admitting === participant.identity || removing === participant.identity}
                        className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
                        title="Admit"
                      >
                        {admitting === participant.identity ? (
                          <i className="ti ti-loader-2 animate-spin text-sm" />
                        ) : (
                          <i className="ti ti-check text-sm" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void handleRemove(participant);
                        }}
                        disabled={admitting === participant.identity || removing === participant.identity}
                        className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
                        title="Remove"
                      >
                        {removing === participant.identity ? (
                          <i className="ti ti-loader-2 animate-spin text-sm" />
                        ) : (
                          <i className="ti ti-x text-sm" />
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={fetchWaitingParticipants}
            disabled={loading}
            className="w-full py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 text-sm font-medium flex items-center justify-center gap-2"
          >
            <i className={`ti ti-refresh text-base ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>
    </>
  );
}
