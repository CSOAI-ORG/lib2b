/**
 * lib2b — Core Client
 * Unified protocol layer for B2B AI
 */

import type {
  Lib2BConfig,
  Lib2BClient,
  Protocol,
  HealthReport,
  ProtocolHealth,
} from "./types.js";
import { Lib2BError } from "./types.js";
import { MCPClientImpl } from "./mcp/index.js";
import { A2AClientImpl } from "./a2a/index.js";
import { ACPClientImpl } from "./acp/index.js";
import { P2PClientImpl } from "./p2p/index.js";
import { ABCIClientImpl } from "./abci/index.js";

const DEFAULT_BASE_URL = "https://api.csoai.org";
const DEFAULT_TIMEOUT = 30000;

export function create(config: Lib2BConfig): Lib2BClient {
  return new Lib2BClientImpl(config);
}

export class Lib2BClientImpl implements Lib2BClient {
  readonly config: Required<Lib2BConfig>;
  readonly mcp: MCPClientImpl;
  readonly a2a: A2AClientImpl;
  readonly acp: ACPClientImpl;
  readonly p2p: P2PClientImpl;
  readonly abci: ABCIClientImpl;

  private _closed = false;

  constructor(config: Lib2BConfig) {
    if (!config.apiKey) {
      throw new Lib2BError("API key is required", "MISSING_API_KEY");
    }

    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl?.replace(/\/$/, "") || DEFAULT_BASE_URL,
      protocols: config.protocols || ["mcp", "a2a", "acp"],
      timeout: config.timeout || DEFAULT_TIMEOUT,
      fetch: config.fetch || globalThis.fetch.bind(globalThis),
    };

    this.mcp = new MCPClientImpl(this.config);
    this.a2a = new A2AClientImpl(this.config);
    this.acp = new ACPClientImpl(this.config);
    this.p2p = new P2PClientImpl(this.config);
    this.abci = new ABCIClientImpl(this.config);
  }

  async health(): Promise<HealthReport> {
    const protocols = this.config.protocols;
    const report: HealthReport = {
      overall: "healthy",
      protocols: {} as Record<Protocol, ProtocolHealth>,
      latency: {} as Record<Protocol, number>,
      timestamp: new Date().toISOString(),
    };

    const checks = protocols.map(async (protocol) => {
      const start = performance.now();
      try {
        let health: ProtocolHealth;
        switch (protocol) {
          case "mcp":
            health = await this.mcp.health();
            break;
          case "a2a":
            health = await this.a2a.health();
            break;
          case "acp":
            health = await this.acp.health();
            break;
          case "p2p":
            health = await this.p2p.health();
            break;
          case "abci":
            health = await this.abci.health();
            break;
          default:
            health = { status: "unknown", message: "Unknown protocol" };
        }
        report.protocols[protocol] = health;
        report.latency[protocol] = Math.round(performance.now() - start);
        if (health.status !== "up") {
          report.overall = "degraded";
        }
      } catch (err) {
        report.protocols[protocol] = {
          status: "down",
          message: err instanceof Error ? err.message : String(err),
        };
        report.latency[protocol] = Math.round(performance.now() - start);
        report.overall = "unhealthy";
      }
    });

    await Promise.all(checks);
    return report;
  }

  async close(): Promise<void> {
    if (this._closed) return;
    this._closed = true;
    await Promise.all([
      this.acp.close(),
      this.p2p.close(),
    ]);
  }
}

/** Default export factory */
export default { create };
