# x402 PropertyOps Conformance Lab

Laboratorio local para x402 v2 sobre `exact` en Base Sepolia. Protege por defecto los pagos firmados y se concentra en cuatro problemas operativos: probe frío, contrato `PAYMENT-REQUIRED`, idempotencia y `settlement_pending`.

## Seguridad

El servidor no permite pagos firmados salvo que se establezca explícitamente `ALLOW_LIVE_TESTNET_PAYMENTS=1`. No se incluyen claves privadas, no se leen credenciales desde el navegador y los datos del snapshot son fixtures saneados. La primera ejecución solo debe observar un `402`.

## Inicio

```bash
cp .env.example .env
pnpm install
pnpm test
pnpm build
pnpm start
```

En otra terminal:

```bash
pnpm probe
```

La prueba debe registrar el estado HTTP, el header `PAYMENT-REQUIRED` si existe, el cuerpo crudo y un reporte en `reports/probe.json`. El probe no firma ni liquida.

## Qué cubren las pruebas

Los tests unitarios verifican evaluación con Flare, controles locales de scheme/asset/payTo/amount, payment IDs ligados a fingerprints, conflictos `409` conceptuales, TTL, desafíos humanos de un solo uso y manejo seguro de `settlement_pending`.

## Próximas integraciones

La carpeta `scripts/` incluirá un runner de conformidad y un adaptador opcional de Manus API v2 en modo `--dry-run`. La publicación de issues o pull requests upstream permanecerá fuera del flujo automático y requerirá revisión humana del diff, fixtures y evidencia.
