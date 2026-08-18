import { createHash } from "node:crypto";

export type RequestFingerprintInput = {
  method: string;
  path: string;
  operation?: string;
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
};

export type CachedResponse = {
  status: number;
  headers: Record<string, string>;
  body: unknown;
};

type Entry = {
  fingerprint: string;
  response: CachedResponse;
  storedAt: number;
};

export type IdempotencyLookup =
  | { kind: "new" }
  | { kind: "replay"; response: CachedResponse }
  | { kind: "conflict" };

function canonicalize(input: RequestFingerprintInput): string {
  return JSON.stringify({
    amount: input.amount,
    asset: input.asset,
    method: input.method.toUpperCase(),
    network: input.network,
    operation: input.operation ?? "",
    path: input.path,
    payTo: input.payTo.toLowerCase(),
    scheme: input.scheme,
  });
}

export function fingerprint(input: RequestFingerprintInput): string {
  return createHash("sha256").update(canonicalize(input)).digest("hex");
}

export class InMemoryIdempotencyStore {
  private readonly entries = new Map<string, Entry>();

  constructor(private readonly ttlMs = 60 * 60 * 1000) {}

  lookup(paymentId: string, requestFingerprint: string, now = Date.now()): IdempotencyLookup {
    const entry = this.entries.get(paymentId);
    if (!entry || now - entry.storedAt >= this.ttlMs) {
      if (entry) this.entries.delete(paymentId);
      return { kind: "new" };
    }
    if (entry.fingerprint !== requestFingerprint) return { kind: "conflict" };
    return { kind: "replay", response: entry.response };
  }

  save(paymentId: string, requestFingerprint: string, response: CachedResponse, now = Date.now()): void {
    this.entries.set(paymentId, {
      fingerprint: requestFingerprint,
      response,
      storedAt: now,
    });
  }

  size(): number {
    return this.entries.size;
  }
}
