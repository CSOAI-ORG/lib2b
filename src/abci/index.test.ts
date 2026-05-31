import { describe, it, expect, vi, beforeEach } from "vitest";
import { ABCIClientImpl } from "./index.js";

const mockFetch = vi.fn();
const config = {
  apiKey: "test-key",
  baseUrl: "https://api.test.com",
  protocols: ["abci"] as const,
  timeout: 5000,
  fetch: mockFetch,
};

describe("ABCIClient", () => {
  let client: ABCIClientImpl;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new ABCIClientImpl(config as any);
  });

  it("attests a subject on-chain", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        attestationId: "att_123",
        txHash: "0xabc",
        timestamp: "2026-01-01T00:00:00Z",
        signatures: ["sig1"],
      }),
    });

    const result = await client.attest({
      type: "agent",
      subject: "agent-1",
      data: { status: "compliant" },
      signers: ["csoroot"],
    });

    expect(result.attestationId).toBe("att_123");
    expect(result.txHash).toBe("0xabc");
  });

  it("queries an attestation by id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "att_123",
        type: "agent",
        subject: "agent-1",
        data: {},
        blockHeight: 100,
        txHash: "0xabc",
        timestamp: "2026-01-01T00:00:00Z",
        signatures: [],
      }),
    });

    const att = await client.query("att_123");
    expect(att).not.toBeNull();
    expect(att?.id).toBe("att_123");
  });

  it("returns null for missing attestation", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => "Not found",
    });

    const att = await client.query("missing");
    expect(att).toBeNull();
  });

  it("verifies an attestation", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true }),
    });

    const valid = await client.verify({
      id: "att_123",
      type: "agent",
      subject: "agent-1",
      data: {},
      blockHeight: 100,
      txHash: "0xabc",
      timestamp: "2026-01-01T00:00:00Z",
      signatures: ["sig1"],
    });

    expect(valid).toBe(true);
  });
});
