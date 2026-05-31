/**
 * lib2b — libp2p Adapter
 * Peer-to-peer agent mesh — HTTP gateway bridge until native libp2p is integrated
 */

import type {
  Lib2BConfig,
  P2PClient,
  P2PPeer,
  P2PMessage,
  ProtocolHealth,
} from "../types.js";
import { ProtocolError } from "../types.js";

export class P2PClientImpl implements P2PClient {
  private config: Required<Lib2BConfig>;
  private messageHandlers = new Set<(msg: P2PMessage) => void>();
  private localPeerId: string | null = null;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Required<Lib2BConfig>) {
    this.config = config;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.config.baseUrl}/p2p${endpoint}`;
    const response = await this.config.fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
    if (!response.ok) {
      throw new ProtocolError("p2p", `P2P request failed: ${response.status}`, `HTTP_${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async discover(topic?: string): Promise<P2PPeer[]> {
    const params = topic ? `?topic=${encodeURIComponent(topic)}` : "";
    return this.request<P2PPeer[]>(`/discover${params}`);
  }

  async send(peerId: string, message: P2PMessage): Promise<void> {
    await this.request<void>("/send", {
      method: "POST",
      body: JSON.stringify({ peerId, message }),
    });
  }

  onMessage(callback: (msg: P2PMessage) => void): () => void {
    this.messageHandlers.add(callback);
    this.startPolling();
    return () => {
      this.messageHandlers.delete(callback);
      if (this.messageHandlers.size === 0) {
        this.stopPolling();
      }
    };
  }

  private startPolling(): void {
    if (this.pollInterval) return;
    this.pollInterval = setInterval(async () => {
      try {
        const messages = await this.request<P2PMessage[]>("/messages");
        messages.forEach((msg) => this.messageHandlers.forEach((cb) => cb(msg)));
      } catch {
        // Silently drop polling errors
      }
    }, 2000);
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async getPeerId(): Promise<string> {
    if (this.localPeerId) return this.localPeerId;
    const res = await this.request<{ peerId: string }>("/peer-id");
    this.localPeerId = res.peerId;
    return res.peerId;
  }

  async close(): Promise<void> {
    this.stopPolling();
    this.messageHandlers.clear();
  }

  async health(): Promise<ProtocolHealth> {
    try {
      const res = await this.request<{ status: string; version?: string }>("/health");
      return { status: "up", version: res.version };
    } catch {
      return { status: "unknown", message: "libp2p gateway not available" };
    }
  }
}

export * from "../types.js";
