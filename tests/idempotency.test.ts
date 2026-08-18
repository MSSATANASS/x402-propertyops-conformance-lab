import { describe, expect, it } from "vitest";
import { fingerprint, InMemoryIdempotencyStore } from "../src/idempotency.js";

const baseRequest = {
  method: "GET",
  path: "/v1/property/merida-001/maintenance-snapshot",
  operation: "maintenance-snapshot",
  scheme: "exact",
  network: "eip155:84532",
  asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  amount: "2000",
  payTo: "0x1111111111111111111111111111111111111111",
};

describe("payment-identifier idempotency", () => {
  it("returns a cached response for the same logical request", () => {
    const store = new InMemoryIdempotencyStore(1_000);
    const fp = fingerprint(baseRequest);
    const response = { status: 200, headers: {}, body: { ok: true } };

    expect(store.lookup("pay_demo", fp, 0)).toEqual({ kind: "new" });
    store.save("pay_demo", fp, response, 0);
    expect(store.lookup("pay_demo", fp, 500)).toEqual({ kind: "replay", response });
  });

  it("returns conflict when the same payment ID changes request semantics", () => {
    const store = new InMemoryIdempotencyStore();
    const fp = fingerprint(baseRequest);
    const different = fingerprint({ ...baseRequest, path: "/v1/property/other/maintenance-snapshot" });
    store.save("pay_demo", fp, { status: 200, headers: {}, body: {} }, 0);
    expect(store.lookup("pay_demo", different, 1)).toEqual({ kind: "conflict" });
  });

  it("treats an expired ID as new", () => {
    const store = new InMemoryIdempotencyStore(100);
    const fp = fingerprint(baseRequest);
    store.save("pay_demo", fp, { status: 200, headers: {}, body: {} }, 0);
    expect(store.lookup("pay_demo", fp, 100)).toEqual({ kind: "new" });
  });

  it("normalizes method and payTo for a stable fingerprint", () => {
    const left = fingerprint(baseRequest);
    const right = fingerprint({ ...baseRequest, method: "get", payTo: baseRequest.payTo.toUpperCase() });
    expect(left).toBe(right);
  });
});
