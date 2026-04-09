/**
 * Browser client for hrm-webrtc SignalR hub + WebRTC (admin viewer).
 * Depends on @microsoft/signalr.
 */

import type { HubConnection } from "@microsoft/signalr";

export type HrmWebRtcStatusCallback = (status: string) => void;
export type HrmWebRtcStreamCallback = (stream: MediaStream) => void;
export type HrmWebRtcDiagnosticsCallback = (stats: HrmConnectionStats) => void;

export type HrmConnectionStats = {
  iceState: RTCIceConnectionState | "n/a";
  connectionState: RTCPeerConnectionState | "n/a";
  candidateType: string;
  localAddress: string;
  remoteAddress: string;
  roundTripTimeMs: number | null;
  packetsReceived: number;
  packetsLost: number;
  bytesReceived: number;
  jitterMs: number | null;
  timestamp: number;
};

export type HrmWebRtcClientOptions = {
  backendUrl: string;
  bearerToken: string;
  onStream?: HrmWebRtcStreamCallback;
  onStatusChange?: HrmWebRtcStatusCallback;
  onDiagnostics?: HrmWebRtcDiagnosticsCallback;
};

export class HrmWebRtcClient {
  private backendUrl: string;

  private token: string;

  private onStream?: HrmWebRtcStreamCallback;

  private onStatusChange?: HrmWebRtcStatusCallback;

  private onDiagnostics?: HrmWebRtcDiagnosticsCallback;

  private hub: HubConnection | null = null;

  private pc: RTCPeerConnection | null = null;

  private currentSessionId: string | null = null;

  private iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

  private statsInterval: ReturnType<typeof setInterval> | null = null;

  constructor({ backendUrl, bearerToken, onStream, onStatusChange, onDiagnostics }: HrmWebRtcClientOptions) {
    this.backendUrl = backendUrl.replace(/\/+$/, "");
    this.token = bearerToken;
    this.onStream = onStream;
    this.onStatusChange = onStatusChange;
    this.onDiagnostics = onDiagnostics;
  }

  async connect(): Promise<void> {
    const signalR = await import("@microsoft/signalr");
    this.hub = new signalR.HubConnectionBuilder()
      .withUrl(`${this.backendUrl}/hubs/signaling`, {
        accessTokenFactory: () => this.token,
        transport: signalR.HttpTransportType.WebSockets,
        skipNegotiation: true,
      })
      .withAutomaticReconnect()
      .build();

    this.registerHandlers();
    await this.hub.start();
    this.onStatusChange?.("connected");
  }

  async watchDevice(deviceId: string): Promise<void> {
    if (!this.hub) throw new Error("Call connect() first.");
    await this.hub.invoke("RequestStream", deviceId);
  }

  async stopStream(): Promise<void> {
    if (this.hub && this.currentSessionId) {
      await this.hub.invoke("StopStream", this.currentSessionId);
    }
    this.closePeerConnection();
  }

  async getOnlineDevices(): Promise<string[]> {
    if (!this.hub) throw new Error("Call connect() first.");
    return this.hub.invoke("GetOnlineDevices");
  }

  async disconnect(): Promise<void> {
    await this.stopStream();
    if (this.hub) {
      try {
        await this.hub.stop();
      } catch {
        /* ignore */
      }
      this.hub = null;
    }
    this.closePeerConnection();
    this.onStatusChange?.("disconnected");
  }

  private registerHandlers(): void {
    if (!this.hub) return;

    this.hub.on("StreamSessionStarted", (sessionId: string, iceServersJson?: string) => {
      this.currentSessionId = sessionId;
      if (iceServersJson) {
        try {
          const parsed = JSON.parse(iceServersJson) as Array<{
            Url: string;
            Username?: string | null;
            Credential?: string | null;
          }>;
          this.iceServers = parsed.map((s) => {
            const entry: RTCIceServer = { urls: s.Url };
            if (s.Username) entry.username = s.Username;
            if (s.Credential) entry.credential = s.Credential;
            return entry;
          });
        } catch {
          /* keep default STUN fallback */
        }
      }
      this.onStatusChange?.("session-started");
    });

    this.hub.on("ReceiveOffer", async (sessionId: string, offerSdp: string) => {
      this.currentSessionId = sessionId;
      await this.handleOffer(offerSdp);
    });

    this.hub.on("ReceiveIceCandidate", async (candidateJson: string) => {
      const candidate = JSON.parse(candidateJson) as RTCIceCandidateInit;
      if (this.pc && candidate?.candidate) {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    this.hub.on("Error", (msg: string) => {
      console.error("[HRM WebRTC] Hub error:", msg);
      this.onStatusChange?.(`error: ${msg}`);
    });
  }

  private async handleOffer(offerSdp: string): Promise<void> {
    this.pc = new RTCPeerConnection({
      iceServers: this.iceServers,
      iceCandidatePoolSize: 4,
    });

    this.pc.ontrack = (event: RTCTrackEvent) => {
      if (event.streams[0]) {
        this.onStream?.(event.streams[0]);
        this.onStatusChange?.("streaming");
        this.startStatsPolling();
      }
    };

    this.pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
      if (!event.candidate || !this.hub || !this.currentSessionId) return;
      void this.hub.invoke(
        "AdminSendIceCandidate",
        this.currentSessionId,
        JSON.stringify({
          candidate: event.candidate.candidate,
          sdpMid: event.candidate.sdpMid,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
        })
      );
    };

    this.pc.onconnectionstatechange = () => {
      if (this.pc) {
        this.onStatusChange?.(this.pc.connectionState);
      }
    };

    await this.pc.setRemoteDescription({ type: "offer", sdp: offerSdp });
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    if (this.hub && this.currentSessionId) {
      await this.hub.invoke("AdminSendAnswer", this.currentSessionId, answer.sdp);
    }
  }

  // ── Diagnostics ──────────────────────────────────────────────────────

  async getConnectionStats(): Promise<HrmConnectionStats> {
    const empty: HrmConnectionStats = {
      iceState: "n/a",
      connectionState: "n/a",
      candidateType: "unknown",
      localAddress: "",
      remoteAddress: "",
      roundTripTimeMs: null,
      packetsReceived: 0,
      packetsLost: 0,
      bytesReceived: 0,
      jitterMs: null,
      timestamp: Date.now(),
    };

    if (!this.pc) return empty;

    const stats = await this.pc.getStats();
    let candidateType = "unknown";
    let localAddress = "";
    let remoteAddress = "";
    let roundTripTimeMs: number | null = null;
    let packetsReceived = 0;
    let packetsLost = 0;
    let bytesReceived = 0;
    let jitterMs: number | null = null;

    stats.forEach((report) => {
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        roundTripTimeMs = typeof report.currentRoundTripTime === "number"
          ? Math.round(report.currentRoundTripTime * 1000)
          : null;
        bytesReceived = report.bytesReceived ?? 0;

        const localCand = stats.get(report.localCandidateId);
        const remoteCand = stats.get(report.remoteCandidateId);
        if (localCand) {
          candidateType = localCand.candidateType ?? "unknown";
          localAddress = `${localCand.address ?? ""}:${localCand.port ?? ""}`;
        }
        if (remoteCand) {
          remoteAddress = `${remoteCand.address ?? ""}:${remoteCand.port ?? ""}`;
        }
      }
      if (report.type === "inbound-rtp" && report.kind === "video") {
        packetsReceived = report.packetsReceived ?? 0;
        packetsLost = report.packetsLost ?? 0;
        jitterMs = typeof report.jitter === "number" ? Math.round(report.jitter * 1000) : null;
      }
    });

    return {
      iceState: this.pc.iceConnectionState,
      connectionState: this.pc.connectionState,
      candidateType,
      localAddress,
      remoteAddress,
      roundTripTimeMs,
      packetsReceived,
      packetsLost,
      bytesReceived,
      jitterMs,
      timestamp: Date.now(),
    };
  }

  async getDiagnosticsJson(): Promise<string> {
    const stats = await this.getConnectionStats();
    return JSON.stringify(stats, null, 2);
  }

  private startStatsPolling(): void {
    this.stopStatsPolling();
    if (!this.onDiagnostics) return;
    this.statsInterval = setInterval(async () => {
      try {
        const stats = await this.getConnectionStats();
        this.onDiagnostics?.(stats);
      } catch { /* ignore polling errors */ }
    }, 2000);
  }

  private stopStatsPolling(): void {
    if (this.statsInterval !== null) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  private closePeerConnection(): void {
    this.stopStatsPolling();
    this.pc?.close();
    this.pc = null;
    this.currentSessionId = null;
    this.onStatusChange?.("idle");
  }
}
