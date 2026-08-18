import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

const target = process.argv[2] ?? "http://127.0.0.1:4021/v1/property/merida-001/maintenance-snapshot";
const startedAt = new Date().toISOString();
const started = Date.now();
const response = await fetch(target, { method: "GET", redirect: "manual" });
const rawBody = await response.text();
const parsedBody = (() => {
  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    return null;
  }
})();
const rawDigest = createHash("sha256").update(rawBody).digest("hex");
const paymentRequired = response.headers.get("PAYMENT-REQUIRED");
const report = {
  target,
  probedAtUtc: startedAt,
  elapsedMs: Date.now() - started,
  method: "GET",
  status: response.status,
  statusText: response.statusText,
  headers: Object.fromEntries(response.headers.entries()),
  paymentRequiredPresent: Boolean(paymentRequired),
  rawBody,
  parsedBody,
  rawBodySha256: `sha256:${rawDigest}`,
  paid: false,
};
await mkdir("reports", { recursive: true });
await writeFile("reports/probe.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ status: response.status, paymentRequiredPresent: Boolean(paymentRequired), elapsedMs: report.elapsedMs, report: "reports/probe.json" }, null, 2));

if (response.status !== 402) process.exitCode = 2;
