export type SettlementResponse = {
  success: boolean;
  errorReason?: string;
  payer?: string;
  transaction: string;
  network: string;
  amount?: string;
};

export type SettlementDecision =
  | { action: "serve"; reason: string }
  | { action: "reconcile"; transaction: string; network: string; reason: string }
  | { action: "stop"; reason: string };

export function decideSettlement(response: SettlementResponse): SettlementDecision {
  if (response.success) {
    return { action: "serve", reason: "settlement confirmado" };
  }

  if (response.errorReason === "settlement_pending") {
    if (!response.transaction) {
      return {
        action: "stop",
        reason: "settlement_pending sin hash: no es seguro reintentar ni reconciliar",
      };
    }
    return {
      action: "reconcile",
      transaction: response.transaction,
      network: response.network,
      reason: "la transacción fue emitida; reconciliar antes de cualquier reintento",
    };
  }

  return {
    action: "stop",
    reason: response.errorReason ?? "settlement rechazado",
  };
}
