/**
 * lib2b Basic Example
 * Demonstrates MCP discovery, A2A delegation, and ACP streaming
 */

import { Lib2B } from "../src/index.js";

async function main() {
  const client = Lib2B.create({
    apiKey: process.env.CSOAI_API_KEY || "demo-key",
    protocols: ["mcp", "a2a", "acp"],
  });

  // Health check
  const health = await client.health();
  console.log("Health:", health.overall);

  // MCP: Discover tools
  try {
    const tools = await client.mcp.discover();
    console.log("MCP Tools:", tools.length);
  } catch (err) {
    console.log("MCP discovery:", err instanceof Error ? err.message : err);
  }

  // A2A: Delegate to council
  try {
    const result = await client.a2a.delegate({
      agents: ["risk-agent", "compliance-agent"],
      task: "Assess AI system safety",
      consensus: "byzantine",
    });
    console.log("A2A Verdict:", result.verdict);
    console.log("Confidence:", result.confidence);
  } catch (err) {
    console.log("A2A delegation:", err instanceof Error ? err.message : err);
  }

  // ACP: Create session
  try {
    const sessionId = await client.acp.createSession({ model: "gpt-4o" });
    console.log("ACP Session:", sessionId);
  } catch (err) {
    console.log("ACP session:", err instanceof Error ? err.message : err);
  }

  await client.close();
}

main().catch(console.error);
