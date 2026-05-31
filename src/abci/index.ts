/**
 * lib2b — ABCI Adapter (stub)
 * Application Blockchain Interface — on-chain trust registry
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

  async attest(request: ABCIAttestRequest): Promise<ABCIAttestResult> {
    return this.httpRequest<ABCIAttestResult>("/abci/attest", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async query(attestationId: string): Promise<ABCIAttestation | null> {
    try {
      return await this.httpRequest<ABCIAttestation>(`/abci/query?id=${attestationId}`);
    } catch (err) {
      if (err instanceof ProtocolError && err.code === "HTTP_404") return null;
      throw err;
    }
  }

  async verify(attestation: ABCIAttestation): Promise<boolean> {
    const res = await this.httpRequest<{ valid: boolean }>("/abci/verify", {
      method: "POST",
      body: JSON.stringify(attestation),
    });
    return res.valid;
  }

  async health(): Promise<ProtocolHealth> {
    return { status: "unknown", message: "ABCI integration coming soon" };
  }

  private async httpRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.config.baseUrl}${endpoint}`;
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
}

export * from "../types.js";
