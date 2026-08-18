import express from "express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import {
  declarePaymentIdentifierExtension,
  PAYMENT_IDENTIFIER,
} from "@x402/extensions/payment-identifier";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import {
  ASSET,
  ATOMIC_AMOUNT,
  NETWORK,
  PRICE,
  RESOURCE_PATH,
  requiredPayTo,
} from "./src/constants.js";

const app = express();
const port = Number(process.env.PORT ?? 4021);
const host = process.env.HOST ?? "0.0.0.0";
const payTo = requiredPayTo();
const facilitatorUrl = process.env.FACILITATOR_URL ?? "https://x402.org/facilitator";
const allowLiveTestnetPayments = process.env.ALLOW_LIVE_TESTNET_PAYMENTS === "1";

const facilitator = new HTTPFacilitatorClient({ url: facilitatorUrl });
const resourceServer = new x402ResourceServer(facilitator).register(
  NETWORK,
  new ExactEvmScheme(),
);

const routes = {
  [RESOURCE_PATH]: {
    accepts: [
      {
        scheme: "exact",
        price: { amount: ATOMIC_AMOUNT, asset: ASSET },
        network: NETWORK,
        payTo,
      },
    ],
    description: "Snapshot saneado de mantenimiento de un inmueble",
    mimeType: "application/json",
    extensions: {
      [PAYMENT_IDENTIFIER]: declarePaymentIdentifierExtension(true),
    },
  },
};

app.get("/.well-known/x402", (_req, res) => {
  res.json({
    x402Version: 2,
    resources: [
      {
        resource: "http://127.0.0.1:4021/v1/property/{propertyId}/maintenance-snapshot",
        type: "http",
        accepts: [
          {
            scheme: "exact",
            network: NETWORK,
            amount: ATOMIC_AMOUNT,
            asset: ASSET,
            payTo,
            maxTimeoutSeconds: 60,
          },
        ],
      },
    ],
  });
});

// El gate de pago queda antes de la validación de negocio para que el probe
// frío observe 402 y no una respuesta 401/405/500 prematura.
app.use(paymentMiddleware(routes, resourceServer));

// Protección local: el laboratorio no liquida por defecto aunque alguien
// envíe un PAYMENT-SIGNATURE. Solo testnet explícita con ALLOW_LIVE_TESTNET_PAYMENTS=1.
app.use((req, res, next) => {
  if (!allowLiveTestnetPayments && req.headers["payment-signature"]) {
    res.status(403).json({
      error: "live_payment_disabled",
      message: "El laboratorio bloquea pagos firmados por defecto",
    });
    return;
  }
  next();
});

app.use(express.json());

app.get("/v1/property/:propertyId/maintenance-snapshot", (req, res) => {
  const propertyId = req.params.propertyId;
  res.json({
    resource: req.originalUrl,
    generatedAt: new Date().toISOString(),
    snapshot: {
      propertyId,
      openIncidents: 2,
      lastInspection: "2026-08-15",
      operationalStatus: "attention_required",
      dataClass: "sanitized-demo-fixture",
    },
  });
});

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, x402Version: 2, network: NETWORK, livePayments: allowLiveTestnetPayments });
});

app.listen(port, host, () => {
  console.log(`x402 PropertyOps lab listening on http://${host}:${port}`);
  console.log(`facilitator=${facilitatorUrl} livePayments=${allowLiveTestnetPayments}`);
});
