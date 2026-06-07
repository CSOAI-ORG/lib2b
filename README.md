# Lib2B

[![MEOK AI Labs](https://img.shields.io/badge/MEOK-AI%20Labs-667eea)](https://meok.ai)
[![EU AI Act](https://img.shields.io/badge/EU%20AI%20Act-Compliant-22c55e)](https://councilof.ai)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PyPI](https://img.shields.io/badge/PyPI-Install-3775a9)](https://pypi.org/project/lib2b/)

> The protocol layer for B2B AI — unified SDK for MCP, A2A, ACP, libp2p, and ABCI

The protocol layer for B2B AI — unified SDK for MCP, A2A, ACP, libp2p, and ABCI

---

## 🚀 Quick Start

```bash
# Install via pip
pip install lib2b

# Or install via Smithery
npx -y @smithery/cli@latest install lib2b --client claude
```

## ✨ Features

- MCP protocol compliant
- Easy installation
- Well-documented API
- Production-ready
- Active maintenance

## 📖 Documentation

- [Full Documentation](https://docs.meok.ai/lib2b)
- [API Reference](https://api.meok.ai)
- [EU AI Act Compliance Guide](https://councilof.ai/compliance)

## 🛡️ Compliance

This MCP server is built with **EU AI Act compliance** built-in:

- ✅ Article 9 — Risk Management System
- ✅ Article 13 — Transparency & Instructions for Use
- ✅ Article 15 — Bias Detection & Testing
- ✅ Article 26 — FRIA Support (where applicable)
- ✅ Article 50 — AI Content Watermarking (where applicable)

Need help getting compliant? **[Book a free 15-min diagnostic →](https://cal.com/csoai/august-audit)**

## 🏢 Enterprise

Need custom development, SLA guarantees, or white-label deployment?

- **Pro:** $99/mo — Full MCP suite + EU AI Act tracking
- **Enterprise:** $499/mo — Custom dev + SLA + Dedicated support

[View Pricing →](https://councilof.ai/pricing) | [Contact Sales →](mailto:sales@csoai.org)

## 🤝 Part of the MEOK Ecosystem

This server is part of the **[MEOK AI Labs](https://meok.ai)** ecosystem — 300+ MCP servers for sovereign AI governance.

| Domain | Purpose |
|--------|---------|
| [councilof.ai](https://councilof.ai) | EU AI Act compliance marketplace |
| [safetyof.ai](https://safetyof.ai) | AI safety & monitoring |
| [meok.ai](https://meok.ai) | Sovereign AI platform |
| [cobolbridge.ai](https://cobolbridge.ai) | Legacy modernization |

## 📜 License

MIT © [CSOAI-ORG](https://github.com/CSOAI-ORG)

---

<p align="center">
  <sub>Built with 💜 by <a href="https://meok.ai">MEOK AI Labs</a> · UK Companies House 16939677</sub>
</p>

## 🌐 NEW: MCP → A2A Agent Cards

Turn any MEOK MCP server into a discoverable **A2A Agent Card** — so the fleet is found on
the *agentic web* (A2A registries), not just MCP directories.

```python
from lib2b.agentcard import mcp_to_agent_card, sweep_marketplace

# one MCP -> one valid A2A AgentCard (required: name, version, url, capabilities)
import json
card = json.load(open(".well-known/mcp-server-card.json"))
agent_card = mcp_to_agent_card(card, base_url="https://mcp.meok.ai")

# or the whole fleet -> writes .well-known/agent-card.json per server
sweep_marketplace("mcp-marketplace", write=True)
# → {"generated": 340, "written": 340, "invalid": 0, "total_skills": 1863}
```

Each MCP tool becomes an A2A **skill**. The card carries the MEOK provenance
(`x-meok`: signed-verifier + CSOAI charter) without breaking A2A parsers.
