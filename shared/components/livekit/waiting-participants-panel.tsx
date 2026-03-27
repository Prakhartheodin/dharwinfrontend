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
      if (hostEmail) {
        await livekitApi.admitParticipantPublic(
          roomName,
          participant.identity,
          participant.name,
          undefined,
          hostEmail
        );
      } else {
        await livekitApi.admitParticipant(roomName, participant.identity, participant.name);
      }
      setWaitingParticipants((prev) => {
        const next = prev.filter((p) => p.identity !== participant.identity);
        onWaitingParticipantsChange?.(next.map((p) => p.identity));
        return next;
      });
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
        if (hostEmail) {
          await livekitApi.admitParticipantPublic(roomName, p.identity, p.name, undefined, hostEmail);
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
      if (hostEmail) {
        await livekitApi.removeParticipantPublic(roomName, participant.identity, hostEmail);
      } else {
        await livekitApi.removeParticipant(roomName, participant.identity);
      }
      setWaitingParticipants((prev) => {
        const next = prev.filter((p) => p.identity !== participant.identity);
        onWaitingParticipantsChange?.(next.map((p) => p.identity));
        return next;
      });
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
      {/* Drawer tab when closed */}
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[999] flex items-center gap-2 pl-3 pr-2 py-2 rounded-l-xl bg-[#1a1a1f] border border-r-0 border-white/10 shadow-lg hover:bg-[#222] transition-colors"
        title="Waiting room"
      >
        <i className="ti ti-user-search text-primary text-lg" />
        <span className="text-white text-sm font-medium">Waiting</span>
        {count > 0 && (
          <span className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center">
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
