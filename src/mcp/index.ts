/**
 * lib2b — MCP Adapter
 * Model Context Protocol client implementation
 */

import type {
  Lib2BConfig,
  MCPClient,
  MCPTool,
  MCPResult,
  MCPServerInfo,
  MCPResource,
  ProtocolHealth,
} from "../types.js";
import { ProtocolError, TimeoutError } from "../types.js";

export class MCPClientImpl implements MCPClient {
  private config: Required<Lib2BConfig>;

  constructor(config: Required<Lib2BConfig>) {
    this.config = config;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    timeoutOverride?: number
  ): Promise<T> {
    const url = `${this.config.baseUrl}/mcp${endpoint}`;
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
          "mcp",
          `MCP request failed: ${response.status} ${response.statusText} — ${body}`,
          `HTTP_${response.status}`
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof ProtocolError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new TimeoutError("mcp", this.config.timeout);
      }
      throw new ProtocolError(
        "mcp",
        err instanceof Error ? err.message : String(err),
        "REQUEST_FAILED",
        err
      );
    }
  }

  async discover(serverName?: string): Promise<MCPTool[]> {
    const params = serverName ? `?server=${encodeURIComponent(serverName)}` : "";
    const res = await this.request<{ tools: MCPTool[] }>(`/tools${params}`);
    return res.tools.map((t) => ({ ...t, server: serverName || t.server }));
  }

  async invoke<T>(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<MCPResult<T>> {
    return this.request<MCPResult<T>>("/invoke", {
      method: "POST",
      body: JSON.stringify({ tool: toolName, params }),
    });
  }

  async listServers(): Promise<MCPServerInfo[]> {
    return this.request<MCPServerInfo[]>("/servers");
  }

  async readResource(uri: string): Promise<MCPResource> {
    return this.request<MCPResource>(`/resource?uri=${encodeURIComponent(uri)}`);
  }

  async health(): Promise<ProtocolHealth> {
    try {
      const res = await this.request<{ status: string; version?: string }>(
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

export * from "../types.js";
