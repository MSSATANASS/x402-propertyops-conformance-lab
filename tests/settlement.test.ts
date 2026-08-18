import { describe, expect, it } from "vitest";
import { decideSettlement } from "../src/settlement.js";

describe("settlement safety", () => {
  it("serves only after confirmed success", () => {
    expect(
      decideSettlement({
        success: true,
        transaction: "0xabc",
        network: "eip155:84532",
      }),
    ).toEqual({ action: "serve", reason: "settlement confirmado" });
  });

  it("requires reconciliation for settlement_pending with a hash", () => {
    expect(
      decideSettlement({
        success: false,
        errorReason: "settlement_pending",
        transaction: "0xabc",
        network: "eip155:84532",
      }),
    ).toEqual({
      action: "reconcile",
      transaction: "0xabc",
      network: "eip155:84532",
      reason: "la transacción fue emitida; reconciliar antes de cualquier reintento",
    });
  });

  it("stops when settlement_pending has no transaction hash", () => {
    expect(
      decideSettlement({
        success: false,
        errorReason: "settlement_pending",
        transaction: "",
        network: "eip155:84532",
      }),
    ).toEqual({
      action: "stop",
      reason: "settlement_pending sin hash: no es seguro reintentar ni reconciliar",
    });
  });

  it("stops on terminal errors", () => {
    expect(
      decideSettlement({
        success: false,
        errorReason: "insufficient_funds",
        transaction: "",
        network: "eip155:84532",
      }),
    ).toEqual({ action: "stop", reason: "insufficient_funds" });
  });
});
