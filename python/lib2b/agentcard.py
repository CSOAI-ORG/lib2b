"""
lib2b.agentcard — turn a MEOK MCP server into a valid A2A Agent Card.

The bridge nobody else has built: every MCP server in the fleet becomes a
discoverable A2A agent (agentic-web), not just an MCP-directory listing.

Input  : an MCP server-card dict — either the rich `.well-known/mcp-server-card.json`
         (has a `tools` list → A2A skills) or the MCP-Registry `server.json` (fallback).
Output : an A2A AgentCard dict (A2A spec — required: name, version, url, capabilities).

A2A AgentCard required fields: name, version, url, capabilities.  Everything else is
optional but we populate provider, description, skills, IO modes, and documentationUrl.

Stdlib only. MIT © CSOAI LTD (MEOK AI Labs).
"""
from __future__ import annotations

import re

A2A_PROTOCOL_VERSION = "0.3.0"
_PROVIDER = {"organization": "MEOK AI LABS", "url": "https://meok.ai"}
_IO_MODES = ["application/json", "text/plain"]


def _slug(name: str) -> str:
    """`io.github.CSOAI-ORG/dora-compliance-mcp` or `dora-compliance-mcp` -> `dora-compliance-mcp`."""
    base = (name or "").rsplit("/", 1)[-1]
    return re.sub(r"[^a-z0-9-]+", "-", base.lower()).strip("-")


def _humanize(tool_name: str) -> str:
    return re.sub(r"[_-]+", " ", tool_name or "").strip().title()


def _tags_from(slug: str, description: str) -> list:
    """Cheap, honest tags from the slug + description — no invented metadata."""
    words = set(re.split(r"[^a-z0-9]+", (slug + " " + (description or "")).lower()))
    known = ["compliance", "eu-ai-act", "dora", "nis2", "cra", "gdpr", "governance",
             "bias", "watermark", "attestation", "audit", "security", "agent", "a2a",
             "trade", "haulage", "robotics", "care", "finance", "health"]
    tags = [k for k in known if k.replace("-", "") in words or k in slug]
    return tags or ["mcp", "meok"]


def _skills_from_tools(tools: list, slug: str, description: str) -> list:
    """Each MCP tool -> one A2A AgentSkill (id, name, description required-ish)."""
    skills = []
    for t in tools or []:
        tid = t.get("name") or t.get("id")
        if not tid:
            continue
        skills.append({
            "id": tid,
            "name": _humanize(tid),
            "description": (t.get("description") or f"{_humanize(tid)} — a tool of the {slug} MCP.").strip(),
            "tags": _tags_from(slug, description),
            "inputModes": _IO_MODES,
            "outputModes": _IO_MODES,
        })
    return skills


def mcp_to_agent_card(card: dict, base_url: str = "https://mcp.meok.ai") -> dict:
    """Map a MEOK MCP server-card (or server.json) to a valid A2A AgentCard.

    base_url is where the agent is reachable; the A2A endpoint is `{base_url}/{slug}/a2a`.
    Set it to your real gateway/host before publishing the card.
    """
    if not isinstance(card, dict):
        raise TypeError("card must be a dict (parsed mcp-server-card.json or server.json)")
    name_field = card.get("name") or card.get("title") or "meok-mcp"
    slug = _slug(name_field)
    title = card.get("title") or _humanize(slug)
    version = str(card.get("version") or "1.0.0")
    description = (card.get("description") or f"{title} — a MEOK compliance MCP, exposed over A2A.").strip()
    tools = card.get("tools") or []

    skills = _skills_from_tools(tools, slug, description)
    if not skills:  # server.json had no tools -> one skill = the MCP's own purpose
        skills = [{
            "id": slug,
            "name": title,
            "description": description,
            "tags": _tags_from(slug, description),
            "inputModes": _IO_MODES, "outputModes": _IO_MODES,
        }]

    repo = ""
    r = card.get("repository") or card.get("homepage")
    if isinstance(r, dict):
        repo = r.get("url", "")
    elif isinstance(r, str):
        repo = r

    agent_card = {
        # ── A2A REQUIRED ───────────────────────────────
        "name": title,
        "version": version,
        "url": f"{base_url.rstrip('/')}/{slug}/a2a",
        "capabilities": {
            "streaming": False,            # MEOK MCPs are request/response (honest)
            "pushNotifications": False,
            "stateTransitionHistory": False,
        },
        # ── A2A optional (populated) ───────────────────
        "protocolVersion": A2A_PROTOCOL_VERSION,
        "description": description,
        "provider": dict(_PROVIDER),
        "defaultInputModes": list(_IO_MODES),
        "defaultOutputModes": list(_IO_MODES),
        "skills": skills,
        "documentationUrl": repo or "https://meok.ai/developers",
        # MEOK-specific, namespaced so it never breaks A2A parsers:
        "x-meok": {
            "mcp_name": name_field,
            "verifier": "https://proofof.ai/verify",
            "governed_by": "CSOAI 52-article charter",
        },
    }
    return agent_card


REQUIRED = ("name", "version", "url", "capabilities")


def validate(agent_card: dict) -> tuple:
    """Cheap A2A validity check — returns (ok, [missing/invalid])."""
    problems = []
    for f in REQUIRED:
        if f not in agent_card or agent_card[f] in (None, "", {}):
            problems.append(f"missing required: {f}")
    caps = agent_card.get("capabilities")
    if not isinstance(caps, dict):
        problems.append("capabilities must be an object")
    for sk in agent_card.get("skills", []):
        if not sk.get("id") or not sk.get("name"):
            problems.append("a skill is missing id/name")
            break
    return (not problems, problems)


# ── fleet sweep: turn a whole MCP marketplace into A2A Agent Cards ────────────
import json as _json
import os as _os


def load_mcp_card(pkg_dir: str) -> dict | None:
    """Prefer the rich .well-known/mcp-server-card.json (has tools); fall back to server.json."""
    rich = _os.path.join(pkg_dir, ".well-known", "mcp-server-card.json")
    sj = _os.path.join(pkg_dir, "server.json")
    for p in (rich, sj):
        if _os.path.isfile(p):
            try:
                return _json.load(open(p, encoding="utf-8"))
            except Exception:
                continue
    return None


def sweep_marketplace(root: str, base_url: str = "https://mcp.meok.ai", write: bool = False) -> dict:
    """Generate (and optionally write) an A2A Agent Card for every MCP under `root`.

    write=True drops `.well-known/agent-card.json` into each package so it ships on next publish.
    Returns a summary {generated, written, invalid, skipped}.
    """
    gen = wrote = invalid = skipped = 0
    cards = []
    for name in sorted(_os.listdir(root)):
        pkg = _os.path.join(root, name)
        if not _os.path.isdir(pkg) or name.startswith((".", "_")):
            continue
        card = load_mcp_card(pkg)
        if not card:
            skipped += 1
            continue
        ac = mcp_to_agent_card(card, base_url=base_url)
        ok, _ = validate(ac)
        if not ok:
            invalid += 1
            continue
        gen += 1
        cards.append({"pkg": name, "skills": len(ac["skills"])})
        if write:
            wk = _os.path.join(pkg, ".well-known")
            _os.makedirs(wk, exist_ok=True)
            with open(_os.path.join(wk, "agent-card.json"), "w", encoding="utf-8") as f:
                _json.dump(ac, f, indent=2, ensure_ascii=False)
            wrote += 1
    return {"generated": gen, "written": wrote, "invalid": invalid, "skipped_no_metadata": skipped,
            "total_skills": sum(c["skills"] for c in cards)}


# ── A2A registry catalog + ACP descriptors (the discoverable, served layer) ───
def build_catalog(root: str, base_url: str = "https://mcp.meok.ai",
                  registry_url: str = "https://meok.ai/.well-known/agents.json") -> dict:
    """A single A2A registry document listing every MEOK agent — the one canonical,
    crawlable URL an A2A client/registry fetches to discover the whole fleet."""
    agents = []
    for name in sorted(_os.listdir(root)):
        pkg = _os.path.join(root, name)
        if not _os.path.isdir(pkg) or name.startswith((".", "_")):
            continue
        card = load_mcp_card(pkg)
        if not card:
            continue
        ac = mcp_to_agent_card(card, base_url=base_url)
        if validate(ac)[0]:
            agents.append(ac)
    return {
        "registry": "MEOK A2A Agent Registry",
        "provider": dict(_PROVIDER),
        "url": registry_url,
        "protocolVersion": A2A_PROTOCOL_VERSION,
        "count": len(agents),
        "total_skills": sum(len(a["skills"]) for a in agents),
        "agents": agents,
    }


def mcp_to_acp_descriptor(card: dict) -> dict:
    """ACP (IBM BeeAI, REST) agent descriptor from the same MCP metadata —
    so the fleet speaks MCP + A2A + ACP. ACP is manifest + REST; no SDK needed."""
    ac = mcp_to_agent_card(card)
    return {
        "name": _slug(card.get("name") or card.get("title") or "meok-mcp"),
        "description": ac["description"],
        "metadata": {
            "provider": _PROVIDER["organization"],
            "version": ac["version"],
            "documentation": ac.get("documentationUrl"),
            "tags": ac["skills"][0]["tags"] if ac["skills"] else [],
            "governed_by": "CSOAI 52-article charter",
        },
        # ACP capabilities mirror the A2A skills (tools)
        "capabilities": [{"name": s["id"], "description": s["description"]} for s in ac["skills"]],
        "input_content_types": list(_IO_MODES),
        "output_content_types": list(_IO_MODES),
    }
