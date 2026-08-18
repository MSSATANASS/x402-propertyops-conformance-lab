import { describe, expect, it } from "vitest";
import type { ClientEvmSigner } from "@x402/evm";
import { createGuardedFetch } from "../src/client-guard.js";

const payTo = "0x1111111111111111111111111111111111111111" as const;
const paymentRequired = {
  x402Version: 2,
  resource: { url: "http://example.test/resource", mimeType: "application/json" },
  accepts: [
    {
      scheme: "exact",
      network: "eip155:84532",
      amount: "2000",
      asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      payTo,
      maxTimeoutSeconds: 60,
    },
  ],
};

describe("guarded x402 client", () => {
  it("does not sign when the human challenge is rejected", async () => {
    const originalFetch = globalThis.fetch;
    const encoded = Buffer.from(JSON.stringify(paymentRequired), "utf8").toString("base64");
    let calls = 0;
    let signed = false;
    globalThis.fetch = async () => {
      calls += 1;
      return new Response(null, {
        status: 402,
        headers: { "PAYMENT-REQUIRED": encoded },
      });
    };

    const signer: ClientEvmSigner = {
      address: "0x2222222222222222222222222222222222222222",
      signTypedData: async () => {
        signed = true;
        throw new Error("signTypedData must not run");
      },
    };

    try {
      const guardedFetch = createGuardedFetch({
        signer,
        payTo,
        approve: async () => "not-confirmed",
      });
      await guardedFetch("http://example.test/resource");
    } catch {
      // The transport may surface the abort as an error; both paths are safe.
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(calls).toBe(1);
    expect(signed).toBe(false);
  });
});
