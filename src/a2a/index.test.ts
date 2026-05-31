import { describe, it, expect, vi, beforeEach } from "vitest";
import { A2AClientImpl } from "./index.js";
import { ProtocolError, ConsensusError } from "../types.js";

const mockFetch = vi.fn();
const config = {
  apiKey: "test-key",
  baseUrl: "https://api.test.com",
  protocols: ["a2a"] as const,
  timeout: 5000,
  fetch: mockFetch,
};

describe("A2AClient", () => {
  let client: A2AClientImpl;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new A2AClientImpl(config as any);
  });

  it("requires at least 2 agents for consensus", async () => {
    await expect(
      client.delegate({ agents: ["agent-1"], task: "test", consensus: "byzantine" })
    ).rejects.toThrow(ProtocolError);
  });

  it("applies byzantine consensus correctly", async () => {
    // Use full URLs so getAgentCard hits well-known endpoint directly
    const agents = ["http://a1.test", "http://a2.test"];

    // Mock well-known agent cards
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/.well-known/agent.json")) {
        const name = url.includes("a1") ? "agent-1" : "agent-2";
        return Promise.resolve({
          ok: true,
          json: async () => ({ name, url: url.replace("/.well-known/agent.json", "") }),
        });
      }
      if (url.includes("/a2a/task")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: "completed",
            artifacts: [{ parts: [{ type: "text", text: "safe" }] }],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, statusText: "Not Found", text: async () => "" });
    });

    const result = await client.delegate({
      agents,
      task: "Is this safe?",
      consensus: "byzantine",
    });

    expect(result.verdict).toBe("safe");
    expect(result.confidence).toBe(1);
    expect(result.votes).toHaveLength(2);
    expect(result.proof).toMatch(/^l2b-proof:/);
  });

  it("throws ConsensusError when agents disagree under unanimous", async () => {
    let taskCallCount = 0;
    mockFetch.mockImplementation((url: string, init?: any) => {
      if (url.includes("/.well-known/agent.json")) {
        const name = url.includes("a1") ? "a1" : "a2";
        return Promise.resolve({
          ok: true,
          json: async () => ({ name, url: url.replace("/.well-known/agent.json", "") }),
        });
      }
      if (url.includes("/a2a/task")) {
        taskCallCount++;
        const text = taskCallCount === 1 ? "yes" : "no";
        return Promise.resolve({
          ok: true,
          json: async () => ({
            status: "completed",
            artifacts: [{ parts: [{ type: "text", text }] }],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, statusText: "Not Found", text: async () => "" });
    });

    await expect(
      client.delegate({ agents: ["http://a1", "http://a2"], task: "test", consensus: "unanimous" })
    ).rejects.toThrow(ConsensusError);
  });

  it("fetches agent card from well-known endpoint", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes("/.well-known/agent.json")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ name: "Test Agent", url: "http://agent.test" }),
        });
      }
      return Promise.resolve({ ok: false, status: 404, statusText: "Not Found", text: async () => "" });
    });

    const card = await client.getAgentCard("http://agent.test");
    expect(card.name).toBe("Test Agent");
  });
});
