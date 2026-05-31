/**
 * lib2b — The Protocol Layer for B2B AI
 * Unified SDK for MCP, A2A, ACP, libp2p, and ABCI
 *
 * @example
 * ```typescript
 * import { Lib2B } from '@csoai/lib2b';
 *
 * const client = Lib2B.create({
 *   apiKey: process.env.CSOAI_API_KEY,
 *   protocols: ['mcp', 'a2a', 'acp'],
 * });
 *
 * // Discover MCP tools
 * const tools = await client.mcp.discover();
 *
 * // Delegate to agent council
 * const result = await client.a2a.delegate({
 *   agents: ['risk-agent', 'compliance-agent'],
 *   task: 'Assess AI system safety',
 *   consensus: 'byzantine',
 * });
 * ```
 */

import { create as createClient } from "./client.js";
export { createClient as create };
export { Lib2BClientImpl } from "./client.js";
export { MCPClientImpl } from "./mcp/index.js";
export { A2AClientImpl } from "./a2a/index.js";
export { ACPClientImpl } from "./acp/index.js";
export { P2PClientImpl } from "./p2p/index.js";
export { ABCIClientImpl } from "./abci/index.js";

export type {
  Lib2BConfig,
  Lib2BClient,
  Protocol,
  // MCP
  MCPClient,
  MCPTool,
  MCPResult,
  MCPServerInfo,
  MCPResource,
  // A2A
  A2AClient,
  A2ADelegateRequest,
  A2ADelegateResult,
  A2AVote,
  AgentCard,
  AgentFilter,
  AgentSkill,
  A2ATask,
  A2ATaskResult,
  A2AMessage,
  A2APart,
  A2AArtifact,
  // ACP
  ACPClient,
  ACPConnectOptions,
  ACPSessionOptions,
  ACPConnection,
  ACPMessage,
  ACPContentBlock,
  ACPThought,
  ACPToolUpdate,
  ACPSessionInfo,
  // P2P
  P2PClient,
  P2PPeer,
  P2PMessage,
  // ABCI
  ABCIClient,
  ABCIAttestRequest,
  ABCIAttestResult,
  ABCIAttestation,
  // Health & Errors
  HealthReport,
  ProtocolHealth,
} from "./types.js";

export {
  Lib2BError,
  ProtocolError,
  TimeoutError,
  ConsensusError,
} from "./types.js";

/** Convenience namespace */
export const Lib2B = {
  create: createClient,
} as const;
