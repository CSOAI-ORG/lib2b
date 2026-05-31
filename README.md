# lib2b

**The Protocol Layer for B2B AI**

Unified SDK for MCP, A2A, ACP, libp2p, and ABCI. One library to connect your enterprise to the AI agent ecosystem.

[![npm](https://img.shields.io/npm/v/@csoai/lib2b)](https://www.npmjs.com/package/@csoai/lib2b)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Quick Start

### TypeScript / JavaScript

```bash
npm install @csoai/lib2b
```

```typescript
import { Lib2B } from '@csoai/lib2b';

const client = Lib2B.create({
  apiKey: process.env.CSOAI_API_KEY,
  protocols: ['mcp', 'a2a', 'acp'],
});

// Discover MCP tools
const tools = await client.mcp.discover();

// Delegate to an agent council with Byzantine consensus
const result = await client.a2a.delegate({
  agents: ['risk-agent', 'compliance-agent'],
  task: 'Assess AI system safety',
  consensus: 'byzantine',
});

console.log(result.verdict);   // Council verdict
console.log(result.confidence); // 0-1 confidence score
console.log(result.proof);      // Cryptographic proof
```

### Python

```bash
pip install lib2b
```

```python
from lib2b import Lib2B

client = Lib2B(api_key=os.environ["CSOAI_API_KEY"])

# Discover MCP tools
tools = client.mcp.discover()

# Delegate to agent council
result = client.a2a.delegate(
    agents=["risk-agent", "compliance-agent"],
    task="Assess AI system safety",
    consensus="byzantine",
)

print(result["verdict"])
```

### Go

```bash
go get github.com/CSOAI-ORG/lib2b
```

```go
package main

import (
    "github.com/CSOAI-ORG/lib2b"
)

func main() {
    client, _ := lib2b.New(lib2b.Config{
        APIKey: os.Getenv("CSOAI_API_KEY"),
    })

    tools, _ := client.MCP.Discover("")
    result, _ := client.A2A.Delegate(
        []string{"risk-agent", "compliance-agent"},
        "Assess AI system safety",
        "byzantine",
    )
}
```

---

## Supported Protocols

| Protocol | Status | Description |
|----------|--------|-------------|
| **MCP** | ✅ Live | Model Context Protocol — tool discovery and invocation |
| **A2A** | ✅ Live | Agent-to-Agent — delegation with Byzantine consensus |
| **ACP** | 🔄 Beta | Agent Communication Protocol — WebSocket streaming |
| **libp2p** | ⏳ Coming | Peer-to-peer agent mesh |
| **ABCI** | ⏳ Coming | On-chain trust registry |

---

## Configuration

```typescript
const client = Lib2B.create({
  apiKey: 'your-api-key',           // Required
  baseUrl: 'https://api.csoai.org', // Optional
  protocols: ['mcp', 'a2a', 'acp'], // Optional
  timeout: 30000,                   // Optional (ms)
  fetch: customFetch,               // Optional
});
```

---

## MCP

```typescript
// Discover tools from all connected servers
const tools = await client.mcp.discover();

// Discover from a specific server
const tools = await client.mcp.discover('vercel-deploy');

// Invoke a tool
const result = await client.mcp.invoke('deploy', {
  project: 'my-app',
  env: 'production',
});

// List connected servers
const servers = await client.mcp.listServers();
```

---

## A2A

```typescript
// Get agent card
const card = await client.a2a.getAgentCard('https://agents.csoai.org/risk');

// List available agents
const agents = await client.a2a.listAgents({ tags: ['compliance'] });

// Delegate with consensus
const result = await client.a2a.delegate({
  agents: ['risk-agent', 'compliance-agent', 'audit-agent'],
  task: 'Review this AI deployment for EU AI Act compliance',
  consensus: 'byzantine', // 'byzantine' | 'majority' | 'unanimous'
  timeout: 60000,
});

// Access results
result.verdict;    // Final council decision
result.confidence; // Agreement ratio 0-1
result.votes;      // Individual agent responses
result.proof;      // Cryptographic proof hash
```

### Consensus Algorithms

- **Byzantine** (default): Tolerates up to ⌊(n-1)/3⌋ faulty agents. Requires n - maxFaulty agreement.
- **Majority**: Simple majority (>50%) wins.
- **Unanimous**: All agents must agree.

---

## ACP

```typescript
// Create a session
const sessionId = await client.acp.createSession({ model: 'gpt-4o' });

// Connect via WebSocket
const conn = await client.acp.connect(sessionId);

// Send messages
await conn.send('Analyze this compliance report');

// Receive responses
conn.onMessage((msg) => {
  console.log(msg.role, msg.content);
});

// Receive chain-of-thought updates
conn.onThinking((thought) => {
  console.log(`Step ${thought.step}: ${thought.content}`);
});

// Receive tool progress
conn.onToolProgress((update) => {
  console.log(`${update.tool}: ${update.status}`);
});

// Clean up
await conn.close();
```

---

## Health Check

```typescript
const health = await client.health();

console.log(health.overall); // 'healthy' | 'degraded' | 'unhealthy'
console.log(health.protocols.mcp); // { status: 'up', version: '1.0.0' }
console.log(health.latency.mcp); // 45 (ms)
```

---

## Error Handling

```typescript
import { Lib2BError, ProtocolError, TimeoutError, ConsensusError } from '@csoai/lib2b';

try {
  await client.a2a.delegate({ agents: ['agent-1'], task: 'test' });
} catch (err) {
  if (err instanceof ConsensusError) {
    console.log('Votes:', err.votes);
  } else if (err instanceof TimeoutError) {
    console.log('Protocol:', err.protocol);
  } else if (err instanceof ProtocolError) {
    console.log('Code:', err.code);
  }
}
```

---

## License

MIT © CSOAI
