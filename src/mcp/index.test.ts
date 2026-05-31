import { describe, it, expect, vi, beforeEach } from "vitest";
import { MCPClientImpl } from "./index.js";
import { ProtocolError, TimeoutError } from "../types.js";

const mockFetch = vi.fn();
const config = {
  apiKey: "test-key",
  baseUrl: "https://api.test.com",
  protocols: ["mcp"] as const,
  timeout: 5000,
  fetch: mockFetch,
};

describe("MCPClient", () => {
  let client: MCPClientImpl;

  beforeEach(() => {
    mockFetch.mockClear();
    client = new MCPClientImpl(config as any);
  });

  it("discovers tools from all servers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tools: [{ name: "deploy", description: "Deploy app" }] }),
    });

    const tools = await client.discover();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("deploy");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test.com/mcp/tools",
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer test-key" }) })
    );
  });

  it("invokes a tool with parameters", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: { status: "deployed" } }),
    });

    const result = await client.invoke("deploy", { project: "my-app" });
    expect(result.content).toEqual({ status: "deployed" });
  });

  it("throws ProtocolError on HTTP error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => "Tool not found",
    });

    await expect(client.invoke("missing", {})).rejects.toThrow(ProtocolError);
  });

  it("throws TimeoutError on abort", async () => {
    mockFetch.mockImplementationOnce(() => {
      const err = new Error("The operation was aborted");
      (err as any).name = "AbortError";
      throw err;
    });

    await expect(client.discover()).rejects.toThrow(TimeoutError);
  });

  it("lists connected servers", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ name: "vercel", version: "1.0.0", tools: 5, status: "connected" }],
    });

    const servers = await client.listServers();
    expect(servers).toHaveLength(1);
    expect(servers[0].name).toBe("vercel");
  });
});
