import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluatePaymentRequired } from "../src/policy.js";

const corpus = JSON.parse(
  readFileSync(new URL("../fixtures/payment-required-corpus.json", import.meta.url), "utf8"),
) as Record<string, unknown>;
const payTo = "0x1111111111111111111111111111111111111111";

describe("x402 policy adapter", () => {
  it("allows a valid v2 exact requirement", () => {
    const decision = evaluatePaymentRequired(corpus.valid as never, payTo);
    expect(decision.allowed).toBe(true);
    expect(decision.flare.severity).toBe("ok");
  });

  it("blocks unknown fields", () => {
    const decision = evaluatePaymentRequired(corpus.unknownField as never, payTo);
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.some((reason) => reason.includes("unknown"))).toBe(true);
  });

  it("blocks plain network identifiers", () => {
    const decision = evaluatePaymentRequired(corpus.plainNetwork as never, payTo);
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.some((reason) => reason.includes("red") || reason.includes("network"))).toBe(true);
  });

  it("blocks empty accepts", () => {
    const decision = evaluatePaymentRequired(corpus.emptyAccepts as never, payTo);
    expect(decision.allowed).toBe(false);
    expect(decision.reasons.join(" ")).toContain("accepts");
  });

  it("blocks a different payTo even when Flare sees a valid network", () => {
    const decision = evaluatePaymentRequired(corpus.valid as never, "0x2222222222222222222222222222222222222222");
    expect(decision.allowed).toBe(false);
    expect(decision.reasons).toContain("payTo no permitido");
  });
});
