#!/usr/bin/env python3
"""Classify a local x402 report through Manus API v2, dry-run by default."""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

SCHEMA = {
    "type": "object",
    "properties": {
        "classification": {
            "type": "string",
            "enum": [
                "protocol_bug",
                "implementation_bug",
                "documentation_gap",
                "security_risk",
                "needs_reproduction",
            ],
        },
        "severity": {
            "type": "string",
            "enum": ["critical", "high", "medium", "low"],
        },
        "summary": {"type": "string"},
        "nextAction": {"type": "string"},
        "needsHumanReview": {"type": "boolean"},
    },
    "required": [
        "classification",
        "severity",
        "summary",
        "nextAction",
        "needsHumanReview",
    ],
    "additionalProperties": False,
}


def redact(value: object) -> object:
    if isinstance(value, dict):
        return {
            key: "[REDACTED]" if key.lower() in {"authorization", "payment-signature", "x-manus-api-key"} else redact(item)
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [redact(item) for item in value]
    return value


def build_payload(report: dict) -> dict:
    report_text = json.dumps(redact(report), indent=2, ensure_ascii=False)
    if len(report_text) > 50_000:
        report_text = report_text[:50_000] + "\n[truncated]"
    return {
        "message": {
            "content": (
                "Clasifica este reporte de conformidad x402. No apruebes pagos, no publiques cambios "
                "y no inventes hechos. Devuelve únicamente un resultado conforme al esquema.\n\n"
                + report_text
            )
        },
        "structured_output_schema": SCHEMA,
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("report", type=Path)
    parser.add_argument("--live", action="store_true", help="Create a real Manus task")
    parser.add_argument("--confirm-live", action="store_true", help="Explicit human confirmation for live task creation")
    args = parser.parse_args()

    report = json.loads(args.report.read_text(encoding="utf-8"))
    payload = build_payload(report)
    if not args.live:
        print(json.dumps({"mode": "dry-run", "endpoint": "https://api.manus.ai/v2/task.create", "payload": payload}, indent=2, ensure_ascii=False))
        return 0
    if not args.confirm_live:
        print("Refusing live Manus task creation without --confirm-live", file=sys.stderr)
        return 3
    api_key = os.environ.get("MANUS_API_KEY")
    if not api_key:
        print("MANUS_API_KEY is required for --live", file=sys.stderr)
        return 2

    request = urllib.request.Request(
        "https://api.manus.ai/v2/task.create",
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json", "x-manus-api-key": api_key},
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}), file=sys.stderr)
        return 1
    print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0 if result.get("ok") is True else 1


if __name__ == "__main__":
    raise SystemExit(main())
