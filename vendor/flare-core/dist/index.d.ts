/** Anything you are about to sign or authorize. */
type Intent = {
    kind: "eip712";
    domain: unknown;
    types: unknown;
    message: unknown;
} | {
    kind: "tx";
    to: string;
    value: string;
    data: string;
    chainId: string;
} | {
    kind: "approve";
    token: string;
    spender: string;
    amount: string;
    chainId: string;
} | {
    kind: "x402";
    pr: PaymentRequired;
};
type NetworkRef = {
    kind: "caip2";
    value: string;
} | {
    kind: "plain";
    value: string;
};
type AmountRef = {
    kind: "amount";
    value: string;
} | {
    kind: "maxAmountRequired";
    value: string;
};
interface PaymentRequired {
    scheme: string;
    network: NetworkRef;
    amount: AmountRef;
    payTo?: string;
    asset?: string;
    source: "base64-header" | "custom-body";
    unknownFields: string[];
    raw: unknown;
}
type Severity = "ok" | "warn" | "block";
type RuleId = "approve.infinite" | "approve.unknown_spender" | "tx.drain_transfer" | "tx.unverified_contract" | "x402.over_cap" | "x402.network_not_allowed" | "x402.plain_network" | "x402.unknown_field";
interface Finding {
    rule: RuleId;
    severity: Exclude<Severity, "ok">;
    human: string;
    field: string;
    expected: string;
    actual: string;
}
interface Verdict {
    severity: Severity;
    findings: Finding[];
    human: string;
    checkedAt: string;
}
interface X402Policy {
    maxAmountAtomic?: string;
    allowedNetworks: string[];
    allowPlainNetwork: boolean;
    allowUnknownFields: boolean;
}
interface Policy {
    maxApproveAmount?: string;
    spenderAllowlist: string[];
    x402: X402Policy;
}
declare const MAX_UINT256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

/**
 * Decode is the caller's job (or CLI). This function only evaluates.
 * Never touches private keys.
 */
declare function evaluate(intent: Intent, policy?: Partial<Policy>): Verdict;

declare function defaultPolicy(): Policy;
declare function mergePolicy(partial?: Partial<Policy>): Policy;

/** Normalize a raw approve-shaped object into Intent. */
declare function decodeApprove(input: {
    token: string;
    spender: string;
    amount: string;
    chainId: string;
}): Intent;

/** Pass-through decoder for typed data (rules for EIP-712 land in v1.1). */
declare function decodeEip712(input: {
    domain: unknown;
    types: unknown;
    message: unknown;
}): Intent;

declare function decodeTx(input: {
    to: string;
    value: string;
    data: string;
    chainId: string;
}): Intent;

/**
 * Decode a PaymentRequired object (already JSON) into the Flare model.
 * Prefer the first accepts[] entry as the quote under review.
 */
declare function decodePaymentRequiredObject(raw: unknown, source: PaymentRequired["source"]): PaymentRequired;
/** Decode base64 PAYMENT-REQUIRED header value into PaymentRequired. */
declare function decodePaymentRequiredHeader(headerValue: string): PaymentRequired;
/** Decode body JSON (string or object) as custom-body PaymentRequired. */
declare function decodePaymentRequiredBody(body: unknown): PaymentRequired;

export { type AmountRef, type Finding, type Intent, MAX_UINT256, type NetworkRef, type PaymentRequired, type Policy, type RuleId, type Severity, type Verdict, type X402Policy, decodeApprove, decodeEip712, decodePaymentRequiredBody, decodePaymentRequiredHeader, decodePaymentRequiredObject, decodeTx, defaultPolicy, evaluate, mergePolicy };
