export const NETWORK = "eip155:84532" as const;
export const ASSET = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
export const ATOMIC_AMOUNT = "2000" as const;
export const PRICE = "$0.002" as const;
export const RESOURCE_PATH = "/v1/property/:propertyId/maintenance-snapshot" as const;
export const RESOURCE_URL = "http://127.0.0.1:4021/v1/property/merida-001/maintenance-snapshot" as const;

export function requiredPayTo(): `0x${string}` {
  const value = process.env.PAY_TO;
  if (!value || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new Error("PAY_TO debe ser una dirección EVM de 20 bytes");
  }
  return value as `0x${string}`;
}
