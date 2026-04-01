/**
 * Browser client for hrm-webrtc SignalR hub + WebRTC (admin viewer).
 * Depends on @microsoft/signalr.
 */

import type { HubConnection } from "@microsoft/signalr";

export type HrmWebRtcStatusCallback = (status: string) => void;
export type HrmWebRtcStreamCallback = (stream: MediaStream) => void;

export type HrmWebRtcClientOptions = {
  backendUrl: string;
  bearerToken: string;
  onStream?: HrmWebRtcStreamCallback;
  onStatusChange?: HrmWebRtcStatusCallback;
};

export class HrmWebRtcClient {
  private backendUrl: string;

  private token: string;

  private onStream?: HrmWebRtcStreamCallback;

  private onStatusChange?: HrmWebRtcStatusCallback;

  private hub: HubConnection | null = null;

  private pc: RTCPeerConnection | null = null;

  private currentSessionId: string | null = null;

  constructor({ backendUrl, bearerToken, onStream, onStatusChange }: HrmWebRtcClientOptions) {
    this.backendUrl = backendUrl.replace(/\/+$/, "");
    this.token = bearerToken;
    this.onStream = onStream;
    this.onStatusChange = onStatusChange;
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

    this.hub.on("StreamSessionStarted", (sessionId: string) => {
      this.currentSessionId = sessionId;
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
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      iceCandidatePoolSize: 4,
    });

    this.pc.ontrack = (event: RTCTrackEvent) => {
      if (event.streams[0]) {
        this.onStream?.(event.streams[0]);
        this.onStatusChange?.("streaming");
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

  private closePeerConnection(): void {
    this.pc?.close();
    this.pc = null;
    this.currentSessionId = null;
    this.onStatusChange?.("idle");
  }
}
