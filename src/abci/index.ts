/**
 * lib2b — ABCI Adapter
 * Application Blockchain Interface — on-chain trust registry client
 */

import type {
  Lib2BConfig,
  ABCIClient,
  ABCIAttestRequest,
  ABCIAttestResult,
  ABCIAttestation,
  ProtocolHealth,
} from "../types.js";
import { ProtocolError } from "../types.js";

export class ABCIClientImpl implements ABCIClient {
  private config: Required<Lib2BConfig>;

  constructor(config: Required<Lib2BConfig>) {
    this.config = config;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.config.baseUrl}/abci${endpoint}`;
    const response = await this.config.fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
    if (!response.ok) {
      throw new ProtocolError("abci", `ABCI request failed: ${response.status}`, `HTTP_${response.status}`);
    }
    return response.json() as Promise<T>;
  }

  async attest(request: ABCIAttestRequest): Promise<ABCIAttestResult> {
    return this.request<ABCIAttestResult>("/attest", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async query(attestationId: string): Promise<ABCIAttestation | null> {
    try {
      return await this.request<ABCIAttestation>(`/query?id=${encodeURIComponent(attestationId)}`);
    } catch (err) {
      if (err instanceof ProtocolError && err.code === "HTTP_404") return null;
      throw err;
    }
  }

  async verify(attestation: ABCIAttestation): Promise<boolean> {
    const res = await this.request<{ valid: boolean }>("/verify", {
      method: "POST",
      body: JSON.stringify(attestation),
    });
    return res.valid;
  }

  async health(): Promise<ProtocolHealth> {
    try {
      const res = await this.request<{ status: string; version?: string }>("/health");
      return { status: "up", version: res.version };
    } catch {
      return { status: "unknown", message: "ABCI gateway not available" };
    }
  }
}

export * from "../types.js";
