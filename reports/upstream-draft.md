# x402 conformance evidence draft

Type: issue

## Summary

Observed 0 failing result(s) in a no-payment probe corpus.

## Reproduction

```json
{
  "results": []
}
```

## Expected behavior

The implementation should return a machine-readable, spec-consistent result and must not silently ignore a supported constraint.

## Safety note

No PAYMENT-SIGNATURE was sent and no payment was settled by this probe.

## Maintainer decision needed

Confirm whether the proposed behavior belongs in the protocol specification, a reference SDK, documentation, or an independent validator.

## Human review gate

Do not publish this draft until the raw response, digest, expected behavior, and test fixture have been reviewed by a human.
