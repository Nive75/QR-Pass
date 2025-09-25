//payloads.ts
import { base64url } from "@scure/base";

/** Payload Beacon minimal: diffuse une clé publique éphémère pour initier l’échange. */
export type Beacon = { type: "beacon"; epk_b64: string; v: 1 };
export type Response = {
  type: "response";
  epk_b64: string;
  nonce_b64: string;
  ciphertext_b64: string;
  v: 1;
};

/** Validation basique base64url via @scure/base */
function isBase64Url(str: string): boolean {
  if (!str || typeof str !== "string") return false;
  try {
    // decode will throw if invalid
    base64url.decode(str);
    return true;
  } catch {
    return false;
  }
}

/** Construit un Beacon avec forme minimale et version. */
export function makeBeacon(epkB64: string): Beacon {
  if (!isBase64Url(epkB64)) throw new Error("Invalid epkB64 base64url");
  return { type: "beacon", epk_b64: epkB64, v: 1 };
}

/** Construit un Response portant la clé éphémère + le texte chiffré. */
export function makeResponse(
  epkB64: string,
  nonceB64: string,
  ciphertextB64: string
): Response {
  if (!isBase64Url(epkB64)) throw new Error("Invalid epkB64 base64url");
  if (!isBase64Url(nonceB64)) throw new Error("Invalid nonce base64url");
  if (!isBase64Url(ciphertextB64)) throw new Error("Invalid ciphertext base64url");
  return { type: "response", epk_b64: epkB64, nonce_b64: nonceB64, ciphertext_b64: ciphertextB64, v: 1 };
}

/** Exporte les validateurs simples */
export const validators = { isBase64Url };


