# MIGRATION_NOTE - MCP 2026-07-28 wire - class `header-add`

**Date:** 2026-10-08 - **Lane:** M4 MCP-migration (header-add wave 2, batch 2) - **Branch:** `mcp-2026-wire-header-add`  
**Runbook:** `MCP_2026_WIRE_MIGRATION_PLAN_2026-10-07.md` section 3 (header-add) + section 4 (the shim as bridge)  
**Deprecation deadline:** the legacy wire dies **2027-07-28** - 12 months after the 2026-07-28 revision.

## 1. Transport reality

No Python server entry in this repository: the surface is a stdlib / TypeScript SDK (`package.json`, `src/*.ts`, `python/setup.py`). **stdlib/JS: HTTP header surface unchanged; shim on HTTP exposure.** There is no MCP server process here to receive `Mcp-Method` / `Mcp-Name`.

## 2. What changed in this branch

1. **No pin, on purpose:** this repository declares no `mcp` dependency line (no `pyproject.toml` / no `mcp` entry). The runbook forbids inventing one, so nothing was pinned. The `FastMCP -> MCPServer` import rename is therefore also deferred: it is only valid under `mcp>=2.0.0`, which cannot be declared without inventing a dependency line. Carried as a follow-up below.
2. No import rename was needed (no `mcp.server.fastmcp` import in the entry, or no pin to justify the rename).
3. `mcp2026_shim.py` vendored at the repo root (stdlib, zero third-party deps).
4. No server entry file to annotate: no migration-note block was inserted into source. The shim and this note are the whole surface; the HTTP header surface is unchanged until an HTTP exposure wraps it in `ShimASGI`.
5. `MIGRATION_NOTE.md`: class, transport reality, steps applied, verify command, honesty paragraph, follow-ups.

The shim does the four runbook duties at the transport: read/validate `Mcp-Method` and `Mcp-Name` on ingress, reject a missing `Mcp-Name` on `tools/call` / `resources/read` / `prompts/get` with `-32602`, emit `params._meta.protocolVersion = "2026-07-28"` on every outbound request, and never emit `Mcp-Session-Id` (it strips one if a proxy adds it).

## 3. Verify

```bash
PYTHONPATH= /opt/homebrew/bin/python3.11 ~/clawd/mcp_wire_audit.py audit --local lib2b
```

| state | era | migration |
|---|---|---|
| before (default branch) | unknown | header-add |
| **after (this branch)** | **unknown** | **header-add** |
| control (migration-note block removed) | unknown | header-add |
| before, second scanner unit `None` | 2026-07 | header-add |
| after, second scanner unit `python` | 2026-07 | header-add |

Files changed in this branch: `mcp2026_shim.py`, `MIGRATION_NOTE.md`. The scanner reads source/manifest files only: it skips `mcp2026_shim.py` by design (`SELF_FILES`) and does not scan `.md`, so neither `MIGRATION_NOTE.md` nor the shim contributes signals above.

**How to read the `after` row honestly.** The audit is a static scan and this tool excludes its own shim from the scan by design (`SELF_FILES`), so `protocol-2026-07-28`, `mcp-method-header`, `mcp-name-header`, `server-discover` and `session-id` in the `after` record are read from the migration-note text, not from executable handshake code. The `session-id` signal in particular is prose (the note documents that the shim *strips* the header) - the control run, which deletes only that note block, drops back to the row above and shows no `session-id`. Runtime evidence for the wire is the `mcp>=2.0.0` pin (2.3.0 speaks 2026-07-28) plus the vendored shim at the ingress; `mcp>=2.0.0` alone is not a wire signal for this scanner. **After-rows are note-text-driven until a post-merge re-audit.**

## 4. Follow-ups (not in this branch)

* Static declaration surfaces (`.well-known/*.json`, `server.json`, `manifest.json`, `README.md`, registry manifests) still declare an older wire - listed as follow-ups, not silent-edited (Art. 21: a declaration change gets its own commit).
* **Pin + import rename deferred:** add a real `mcp` dependency line (or packaging metadata) first, then pin `mcp>=2.0.0` and apply the `FastMCP -> MCPServer` rename in the same commit. Inventing the line is forbidden by the runbook.
* **JS/stdlib surface:** `package.json` carries no `@modelcontextprotocol/sdk` dependency (only `eventsource`, `ws`), so no JS pin was invented - no JS release speaks 2026-07-28. When any HTTP exposure is added, front it with `mcp2026_shim.ShimASGI`.
* This repository produces a second scanner unit (`.well-known/`): that row is unchanged by this branch, because static JSON declarations are follow-ups (see above), not silent edits.
* stdio carries no HTTP headers: `headers N/A at runtime` until the server is exposed over HTTP, where `ShimASGI` applies. A live probe per plan section 6.5 is owed after merge.

Verify command of record: `PYTHONPATH= /opt/homebrew/bin/python3.11 ~/clawd/mcp_wire_audit.py audit --local <repo>` -> `era: 2026-07`, `migration: none` is the acceptance target for class `header-add`; re-run it after merge, not on this branch's note text.

Plan: `MCP_2026_WIRE_MIGRATION_PLAN_2026-10-07.md` - deadline 2027-07-28 - measurement, not certification.
