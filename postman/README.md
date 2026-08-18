# Postman collection

La colección `x402-propertyops-lab.postman_collection.json` valida únicamente superficies read-only del laboratorio: discovery, el probe frío `402` y `healthz`. El entorno `x402-propertyops-lab.postman_environment.json` apunta a `http://127.0.0.1:4021` y no contiene secretos.

## Ejecución

1. Inicia el laboratorio con `cp .env.example .env && pnpm start`.
2. Importa la colección y el entorno en Postman.
3. Selecciona el entorno local.
4. Ejecuta las tres solicitudes en orden.
5. Confirma que el probe frío muestra HTTP `402`, header `PAYMENT-REQUIRED`, `x402Version: 2`, scheme `exact`, red `eip155:84532` y amount `2000`.

La colección no define `PAYMENT-SIGNATURE`, no usa signer, no llama al facilitador y no cambia `ALLOW_LIVE_TESTNET_PAYMENTS`. No la conviertas en monitor con pagos ni agregues credenciales sin una revisión humana separada.
