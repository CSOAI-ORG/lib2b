/**
 * lib2b — Core type definitions
 * Unified protocol layer for B2B AI
 */

export type Protocol = "mcp" | "a2a" | "acp" | "p2p" | "abci";

export interface Lib2BConfig {
  /** CSOAI API key */
  apiKey: string;
  /** Base URL for the CSOAI gateway (default: https://api.csoai.org) */
  baseUrl?: string;
  /** Protocols to enable */
  protocols?: Protocol[];
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Custom fetch implementation */
  fetch?: typeof globalThis.fetch;
}

export interface Lib2BClient {
  readonly config: Required<Lib2BConfig>;
  readonly mcp: MCPClient;
  readonly a2a: A2AClient;
  readonly acp: ACPClient;
  readonly p2p: P2PClient;
  readonly abci: ABCIClient;
  /** Health check all enabled protocols */
  health(): Promise<HealthReport>;
  /** Close all connections */
  close(): Promise<void>;
}

// ── MCP Types ──────────────────────────────────────────────

export interface MCPClient {
  /** Discover available tools from connected MCP servers */
  discover(serverName?: string): Promise<MCPTool[]>;
  /** Invoke a tool by name with parameters */
  invoke<T = unknown>(toolName: string, params: Record<string, unknown>): Promise<MCPResult<T>>;
  /** List connected MCP servers */
  listServers(): Promise<MCPServerInfo[]>;
  /** Call a resource */
  readResource(uri: string): Promise<MCPResource>;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  server?: string;
}

export interface MCPResult<T> {
  content: T;
  isError?: boolean;
  metadata?: Record<string, unknown>;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  tools: number;
  status: "connected" | "disconnected" | "error";
}

export interface MCPResource {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

// ── A2A Types ──────────────────────────────────────────────

export interface A2AClient {
  /** Delegate a task to a council of agents */
  delegate(request: A2ADelegateRequest): Promise<A2ADelegateResult>;
  /** Get agent card for a registered agent */
  getAgentCard(agentUrl: string): Promise<AgentCard>;
  /** List available agents in the registry */
  listAgents(filter?: AgentFilter): Promise<AgentCard[]>;
  /** Send a direct task to a single agent */
  sendTask(agentUrl: string, task: A2ATask): Promise<A2ATaskResult>;
}

export interface A2ADelegateRequest {
  /** Agent identifiers or URLs to include in the council */
  agents: string[];
  /** Task description or payload */
  task: string;
  /** Consensus mechanism: 'byzantine' | 'majority' | 'unanimous' */
  consensus?: "byzantine" | "majority" | "unanimous";
  /** Timeout in ms (default: 45000) */
  timeout?: number;
  /** Context / previous conversation */
  context?: A2AMessage[];
}

export interface A2ADelegateResult {
  /** Final verdict from the council */
  verdict: string;
  /** Confidence score 0-1 */
  confidence: number;
  /** Individual agent responses */
  votes: A2AVote[];
  /** Consensus mechanism used */
  consensus: string;
  /** Cryptographic proof of consensus */
  proof?: string;
  /** Task metadata */
  metadata?: Record<string, unknown>;
}

export interface A2AVote {
  agentId: string;
  agentName: string;
  response: string;
  confidence: number;
  signature?: string;
  timestamp: string;
}

export interface AgentCard {
  name: string;
  description?: string;
  url: string;
  version?: string;
  capabilities?: {
    streaming?: boolean;
    pushNotifications?: boolean;
  };
  skills?: AgentSkill[];
}

export interface AgentSkill {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
}

export interface AgentFilter {
  tags?: string[];
  capability?: string;
}

export interface A2ATask {
  id: string;
  message: A2AMessage;
  contextId?: string;
}

export interface A2AMessage {
  role: "user" | "agent";
  parts: A2APart[];
}

export interface A2APart {
  type: "text" | "file" | "data";
  text?: string;
  file?: { name: string; mimeType: string; bytes?: string };
  data?: Record<string, unknown>;
}

export interface A2ATaskResult {
  taskId: string;
  status: "pending" | "completed" | "failed";
  artifacts?: A2AArtifact[];
  error?: string;
}

export interface A2AArtifact {
  artifactId: string;
  name?: string;
  description?: string;
  parts: A2APart[];
}

// ── ACP Types ──────────────────────────────────────────────

export interface ACPClient {
  /** Connect to an ACP session */
  connect(sessionId: string, options?: ACPConnectOptions): Promise<ACPConnection>;
  /** Create a new session */
  createSession(options?: ACPSessionOptions): Promise<string>;
  /** List active sessions */
  listSessions(): Promise<ACPSessionInfo[]>;
}

export interface ACPConnectOptions {
  /** Resume from previous state */
  resumeFrom?: string;
  /** Authentication token */
  authToken?: string;
}

export interface ACPSessionOptions {
  model?: string;
  mode?: "agent" | "editor" | "review";
  metadata?: Record<string, unknown>;
}

export interface ACPConnection {
  sessionId: string;
  /** Send a message to the session */
  send(message: string | ACPMessage): Promise<void>;
  /** Receive messages via callback */
  onMessage(callback: (msg: ACPMessage) => void): () => void;
  /** Receive thinking/chain-of-thought updates */
  onThinking(callback: (thought: ACPThought) => void): () => void;
  /** Receive tool execution updates */
  onToolProgress(callback: (update: ACPToolUpdate) => void): () => void;
  /** Close the connection */
  close(): Promise<void>;
  /** Connection state */
  state: "connecting" | "open" | "closed" | "error";
}

export interface ACPMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string | ACPContentBlock[];
  timestamp: string;
}

export interface ACPContentBlock {
  type: "text" | "image" | "audio" | "resource";
  text?: string;
  mimeType?: string;
  data?: string;
  resource?: { uri: string; mimeType: string };
}

export interface ACPThought {
  step: number;
  content: string;
  timestamp: string;
}

export interface ACPToolUpdate {
  tool: string;
  status: "start" | "progress" | "complete" | "error";
  input?: Record<string, unknown>;
  output?: unknown;
  error?: string;
}

export interface ACPSessionInfo {
  id: string;
  model?: string;
  mode?: string;
  createdAt: string;
  lastActivity?: string;
}

// ── P2P Types (stub) ───────────────────────────────────────

export interface P2PClient {
  /** Discover peers on the mesh */
  discover(topic?: string): Promise<P2PPeer[]>;
  /** Send a message to a peer */
  send(peerId: string, message: P2PMessage): Promise<void>;
  /** Listen for incoming messages */
  onMessage(callback: (msg: P2PMessage) => void): () => void;
  /** Get local peer ID */
  getPeerId(): Promise<string>;
}

export interface P2PPeer {
  peerId: string;
  addresses: string[];
  protocols: string[];
  agentRecord?: Record<string, unknown>;
}

export interface P2PMessage {
  from: string;
  to?: string;
  topic?: string;
  payload: unknown;
  timestamp: string;
  signature?: string;
}

// ── ABCI Types (stub) ──────────────────────────────────────

export interface ABCIClient {
  /** Attest an agent identity or compliance status on-chain */
  attest(request: ABCIAttestRequest): Promise<ABCIAttestResult>;
  /** Query an attestation by ID */
  query(attestationId: string): Promise<ABCIAttestation | null>;
  /** Verify an attestation cryptographically */
  verify(attestation: ABCIAttestation): Promise<boolean>;
}

export interface ABCIAttestRequest {
  type: "agent" | "model" | "compliance";
  subject: string;
  data: Record<string, unknown>;
  signers: string[];
}

export interface ABCIAttestResult {
  attestationId: string;
  txHash: string;
  timestamp: string;
  signatures: string[];
}

export interface ABCIAttestation {
  id: string;
  type: string;
  subject: string;
  data: Record<string, unknown>;
  blockHeight: number;
  txHash: string;
  timestamp: string;
  signatures: string[];
}

// ── Health ─────────────────────────────────────────────────

export interface HealthReport {
  overall: "healthy" | "degraded" | "unhealthy";
  protocols: Record<Protocol, ProtocolHealth>;
  latency: Record<Protocol, number>;
  timestamp: string;
}

export interface ProtocolHealth {
  status: "up" | "down" | "unknown";
  version?: string;
  message?: string;
}

// ── Errors ─────────────────────────────────────────────────

export class Lib2BError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly protocol?: Protocol,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "Lib2BError";
  }
}

export class ProtocolError extends Lib2BError {
  constructor(protocol: Protocol, message: string, code: string, cause?: unknown) {
    super(message, code, protocol, cause);
    this.name = "ProtocolError";
  }
}

export class TimeoutError extends Lib2BError {
  constructor(protocol: Protocol, timeoutMs: number) {
    super(
      `${protocol} request timed out after ${timeoutMs}ms`,
      "TIMEOUT",
      protocol
    );
    this.name = "TimeoutError";
  }
}

export class ConsensusError extends Lib2BError {
  constructor(message: string, public readonly votes: A2AVote[]) {
    super(message, "CONSENSUS_FAILED", "a2a");
    this.name = "ConsensusError";
  }
}
