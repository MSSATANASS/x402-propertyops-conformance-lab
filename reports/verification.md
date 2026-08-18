# Verification report — x402 PropertyOps Conformance Lab

## Executive summary

The local lab implements an x402 v2 read-only PropertyOps snapshot endpoint on `exact` / Base Sepolia and a guarded client path. It was verified without signing or settling any payment. The server returns a strict-v2 `402` challenge, publishes a per-resource discovery manifest, and blocks signed payments by default.

## Checks

| Check | Result | Evidence |
|---|---|---|
| TypeScript unit tests | PASS | 16 tests passed across policy, idempotency, challenge, settlement and client guard. |
| TypeScript build | PASS | `pnpm build` / `tsc -p tsconfig.json`. |
| Cold probe | PASS | HTTP 402, `PAYMENT-REQUIRED` present, `paid: false`; `reports/probe.json`. |
| Python probe | PASS | `run_conformance.py` produced `reports/conformance-python.json`. |
| Selected endpoint validator | PASS | strict-v2, 1 endpoint, 0 failures, header channel, no mismatch; `reports/validator-strict-v2.json`. |
| Selected conformance engine before patch | FAIL | Reproduced incompatibility with origin manifest, v2 canonical header and nested `accepts[]`. |
| Conformance engine patch | PASS | 73 tests passed, 1 deprecation warning; final endpoint report is 3/3 PASS in `reports/conformance-engine-final.json`. |
| Flare policy integration | PASS | Valid v2 requirement allowed; plain network, unknown field, empty accepts and wrong payTo blocked. |
| Manus API integration | PASS | Dry-run payload generated in `reports/manus-dry-run.json`; no live task created. |
| Skill validation | PASS | `quick_validate.py x402-propertyops-conformance` returned `Skill is valid!`. |

## Real issue found and patched locally

The selected `x402-conformance-engine` did not initially recognize the current v2 representation used by the endpoint. It expected top-level manifest `accepts`, did not read the canonical `PAYMENT-REQUIRED` header, did not inspect `network` inside `accepts[]`, and appended a path-local `/.well-known/x402` in one code path. The local patch adds those behaviors and 2 regression tests.

The patch is saved as `reports/x402-conformance-engine.patch`. The reviewable PR draft is saved as `reports/upstream-conformance-engine-pr-draft.md`. No GitHub issue or PR was opened.

## Safety boundary

No private key was loaded. No browser credentials were read. No `PAYMENT-SIGNATURE` was sent by the probes. The local server ran with `ALLOW_LIVE_TESTNET_PAYMENTS=0`. The Manus API adapter remained in dry-run mode. External publication remains a separate human-reviewed action.

## Reproduction commands

```bash
cd /home/ubuntu/x402-research/x402-propertyops-lab
pnpm test
pnpm build
pnpm probe
python3 scripts/manus_review.py reports/probe.json
```

With the local server running, the selected validator was executed with `X402V_STRICT_V2=true` and reported `failures: 0`.
