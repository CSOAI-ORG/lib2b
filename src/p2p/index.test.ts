import { describe, it, expect, vi, beforeEach } from "vitest";
import { P2PClientImpl } from "./index.js";

const mockFetch = vi.fn();
const config = {
  apiKey: "test-key",
  baseUrl: "https://api.test.com",
  protocols: ["p2p"] as const,
  timeout: 5000,
  fetch: mockFetch,
};

describe("P2PClient", () => {
  let client: P2PClientImpl;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new P2PClientImpl(config as any);
  });

  it("discovers peers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ peerId: "peer1", addresses: ["/ip4/127.0.0.1"] }],
    });

    const peers = await client.discover("test-topic");
    expect(peers).toHaveLength(1);
    expect(peers[0].peerId).toBe("peer1");
  });

  it("gets peer id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ peerId: "local-peer-123" }),
    });

    const id = await client.getPeerId();
    expect(id).toBe("local-peer-123");
    // Second call should be cached
    const id2 = await client.getPeerId();
    expect(id2).toBe("local-peer-123");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("reports health as unknown when gateway down", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));
    const health = await client.health();
    expect(health.status).toBe("unknown");
  });
});
