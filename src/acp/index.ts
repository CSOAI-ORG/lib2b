/**
 * lib2b — ACP Adapter
 * Agent Communication Protocol — WebSocket streaming client
 */

import type {
  Lib2BConfig,
  ACPClient,
  ACPConnectOptions,
  ACPSessionOptions,
  ACPConnection,
  ACPMessage,
  ACPThought,
  ACPToolUpdate,
  ACPSessionInfo,
  ProtocolHealth,
} from "../types.js";
import { ProtocolError, TimeoutError } from "../types.js";

export class ACPClientImpl implements ACPClient {
  private config: Required<Lib2BConfig>;
  private connections = new Map<string, ACPConnectionImpl>();

  constructor(config: Required<Lib2BConfig>) {
    this.config = config;
  }

  private async httpRequest<T>(
    endpoint: string,
    options?: RequestInit,
    timeoutOverride?: number
  ): Promise<T> {
    const url = `${this.config.baseUrl}/acp${endpoint}`;
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      timeoutOverride || this.config.timeout
    );

    try {
      const response = await this.config.fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
          ...(options?.headers || {}),
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        const body = await response.text().catch(() => "Unknown error");
        throw new ProtocolError(
          "acp",
          `ACP request failed: ${response.status} ${response.statusText} — ${body}`,
          `HTTP_${response.status}`
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof ProtocolError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new TimeoutError("acp", this.config.timeout);
      }
      throw new ProtocolError(
        "acp",
        err instanceof Error ? err.message : String(err),
        "REQUEST_FAILED",
        err
      );
    }
  }

  async createSession(options?: ACPSessionOptions): Promise<string> {
    const res = await this.httpRequest<{ sessionId: string }>("/sessions", {
      method: "POST",
      body: JSON.stringify(options || {}),
    });
    return res.sessionId;
  }

  async listSessions(): Promise<ACPSessionInfo[]> {
    return this.httpRequest<ACPSessionInfo[]>("/sessions");
  }

  async connect(sessionId: string, options?: ACPConnectOptions): Promise<ACPConnection> {
    const wsUrl = this.config.baseUrl
      .replace(/^http/, "ws")
      .replace(/^https/, "wss");
    const url = `${wsUrl}/acp/stream?session=${sessionId}`;

    const conn = new ACPConnectionImpl(url, this.config.apiKey, sessionId, options);
    await conn.open();
    this.connections.set(sessionId, conn);
    return conn;
  }

  async close(): Promise<void> {
    const conns = Array.from(this.connections.values());
    this.connections.clear();
    await Promise.all(conns.map((c) => c.close()));
  }

  async health(): Promise<ProtocolHealth> {
    try {
      const res = await this.httpRequest<{ status: string; version?: string }>(
        "/health",
        { method: "GET" },
        5000
      );
      return { status: "up", version: res.version };
    } catch {
      return { status: "down" };
    }
  }
}

/** WebSocket connection implementation */
class ACPConnectionImpl implements ACPConnection {
  sessionId: string;
  state: "connecting" | "open" | "closed" | "error" = "connecting";

  private ws: WebSocket | null = null;
  private url: string;
  private apiKey: string;
  private options?: ACPConnectOptions;
  private messageCallbacks = new Set<(msg: ACPMessage) => void>();
  private thinkingCallbacks = new Set<(thought: ACPThought) => void>();
  private toolCallbacks = new Set<(update: ACPToolUpdate) => void>();
  private reconnectAttempts = 0;
  private maxReconnects = 3;
  private reconnectDelay = 1000;

  constructor(url: string, apiKey: string, sessionId: string, options?: ACPConnectOptions) {
    this.url = url;
    this.apiKey = apiKey;
    this.sessionId = sessionId;
    this.options = options;
  }

  async open(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.url}&token=${this.apiKey}`);

        this.ws.onopen = () => {
          this.state = "open";
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch {
            // Non-JSON message, ignore or log
          }
        };

        this.ws.onclose = () => {
          this.state = "closed";
          this.attemptReconnect();
        };

        this.ws.onerror = (err) => {
          this.state = "error";
          if (this.reconnectAttempts === 0) {
            reject(new ProtocolError("acp", "WebSocket connection failed", "WS_ERROR", err));
          }
        };
      } catch (err) {
        reject(new ProtocolError("acp", "Failed to create WebSocket", "WS_INIT_ERROR", err));
      }
    });
  }

  private handleMessage(data: unknown): void {
    if (typeof data !== "object" || data === null) return;
    const msg = data as Record<string, unknown>;

    switch (msg.type) {
      case "message":
        this.messageCallbacks.forEach((cb) => cb(msg.payload as ACPMessage));
        break;
      case "thinking":
        this.thinkingCallbacks.forEach((cb) => cb(msg.payload as ACPThought));
        break;
      case "tool":
        this.toolCallbacks.forEach((cb) => cb(msg.payload as ACPToolUpdate));
        break;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnects) return;
    this.reconnectAttempts++;
    setTimeout(() => {
      if (this.state !== "open") {
        this.open().catch(() => {
          // Reconnect failed, will retry if attempts remain
        });
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  async send(message: string | ACPMessage): Promise<void> {
    if (this.state !== "open" || !this.ws) {
      throw new ProtocolError("acp", "Connection not open", "NOT_CONNECTED");
    }
    const payload = typeof message === "string"
      ? { type: "message", payload: { role: "user", content: message, timestamp: new Date().toISOString() } }
      : { type: "message", payload: message };
    this.ws.send(JSON.stringify(payload));
  }

  onMessage(callback: (msg: ACPMessage) => void): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  onThinking(callback: (thought: ACPThought) => void): () => void {
    this.thinkingCallbacks.add(callback);
    return () => this.thinkingCallbacks.delete(callback);
  }

  onToolProgress(callback: (update: ACPToolUpdate) => void): () => void {
    this.toolCallbacks.add(callback);
    return () => this.toolCallbacks.delete(callback);
  }

  async close(): Promise<void> {
    this.state = "closed";
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageCallbacks.clear();
    this.thinkingCallbacks.clear();
    this.toolCallbacks.clear();
  }
}

export * from "../types.js";
