import {
  decodePaymentRequiredObject,
  evaluate,
  type Verdict,
} from "@mssatanass/flare-sdk";
import { ASSET, ATOMIC_AMOUNT, NETWORK } from "./constants.js";

export type PaymentRequiredLike = {
  x402Version?: unknown;
  accepts?: unknown;
  resource?: unknown;
  extensions?: unknown;
};

export type PolicyDecision = {
  allowed: boolean;
  reasons: string[];
  flare: Verdict;
  accepted?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readFirstAccepted(paymentRequired: PaymentRequiredLike): Record<string, unknown> | undefined {
  if (!Array.isArray(paymentRequired.accepts)) return undefined;
  const first = paymentRequired.accepts[0];
  return isRecord(first) ? first : undefined;
}

export function evaluatePaymentRequired(
  paymentRequired: PaymentRequiredLike,
  expectedPayTo: string,
): PolicyDecision {
  const accepted = readFirstAccepted(paymentRequired);
  const flareInput = decodePaymentRequiredObject(paymentRequired, "base64-header");
  const flare = evaluate(
    { kind: "x402", pr: flareInput },
    {
      x402: {
        allowedNetworks: [NETWORK],
        allowPlainNetwork: false,
        allowUnknownFields: false,
        maxAmountAtomic: ATOMIC_AMOUNT,
      },
    },
  );

  const reasons = [...flare.findings.map((finding) => finding.human)];
  if (!accepted) {
    reasons.push("PaymentRequired.accepts debe contener una opción");
    return { allowed: false, reasons, flare };
  }

  if (accepted.scheme !== "exact") reasons.push("scheme no permitida");
  if (accepted.network !== NETWORK) reasons.push(`network debe ser ${NETWORK}`);
  if (accepted.asset !== ASSET) reasons.push("asset no permitido");
  if (accepted.payTo !== expectedPayTo) reasons.push("payTo no permitido");
  if (String(accepted.amount) !== ATOMIC_AMOUNT) reasons.push("amount fuera del cap exacto");

  return {
    allowed: flare.severity !== "block" && reasons.length === 0,
    reasons,
    flare,
    accepted,
  };
}
