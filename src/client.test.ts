import { describe, it, expect, vi } from "vitest";
import { Lib2BClientImpl } from "./client.js";
import { Lib2BError } from "./types.js";

describe("Lib2BClient", () => {
  it("requires an API key", () => {
    expect(() => new Lib2BClientImpl({ apiKey: "" } as any)).toThrow(Lib2BError);
  });

  it("creates with default config", () => {
    const client = new Lib2BClientImpl({ apiKey: "test" });
    expect(client.config.apiKey).toBe("test");
    expect(client.config.baseUrl).toBe("https://api.csoai.org");
    expect(client.config.protocols).toEqual(["mcp", "a2a", "acp"]);
    expect(client.config.timeout).toBe(30000);
  });

  it("strips trailing slash from baseUrl", () => {
    const client = new Lib2BClientImpl({ apiKey: "test", baseUrl: "https://api.test.com/" });
    expect(client.config.baseUrl).toBe("https://api.test.com");
  });

  it("exposes all protocol clients", () => {
    const client = new Lib2BClientImpl({ apiKey: "test" });
    expect(client.mcp).toBeDefined();
    expect(client.a2a).toBeDefined();
    expect(client.acp).toBeDefined();
    expect(client.p2p).toBeDefined();
    expect(client.abci).toBeDefined();
  });

  it("health check aggregates protocol status", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ status: "ok" }) });

    const client = new Lib2BClientImpl({
      apiKey: "test",
      protocols: ["mcp"],
      fetch: mockFetch,
    });

    const health = await client.health();
    expect(health.overall).toBe("healthy");
    expect(health.protocols.mcp.status).toBe("up");
    expect(health.latency.mcp).toBeGreaterThanOrEqual(0);
  });

  it("close cleans up connections", async () => {
    const client = new Lib2BClientImpl({ apiKey: "test" });
    await expect(client.close()).resolves.not.toThrow();
  });
});
