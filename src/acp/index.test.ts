import { describe, it, expect, vi, beforeEach } from "vitest";
import { ACPClientImpl } from "./index.js";

const mockFetch = vi.fn();
const config = {
  apiKey: "test-key",
  baseUrl: "https://api.test.com",
  protocols: ["acp"] as const,
  timeout: 5000,
  fetch: mockFetch,
};

describe("ACPClient", () => {
  let client: ACPClientImpl;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new ACPClientImpl(config as any);
  });

  it("creates a session", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ sessionId: "sess_123" }),
    });

    const id = await client.createSession({ model: "gpt-4o" });
    expect(id).toBe("sess_123");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test.com/acp/sessions",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ model: "gpt-4o" }) })
    );
  });

  it("lists sessions", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: "sess_123", createdAt: "2026-01-01T00:00:00Z" }],
    });

    const sessions = await client.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe("sess_123");
  });

  it("reports health status", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: "ok", version: "0.9.2" }),
    });

    const health = await client.health();
    expect(health.status).toBe("up");
    expect(health.version).toBe("0.9.2");
  });
});
