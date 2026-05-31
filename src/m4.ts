/**
 * lib2b — M4 Gateway Preset
 * Pre-configured client for the CSOAI M4 on-premise gateway
 */

import { create } from "./client.js";
import type { Lib2BConfig } from "./types.js";

export const M4_DEFAULT_URL = "http://192.168.50.105:8000";

/**
 * Create a lib2b client pre-configured for the M4 gateway.
 *
 * @example
 * ```typescript
 * import { m4 } from '@csoai/lib2b/m4';
 *
 * const client = m4({ apiKey: process.env.M4_API_KEY });
 * const tools = await client.mcp.discover();
 * ```
 */
export function m4(partial?: Partial<Lib2BConfig>) {
  return create({
    baseUrl: process.env.CSOAI_M4_URL || M4_DEFAULT_URL,
    protocols: ["mcp", "a2a", "acp", "p2p", "abci"],
    ...partial,
    apiKey: partial?.apiKey || process.env.CSOAI_M4_API_KEY || process.env.CSOAI_API_KEY || "",
  });
}

/**
 * Create a lib2b client for the public CSOAI cloud API.
 */
export function cloud(partial?: Partial<Lib2BConfig>) {
  return create({
    baseUrl: "https://api.csoai.org",
    protocols: ["mcp", "a2a", "acp"],
    ...partial,
    apiKey: partial?.apiKey || process.env.CSOAI_API_KEY || "",
  });
}
