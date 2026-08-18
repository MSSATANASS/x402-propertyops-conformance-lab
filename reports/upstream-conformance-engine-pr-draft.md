# fix(conformance): support x402 v2 manifest and canonical payment header

## Summary

The conformance engine now recognizes the current x402 v2 surfaces used by the local PropertyOps endpoint: per-resource `accepts[]` in `/.well-known/x402`, the canonical `PAYMENT-REQUIRED` header, and CAIP-2 `network` nested inside `accepts[]`.

## Reproduction

Target used without a payment header:

`http://127.0.0.1:4021/v1/property/merida-001/maintenance-snapshot`

Before the patch, the engine reported `1/3 checks passed`: manifest discovery failed because it required top-level `accepts`, and CAIP-2 failed because it did not inspect `PAYMENT-REQUIRED` or nested `accepts[]`. The validator selected for the same endpoint already reported strict-v2 success, exposing a compatibility gap between the tools.

## Changes

1. Resolve `/.well-known/x402` from the URL origin instead of appending it to a resource path.
2. Accept a manifest with per-resource `accepts[]`.
3. Read the canonical `PAYMENT-REQUIRED` header.
4. Read `network` from the first `accepts[]` item for v2 payloads.
5. Preserve existing human-readable header labels with an explicit mapping.
6. Avoid adding a trailing slash to the protected endpoint probe.
7. Add regression tests for per-resource manifests and nested v2 accepts.

## Evidence

The patched engine reports `3/3 checks passed` for manifest discovery, CAIP-2 compliance and JSON resilience. The selected endpoint validator reports `strict_v2: true`, `failures: 0`, `channel: header`, `legacy_placement: false` and `channel_mismatch: false`.

The complete engine suite passes with `73 passed, 1 warning`.

## Safety

The probe sent no `PAYMENT-SIGNATURE`, used no private key and settled no payment. The local server had live payments disabled.

## Review notes

This is a local draft only. Do not open a GitHub PR until a maintainer confirms the desired manifest contract and the diff, fixtures and test output have been reviewed by a human.
