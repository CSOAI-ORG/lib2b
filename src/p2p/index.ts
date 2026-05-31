/**
 * lib2b — libp2p Adapter (stub)
 * Peer-to-peer agent mesh — placeholder for future libp2p integration
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

  constructor(config: Required<Lib2BConfig>) {
    this.config = config;
  }

  async discover(topic?: string): Promise<P2PPeer[]> {
    // Stub: returns mock peers for development
    return this.httpRequest<P2PPeer[]>(`/p2p/discover${topic ? `?topic=${topic}` : ""}`);
  }

  async send(peerId: string, message: P2PMessage): Promise<void> {
    await this.httpRequest<void>("/p2p/send", {
      method: "POST",
      body: JSON.stringify({ peerId, message }),
    });
  }

  onMessage(callback: (msg: P2PMessage) => void): () => void {
    this.messageHandlers.add(callback);
    return () => this.messageHandlers.delete(callback);
  }

  async getPeerId(): Promise<string> {
    if (this.localPeerId) return this.localPeerId;
    const res = await this.httpRequest<{ peerId: string }>("/p2p/peer-id");
    this.localPeerId = res.peerId;
    return res.peerId;
  }

  async close(): Promise<void> {
    this.messageHandlers.clear();
  }

  async health(): Promise<ProtocolHealth> {
    return { status: "unknown", message: "libp2p integration coming soon" };
  }

  private async httpRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
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
}

export * from "../types.js";
