// src/types.ts
var MAX_UINT256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

// src/rules/infinite-approve.ts
function isInfinite(amount, maxApproveAmount) {
  const normalized = amount.trim().toLowerCase();
  if (normalized === "max" || normalized === "unlimited" || normalized === "-1") {
    return true;
  }
  try {
    const value = BigInt(amount);
    if (value === BigInt(MAX_UINT256)) return true;
    if (maxApproveAmount !== void 0 && value > BigInt(maxApproveAmount)) {
      return true;
    }
    if (value > 1n << 200n) return true;
  } catch {
    return false;
  }
  return false;
}
function ruleInfiniteApprove(intent, policy) {
  if (intent.kind !== "approve") return [];
  if (!isInfinite(intent.amount, policy.maxApproveAmount)) return [];
  const short = `${intent.spender.slice(0, 6)}...${intent.spender.slice(-4)}`;
  return [
    {
      rule: "approve.infinite",
      severity: "block",
      human: `Le das permiso ILIMITADO a ${short} sobre tu token ${intent.token}. Un approve ilimitado = pueden vaciarte cuando quieran.`,
      field: "amount",
      expected: policy.maxApproveAmount ?? "finite allowance",
      actual: intent.amount
    }
  ];
}

// src/rules/unknown-spender.ts
function ruleUnknownSpender(intent, policy) {
  if (intent.kind !== "approve") return [];
  const allow = new Set(policy.spenderAllowlist.map((s) => s.toLowerCase()));
  if (allow.has(intent.spender.toLowerCase())) return [];
  const short = `${intent.spender.slice(0, 6)}...${intent.spender.slice(-4)}`;
  return [
    {
      rule: "approve.unknown_spender",
      severity: "block",
      human: `${short} no est\xE1 en tu allowlist. No firmes un approve a un spender desconocido.`,
      field: "spender",
      expected: policy.spenderAllowlist.length ? `one of [${policy.spenderAllowlist.join(", ")}]` : "spender on allowlist (list is empty)",
      actual: intent.spender
    }
  ];
}

// src/rules/drain-transfer.ts
function ruleDrainTransfer(_intent) {
  return [];
}

// src/rules/x402-policy.ts
function ruleX402Policy(intent, policy) {
  if (intent.kind !== "x402") return [];
  const { pr } = intent;
  const findings = [];
  const x = policy.x402;
  if (pr.network.kind === "plain" && !x.allowPlainNetwork) {
    findings.push({
      rule: "x402.plain_network",
      severity: "block",
      human: `Network "${pr.network.value}" is a plain name, not CAIP-2. Refuse until the quote uses eip155:<n> / solana:<id>.`,
      field: "network",
      expected: "CAIP-2 (eip155:<n> | solana:<id>)",
      actual: pr.network.value
    });
  }
  if (pr.network.kind === "caip2" && x.allowedNetworks.length > 0) {
    const allowed = new Set(x.allowedNetworks.map((n) => n.toLowerCase()));
    if (!allowed.has(pr.network.value.toLowerCase())) {
      findings.push({
        rule: "x402.network_not_allowed",
        severity: "block",
        human: `Network ${pr.network.value} is not in your allowlist.`,
        field: "network",
        expected: x.allowedNetworks.join(", "),
        actual: pr.network.value
      });
    }
  }
  if (x.maxAmountAtomic !== void 0) {
    try {
      const actual = BigInt(pr.amount.value);
      const cap = BigInt(x.maxAmountAtomic);
      if (actual > cap) {
        findings.push({
          rule: "x402.over_cap",
          severity: "block",
          human: `Quoted amount ${pr.amount.value} exceeds your cap ${x.maxAmountAtomic}.`,
          field: "amount",
          expected: `<= ${x.maxAmountAtomic}`,
          actual: pr.amount.value
        });
      }
    } catch {
      findings.push({
        rule: "x402.over_cap",
        severity: "block",
        human: `Amount "${pr.amount.value}" is not a valid atomic integer.`,
        field: "amount",
        expected: "digit string",
        actual: pr.amount.value
      });
    }
  }
  if (!x.allowUnknownFields && pr.unknownFields.length > 0) {
    findings.push({
      rule: "x402.unknown_field",
      severity: "block",
      human: `PaymentRequired carries unknown fields you did not model: ${pr.unknownFields.join(", ")}. Do not sign what you cannot explain.`,
      field: "unknownFields",
      expected: "no unknown fields",
      actual: pr.unknownFields.join(", ")
    });
  }
  return findings;
}

// src/policy.ts
function defaultPolicy() {
  return {
    spenderAllowlist: [],
    x402: {
      allowedNetworks: ["eip155:8453", "eip155:84532"],
      allowPlainNetwork: false,
      allowUnknownFields: false
    }
  };
}
function mergePolicy(partial) {
  const base = defaultPolicy();
  if (!partial) return base;
  return {
    maxApproveAmount: partial.maxApproveAmount ?? base.maxApproveAmount,
    spenderAllowlist: partial.spenderAllowlist ?? base.spenderAllowlist,
    x402: {
      ...base.x402,
      ...partial.x402 ?? {}
    }
  };
}

// src/evaluate.ts
var SEVERITY_RANK = {
  ok: 0,
  warn: 1,
  block: 2
};
function worstSeverity(findings) {
  let worst = "ok";
  for (const f of findings) {
    if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[worst]) {
      worst = f.severity;
    }
  }
  return worst;
}
function summarize(severity, findings) {
  if (severity === "ok") return "OK to proceed (no blocking findings).";
  if (severity === "block") {
    return `NO FIRMES. ${findings.filter((f) => f.severity === "block").length} blocking finding(s).`;
  }
  return `Proceed with caution. ${findings.length} warning(s).`;
}
function evaluate(intent, policy) {
  const resolved = mergePolicy(policy);
  const findings = [
    ...ruleInfiniteApprove(intent, resolved),
    ...ruleUnknownSpender(intent, resolved),
    ...ruleDrainTransfer(intent),
    ...ruleX402Policy(intent, resolved)
  ];
  const severity = worstSeverity(findings);
  return {
    severity,
    findings,
    human: summarize(severity, findings),
    checkedAt: (/* @__PURE__ */ new Date()).toISOString().replace(/\.\d{3}Z$/, "Z")
  };
}

// src/decoders/approve.ts
function decodeApprove(input) {
  return {
    kind: "approve",
    token: input.token,
    spender: input.spender,
    amount: input.amount,
    chainId: input.chainId
  };
}

// src/decoders/eip712.ts
function decodeEip712(input) {
  return {
    kind: "eip712",
    domain: input.domain,
    types: input.types,
    message: input.message
  };
}

// src/decoders/tx.ts
function decodeTx(input) {
  return {
    kind: "tx",
    to: input.to,
    value: input.value,
    data: input.data,
    chainId: input.chainId
  };
}

// src/decoders/x402.ts
var KNOWN_ACCEPT_KEYS = /* @__PURE__ */ new Set([
  "scheme",
  "network",
  "amount",
  "maxAmountRequired",
  "price",
  "asset",
  "payTo",
  "maxTimeoutSeconds",
  "extra",
  "description",
  "mimeType",
  "resource",
  "outputSchema"
]);
var KNOWN_TOP_KEYS = /* @__PURE__ */ new Set([
  "x402Version",
  "accepts",
  "error",
  "resource",
  "extensions",
  "facilitator"
]);
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function parseNetwork(raw) {
  const value = String(raw ?? "");
  if (/^(eip155:\d+|solana:.+)$/.test(value)) {
    return { kind: "caip2", value };
  }
  return { kind: "plain", value };
}
function parseAmount(accept) {
  if (accept.amount !== void 0 && accept.amount !== null && String(accept.amount) !== "") {
    return { kind: "amount", value: String(accept.amount) };
  }
  if (accept.maxAmountRequired !== void 0 && accept.maxAmountRequired !== null) {
    return { kind: "maxAmountRequired", value: String(accept.maxAmountRequired) };
  }
  if (accept.price !== void 0 && accept.price !== null) {
    return { kind: "amount", value: String(accept.price) };
  }
  return { kind: "amount", value: "" };
}
function collectUnknown(obj, known, prefix) {
  const out = [];
  for (const key of Object.keys(obj)) {
    if (!known.has(key)) out.push(prefix ? `${prefix}.${key}` : key);
  }
  return out;
}
function decodePaymentRequiredObject(raw, source) {
  const root = asRecord(raw);
  if (!root) {
    return {
      scheme: "",
      network: { kind: "plain", value: "" },
      amount: { kind: "amount", value: "" },
      source,
      unknownFields: ["<root>"],
      raw
    };
  }
  const accepts = Array.isArray(root.accepts) ? root.accepts : [];
  const first = asRecord(accepts[0]) ?? {};
  const unknownFields = [
    ...collectUnknown(root, KNOWN_TOP_KEYS, ""),
    ...collectUnknown(first, KNOWN_ACCEPT_KEYS, "accepts[0]")
  ];
  return {
    scheme: String(first.scheme ?? ""),
    network: parseNetwork(first.network),
    amount: parseAmount(first),
    payTo: first.payTo !== void 0 ? String(first.payTo) : void 0,
    asset: first.asset !== void 0 ? String(first.asset) : void 0,
    source,
    unknownFields,
    raw
  };
}
function decodePaymentRequiredHeader(headerValue) {
  const token = headerValue.trim().split(/\s+/).pop() ?? "";
  const padded = token + "=".repeat((4 - token.length % 4) % 4);
  let json;
  try {
    const text = Buffer.from(padded, "base64").toString("utf8");
    json = JSON.parse(text);
  } catch {
    return {
      scheme: "",
      network: { kind: "plain", value: "" },
      amount: { kind: "amount", value: "" },
      source: "base64-header",
      unknownFields: ["<undecodable-header>"],
      raw: headerValue
    };
  }
  return decodePaymentRequiredObject(json, "base64-header");
}
function decodePaymentRequiredBody(body) {
  let raw = body;
  if (typeof body === "string") {
    try {
      raw = JSON.parse(body);
    } catch {
      return {
        scheme: "",
        network: { kind: "plain", value: "" },
        amount: { kind: "amount", value: "" },
        source: "custom-body",
        unknownFields: ["<undecodable-body>"],
        raw: body
      };
    }
  }
  return decodePaymentRequiredObject(raw, "custom-body");
}
export {
  MAX_UINT256,
  decodeApprove,
  decodeEip712,
  decodePaymentRequiredBody,
  decodePaymentRequiredHeader,
  decodePaymentRequiredObject,
  decodeTx,
  defaultPolicy,
  evaluate,
  mergePolicy
};
