# x402 PropertyOps Conformance Lab

Laboratorio reproducible para implementar y validar **x402 v2** en un caso de uso de PropertyOps. El proyecto expone un snapshot read-only de mantenimiento protegido por `exact` en Base Sepolia y prueba controles de conformidad, política antes de firmar, confirmación humana, idempotencia y settlement seguro.

> **Estado de seguridad:** el laboratorio bloquea pagos firmados por defecto. No contiene claves privadas, no lee credenciales del navegador y las pruebas locales no liquidan fondos.

Repositorio: [MSSATANASS/x402-propertyops-conformance-lab](https://github.com/MSSATANASS/x402-propertyops-conformance-lab)

---

## Español

### Propósito

Este laboratorio está diseñado para resolver problemas operativos reales del ecosistema x402 y producir evidencia reutilizable para pruebas de conformidad y contribuciones upstream. No es un ejemplo de “cobro feliz”: verifica que un cliente observe correctamente el `402`, decodifique `PAYMENT-REQUIRED`, valide CAIP-2, aplique una política local antes de firmar y no repita una operación después de `settlement_pending`.

| Área | Control implementado |
|---|---|
| Discovery | Manifest `/.well-known/x402` con `accepts[]` por recurso |
| HTTP 402 | Header canónico `PAYMENT-REQUIRED` con `x402Version: 2` |
| Scheme | `exact` sobre `eip155:84532` |
| Política | Flare más controles locales de scheme, asset, amount y `payTo` |
| Confirmación | Challenge temporal, escrito, de un solo uso |
| Idempotencia | Fingerprint estable y conflicto conceptual `409` |
| Settlement | Éxito, error terminal y `settlement_pending` diferenciados |
| Observabilidad | Probe con headers, cuerpo crudo y digest SHA-256 |

### Inicio rápido

Requisitos: Node.js, pnpm y una dirección `PAY_TO` de testnet. El `.env` se genera localmente y está excluido de Git.

```bash
cp .env.example .env
pnpm install
pnpm test
pnpm build
pnpm start
```

El servidor escucha en `0.0.0.0:4021` por defecto para permitir validación mediante proxies temporales. Para un uso estrictamente local puedes establecer `HOST=127.0.0.1`; en ese caso, los monitores remotos de Postman no podrán alcanzar el servicio.

En otra terminal ejecuta el probe frío:

```bash
pnpm probe
```

La primera respuesta esperada es `HTTP 402` con el header `PAYMENT-REQUIRED`. El probe no envía `PAYMENT-SIGNATURE`, no crea un payload y no liquida ningún pago.

### Pruebas

La suite de Vitest cubre evaluación de política con Flare, campos desconocidos, redes planas frente a CAIP-2, destinatarios no autorizados, idempotencia, TTL, desafíos humanos, confirmación de settlement y bloqueo del signer cuando la aprobación humana es inválida.

```bash
pnpm test
pnpm build
```

Los scripts auxiliares de `scripts/` permiten ejecutar probes Python, decodificar fixtures `PaymentRequired`, generar drafts de contribución y preparar una revisión opcional mediante Manus API v2 en modo `--dry-run`.

### Postman

La carpeta `postman/` contiene una colección y un entorno local. Importa ambos en Postman y ejecuta las solicitudes en orden:

| Solicitud | Resultado esperado |
|---|---|
| `01 - Discovery manifest` | `200`, `x402Version: 2`, `resources[].accepts[]` presente |
| `02 - Cold probe PaymentRequired` | `402`, `PAYMENT-REQUIRED`, `exact`, `eip155:84532`, amount `2000` |
| `03 - Health and live payment guard` | `200` y `livePayments: false` |

La colección no define `PAYMENT-SIGNATURE`, signer, claves privadas ni llamadas de settlement. El monitor temporal usado durante la validación fue eliminado después de completar 3 solicitudes y 12 assertions exitosas; la colección principal y el entorno local permanecen en Postman.

### Seguridad y límites

Mantén `ALLOW_LIVE_TESTNET_PAYMENTS=0` durante probes y auditorías. No conviertas una respuesta `402` en autorización automática de pago. Antes de firmar, valida red, asset, monto, destinatario y flujo de pago; después exige una confirmación humana escrita con TTL y uso único.

Un resultado `settlement_pending` con hash requiere reconciliación antes de reintentar. Si no existe hash, detén el flujo. Nunca leas claves privadas desde el navegador o desde archivos privados sin autorización expresa.

### Contribuir al protocolo

El laboratorio incluye fixtures, una matriz de conformidad y un parche local para `x402-conformance-engine`. El parche permite reconocer manifest v2 por recurso, el header canónico `PAYMENT-REQUIRED`, `network` dentro de `accepts[]` y URLs de manifest derivadas del origin. La suite del engine pasó con 73 tests después de añadir las regresiones.

Antes de abrir un issue o pull request, reproduce el caso sin fondos reales, guarda la evidencia, revisa issues existentes, separa cambios de spec/SDK/documentación y solicita revisión humana. El archivo `reports/upstream-conformance-engine-pr-draft.md` es un draft; no se publica automáticamente.

### Referencias

- [Documentación oficial de x402](https://docs.x402.org/introduction)
- [Flujo cliente-servidor x402](https://docs.x402.org/core-concepts/client-server)
- [Scheme exact](https://docs.x402.org/schemes/exact)
- [Extensión payment-identifier](https://docs.x402.org/extensions/payment-identifier)
- [Especificación x402 v2](https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md)

---

## English

### Purpose

This lab provides a reproducible implementation and validation path for **x402 v2** in a PropertyOps use case. It exposes a read-only maintenance snapshot protected by the `exact` scheme on Base Sepolia and exercises conformance checks, pre-signing policy, human confirmation, idempotency, and safe settlement handling.

> **Security status:** signed payments are disabled by default. The lab contains no private keys, does not read browser credentials, and local tests do not settle funds.

### What this lab validates

The project is designed to address real operational problems in the x402 ecosystem and produce reusable evidence for conformance tests and upstream contributions. It is not merely a happy-path payment demo: it verifies that a client observes `402`, decodes `PAYMENT-REQUIRED`, validates CAIP-2, applies policy before signing, and does not blindly retry after `settlement_pending`.

| Area | Implemented control |
|---|---|
| Discovery | `/.well-known/x402` manifest with per-resource `accepts[]` |
| HTTP 402 | Canonical `PAYMENT-REQUIRED` header with `x402Version: 2` |
| Scheme | `exact` on `eip155:84532` |
| Policy | Flare plus local scheme, asset, amount, and `payTo` checks |
| Confirmation | Written, time-limited, single-use challenge |
| Idempotency | Stable fingerprint and conceptual `409` conflict behavior |
| Settlement | Explicit success, terminal error, and `settlement_pending` states |
| Evidence | Probe containing headers, raw body, and SHA-256 digest |

### Quick start

Requirements: Node.js, pnpm, and a testnet `PAY_TO` address. The `.env` file is created locally and ignored by Git.

```bash
cp .env.example .env
pnpm install
pnpm test
pnpm build
pnpm start
```

The server listens on `0.0.0.0:4021` by default so temporary proxies can reach it during validation. For strictly local use, set `HOST=127.0.0.1`; remote Postman monitors will then be unable to reach the service.

Run the cold probe from another terminal:

```bash
pnpm probe
```

The expected first response is `HTTP 402` with a `PAYMENT-REQUIRED` header. The probe does not send `PAYMENT-SIGNATURE`, create a payment payload, or settle any payment.

### Tests

The Vitest suite covers Flare policy evaluation, unknown fields, plain network identifiers versus CAIP-2, unauthorized recipients, idempotency, TTL, human challenges, settlement confirmation, and signer blocking when human approval is invalid.

```bash
pnpm test
pnpm build
```

The `scripts/` directory also provides Python helpers for no-payment probes, `PaymentRequired` fixture decoding, upstream contribution drafts, and optional Manus API v2 review in `--dry-run` mode.

### Postman

The `postman/` directory contains a collection and a local environment. Import both into Postman and run the requests in order:

| Request | Expected result |
|---|---|
| `01 - Discovery manifest` | `200`, `x402Version: 2`, and `resources[].accepts[]` present |
| `02 - Cold probe PaymentRequired` | `402`, `PAYMENT-REQUIRED`, `exact`, `eip155:84532`, amount `2000` |
| `03 - Health and live payment guard` | `200` and `livePayments: false` |

The collection defines no `PAYMENT-SIGNATURE`, signer, private key, or settlement call. The temporary monitor used during validation was deleted after completing 3 requests and 12 successful assertions; the main collection and local environment remain in Postman.

### Security and boundaries

Keep `ALLOW_LIVE_TESTNET_PAYMENTS=0` during probes and audits. Do not treat a `402` response as automatic authorization to pay. Before signing, validate network, asset, amount, recipient, and payment flow; then require a written human confirmation with a TTL and single-use semantics.

A `settlement_pending` result with a transaction hash requires reconciliation before retrying. If no hash is available, stop the flow. Never read private keys from the browser or private files without explicit authorization.

### Contributing to the protocol

The lab includes fixtures, a conformance matrix, and a local patch for `x402-conformance-engine`. The patch adds support for per-resource v2 manifests, the canonical `PAYMENT-REQUIRED` header, `network` nested inside `accepts[]`, and origin-based manifest URLs. The engine suite passed 73 tests after the regression tests were added.

Before opening an issue or pull request, reproduce the case without real funds, preserve evidence, review existing issues, separate specification/SDK/documentation changes, and request human review. The file `reports/upstream-conformance-engine-pr-draft.md` is a draft and is not published automatically.

### References

- [Official x402 documentation](https://docs.x402.org/introduction)
- [x402 client-server flow](https://docs.x402.org/core-concepts/client-server)
- [Exact scheme](https://docs.x402.org/schemes/exact)
- [Payment identifier extension](https://docs.x402.org/extensions/payment-identifier)
- [x402 v2 specification](https://github.com/x402-foundation/x402/blob/main/specs/x402-specification-v2.md)
