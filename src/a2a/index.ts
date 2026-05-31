/**
 * lib2b — A2A Adapter
 * Agent-to-Agent protocol client with Byzantine consensus
 */

import type {
  Lib2BConfig,
  A2AClient,
  A2ADelegateRequest,
  A2ADelegateResult,
  A2AVote,
  AgentCard,
  AgentFilter,
  A2ATask,
  A2ATaskResult,
  ProtocolHealth,
} from "../types.js";
import { ProtocolError, TimeoutError, ConsensusError } from "../types.js";

export class A2AClientImpl implements A2AClient {
  private config: Required<Lib2BConfig>;

  constructor(config: Required<Lib2BConfig>) {
    this.config = config;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit,
    timeoutOverride?: number
  ): Promise<T> {
    const url = `${this.config.baseUrl}/a2a${endpoint}`;
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
          "a2a",
          `A2A request failed: ${response.status} ${response.statusText} — ${body}`,
          `HTTP_${response.status}`
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof ProtocolError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new TimeoutError("a2a", this.config.timeout);
      }
      throw new ProtocolError(
        "a2a",
        err instanceof Error ? err.message : String(err),
        "REQUEST_FAILED",
        err
      );
    }
  }

  async getAgentCard(agentUrl: string): Promise<AgentCard> {
    // Try well-known endpoint first
    const wellKnown = `${agentUrl.replace(/\/$/, "")}/.well-known/agent.json`;
    try {
      const res = await this.config.fetch(wellKnown, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) return (await res.json()) as AgentCard;
    } catch {
      // Fall through to gateway lookup
    }
    // Fallback: query via CSOAI gateway
    return this.request<AgentCard>(`/agent?url=${encodeURIComponent(agentUrl)}`);
  }

  async listAgents(filter?: AgentFilter): Promise<AgentCard[]> {
    const params = new URLSearchParams();
    if (filter?.tags) filter.tags.forEach((t) => params.append("tag", t));
    if (filter?.capability) params.set("capability", filter.capability);
    const qs = params.toString() ? `?${params.toString()}` : "";
    return this.request<AgentCard[]>(`/agents${qs}`);
  }

  async sendTask(agentUrl: string, task: A2ATask): Promise<A2ATaskResult> {
    return this.request<A2ATaskResult>("/task", {
      method: "POST",
      body: JSON.stringify({ agentUrl, task }),
    });
  }

  async delegate(request: A2ADelegateRequest): Promise<A2ADelegateResult> {
    const {
      agents,
      task,
      consensus = "byzantine",
      timeout = 45000,
      context,
    } = request;

    if (agents.length < 2) {
      throw new ProtocolError(
        "a2a",
        "At least 2 agents required for consensus delegation",
        "INSUFFICIENT_AGENTS"
      );
    }

    // Fetch agent cards to resolve URLs
    const agentCards = await Promise.all(
      agents.map(async (id) => {
        if (id.startsWith("http")) {
          return this.getAgentCard(id);
        }
        // Lookup by ID via gateway
        const list = await this.listAgents();
        const found = list.find((a) => a.name === id || a.url.includes(id));
        if (!found) {
          throw new ProtocolError("a2a", `Agent not found: ${id}`, "AGENT_NOT_FOUND");
        }
        return found;
      })
    );

    // Send task to all agents in parallel
    const taskId = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const votes: A2AVote[] = await Promise.all(
      agentCards.map(async (card) => {
        const start = Date.now();
        try {
          const result = await this.sendTask(card.url, {
            id: taskId,
            message: {
              role: "user",
              parts: [{ type: "text", text: task }],
            },
          });
          return {
            agentId: card.name,
            agentName: card.name,
            response: result.artifacts?.[0]?.parts?.[0]?.text || JSON.stringify(result),
            confidence: result.status === "completed" ? 0.95 : 0.5,
            timestamp: new Date().toISOString(),
          };
        } catch (err) {
          return {
            agentId: card.name,
            agentName: card.name,
            response: `ERROR: ${err instanceof Error ? err.message : String(err)}`,
            confidence: 0,
            timestamp: new Date().toISOString(),
          };
        }
      })
    );

    // Apply consensus algorithm
    const result = this.applyConsensus(votes, consensus, agents.length);

    return {
      verdict: result.verdict,
      confidence: result.confidence,
      votes,
      consensus,
      proof: this.generateProof(votes, consensus),
      metadata: {
        taskId,
        agentCount: agents.length,
        timestamp: new Date().toISOString(),
      },
    };
  }

  private applyConsensus(
    votes: A2AVote[],
    mechanism: string,
    totalAgents: number
  ): { verdict: string; confidence: number } {
    const validVotes = votes.filter((v) => v.confidence > 0);

    if (validVotes.length === 0) {
      throw new ConsensusError("All agents failed to respond", votes);
    }

    // Simple text matching for consensus
    const responses = validVotes.map((v) => v.response.trim().toLowerCase());
    const frequency: Record<string, number> = {};
    responses.forEach((r) => {
      frequency[r] = (frequency[r] || 0) + 1;
    });

    const sorted = Object.entries(frequency).sort((a, b) => b[1] - a[1]);
    const [topResponse, topCount] = sorted[0];

    const f = topCount;
    const n = totalAgents;
    const maxFaulty = Math.floor((n - 1) / 3); // Byzantine fault tolerance

    switch (mechanism) {
      case "unanimous":
        if (f === n) {
          return { verdict: topResponse, confidence: 1.0 };
        }
        throw new ConsensusError(
          `Unanimous consensus failed: ${f}/${n} agreement`,
          votes
        );

      case "majority":
        if (f > n / 2) {
          return { verdict: topResponse, confidence: f / n };
        }
        throw new ConsensusError(
          `Majority consensus failed: ${f}/${n} agreement`,
          votes
        );

      case "byzantine":
      default:
        if (f >= n - maxFaulty) {
          return { verdict: topResponse, confidence: f / n };
        }
        throw new ConsensusError(
          `Byzantine consensus failed: ${f}/${n} agreement (need ${n - maxFaulty})`,
          votes
        );
    }
  }

  private generateProof(votes: A2AVote[], consensus: string): string {
    const payload = {
      votes: votes.map((v) => ({
        agent: v.agentId,
        response: v.response,
        confidence: v.confidence,
        timestamp: v.timestamp,
      })),
      consensus,
      timestamp: new Date().toISOString(),
    };
    // Simple hash-based proof (production would use cryptographic signing)
    const data = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `l2b-proof:${Math.abs(hash).toString(16)}:${data.length}`;
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
