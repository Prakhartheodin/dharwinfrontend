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
  const [isExpanded, setIsExpanded] = useState(true);

  const fetchWaitingParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use public endpoint if hostEmail is provided (for public join flow)
      const response = hostEmail
        ? await livekitApi.getWaitingParticipantsPublic(roomName, hostEmail)
        : await livekitApi.getWaitingParticipants(roomName);
      const participants = response.participants || [];
      setWaitingParticipants(participants);
      // Notify parent component of waiting participant identities (for filtering video grid)
      // Also include names for better matching
      const waitingIdentities = participants.map(p => p.identity);
      onWaitingParticipantsChange?.(waitingIdentities);
      
      // Log for debugging
      if (participants.length > 0) {
        console.log('Waiting participants:', participants.map(p => ({ identity: p.identity, name: p.name })));
      }
    } catch (err: any) {
      console.error("Error fetching waiting participants:", err);
      setError(err?.response?.data?.message || "Failed to load waiting participants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitingParticipants();
    // Poll for updates every 3 seconds
    const interval = setInterval(fetchWaitingParticipants, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, hostEmail]);

  const handleAdmit = async (participant: WaitingParticipant) => {
    try {
      setAdmitting(participant.identity);
      setError(null);
      // Use public endpoint if hostEmail is provided (for public join flow)
      if (hostEmail) {
        await livekitApi.admitParticipantPublic(
          roomName,
          participant.identity,
          participant.name,
          undefined,
          hostEmail
        );
      } else {
        await livekitApi.admitParticipant(
          roomName,
          participant.identity,
          participant.name
        );
      }
      // Remove from waiting list immediately
      setWaitingParticipants((prev) =>
        prev.filter((p) => p.identity !== participant.identity)
      );
      // Update waiting IDs list immediately so hiding logic stops hiding this participant
      onWaitingParticipantsChange?.(waitingParticipants.filter(p => p.identity !== participant.identity).map(p => p.identity));
      onParticipantAdmitted?.(participant.identity);
      
      // Also refresh the waiting list to get updated data from server
      setTimeout(() => {
        fetchWaitingParticipants();
      }, 500);
    } catch (err: any) {
      console.error("Error admitting participant:", err);
      setError(err?.response?.data?.message || "Failed to admit participant");
    } finally {
      setAdmitting(null);
    }
  };

  const handleRemove = async (participant: WaitingParticipant) => {
    try {
      setRemoving(participant.identity);
      setError(null);
      // Use public endpoint if hostEmail is provided (for public join flow)
      if (hostEmail) {
        await livekitApi.removeParticipantPublic(
          roomName,
          participant.identity,
          hostEmail
        );
      } else {
        await livekitApi.removeParticipant(roomName, participant.identity);
      }
      // Remove from waiting list
      setWaitingParticipants((prev) =>
        prev.filter((p) => p.identity !== participant.identity)
      );
    } catch (err: any) {
      console.error("Error removing participant:", err);
      setError(err?.response?.data?.message || "Failed to remove participant");
    } finally {
      setRemoving(null);
    }
  };

  // Always show the panel (collapsed or expanded) so host knows there's a waiting room
  return (
    <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700 overflow-hidden transition-all duration-200">
      {/* Header with toggle icon */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <i className={`ri-user-search-line text-xl text-primary transition-transform duration-200 ${isExpanded ? 'rotate-0' : ''}`} />
            {waitingParticipants.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                {waitingParticipants.length}
              </span>
            )}
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">
              Waiting Room
            </h3>
            {waitingParticipants.length > 0 && (
              <p className="text-gray-400 text-xs">
                {waitingParticipants.length} participant{waitingParticipants.length !== 1 ? 's' : ''} waiting
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {waitingParticipants.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchWaitingParticipants();
              }}
              className="text-gray-400 hover:text-primary text-sm p-1"
              disabled={loading}
              title="Refresh"
            >
              <i className={`ri-refresh-line ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            className="text-gray-400 hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            <i className={`ri-arrow-${isExpanded ? 'up' : 'down'}-s-line text-lg transition-transform duration-200`} />
          </button>
        </div>
      </div>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="border-t border-gray-700">
          {loading && waitingParticipants.length === 0 ? (
            <div className="p-4">
              <p className="text-gray-400 text-sm text-center">Loading...</p>
            </div>
          ) : waitingParticipants.length === 0 ? (
            <div className="p-4">
              <p className="text-gray-400 text-sm text-center">No participants waiting</p>
            </div>
          ) : (
            <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto">
              {error && (
                <div className="mb-3 p-2 bg-red-900/50 border border-red-700 rounded text-red-200 text-xs">
                  {error}
                </div>
              )}

              {waitingParticipants.map((participant) => (
                <div
                  key={participant.identity}
                  className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <i className="ri-user-line text-primary text-sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{participant.name}</p>
                      <p className="text-gray-400 text-xs truncate">
                        {participant.identity}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAdmit(participant)}
                      disabled={admitting === participant.identity || removing === participant.identity}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xs font-medium rounded-md transition-colors duration-200 shadow-sm"
                      title="Admit participant"
                    >
                      {admitting === participant.identity ? (
                        <i className="ri-loader-4-line animate-spin text-sm" />
                      ) : (
                        <>
                          <i className="ri-check-line text-sm" />
                          <span>Admit</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRemove(participant)}
                      disabled={admitting === participant.identity || removing === participant.identity}
                      className="flex items-center justify-center w-8 h-8 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-md transition-colors duration-200 shadow-sm"
                      title="Remove participant"
                    >
                      {removing === participant.identity ? (
                        <i className="ri-loader-4-line animate-spin text-sm" />
                      ) : (
                        <i className="ri-close-line text-sm" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
