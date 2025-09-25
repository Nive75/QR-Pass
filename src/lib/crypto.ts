//crypto.ts
import nacl from "tweetnacl";
import { base64url } from "@scure/base";

/**
 * Paire de clés NaCl (X25519) encodées en base64url pour faciliter le transport (QR/URL).
 */
export type KeyPairB64 = {
  publicKeyB64: string;
  secretKeyB64: string;
};

/** Encode en Base64URL */
function toBase64Url(bytes: Uint8Array): string {
  return base64url.encode(bytes);
}

/** Décode depuis Base64URL */
function fromBase64Url(b64: string): Uint8Array {
  return base64url.decode(b64);
}

/** JSON.stringify + encodage UTF-8 */
function encodeJson(value: unknown): Uint8Array {
  const json = JSON.stringify(value);
  return new TextEncoder().encode(json);
}

/** Décodage UTF-8 + JSON.parse (sécurisé) */
function decodeJsonSafe(bytes: Uint8Array): unknown | null {
  try {
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch (_e) {
    return null;
  }
}

/**
 * Génère une paire de clés X25519 (NaCl box), longue durée ou éphémère.
 * Renvoie les clés encodées en base64url (pratique pour QR/URL).
 */
export function generateKeyPair(): KeyPairB64 {
  const kp = nacl.box.keyPair();
  return {
    publicKeyB64: toBase64Url(kp.publicKey),
    secretKeyB64: toBase64Url(kp.secretKey),
  };
}

/**
 * Calcule une clé partagée ECDH via NaCl.box.before.
 * - theirPubB64: clé publique du pair (base64url)
 * - mySecretKeyB64: notre clé secrète (base64url)
 * Renvoie la clé partagée (32 octets) encodée en base64url.
 */
export function computeShared(theirPubB64: string, mySecretKeyB64: string): string {
  const theirPub = fromBase64Url(theirPubB64);
  const mySecret = fromBase64Url(mySecretKeyB64);
  if (theirPub.length !== nacl.box.publicKeyLength) {
    throw new Error("Longueur theirPubB64 invalide");
  }
  if (mySecret.length !== nacl.box.secretKeyLength) {
    throw new Error("Longueur mySecretKeyB64 invalide");
  }
  const shared = nacl.box.before(theirPub, mySecret);
  return toBase64Url(shared);
}

/**
 * Chiffre un objet JSON-serialisable avec une clé partagée pré‑calculée (base64url).
 * Renvoie `nonce` et `ciphertext` en base64url.
 */
export function encryptWithShared(
  sharedKeyB64: string,
  clearObj: unknown
): { nonceB64: string; ciphertextB64: string } {
  const shared = fromBase64Url(sharedKeyB64);
  if (shared.length !== nacl.box.before(nacl.box.keyPair().publicKey, nacl.box.keyPair().secretKey).length) {
    // 32 octets attendus
    throw new Error("Longueur de sharedKey invalide");
  }
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const plaintext = encodeJson(clearObj);
  const boxed = nacl.box.after(plaintext, nonce, shared);
  return { nonceB64: toBase64Url(nonce), ciphertextB64: toBase64Url(boxed) };
}

/**
 * Déchiffre avec une clé partagée pré‑calculée (base64url).
 * Renvoie l’objet parsé ou `null` si l’authentification échoue.
 */
export function decryptWithShared(
  sharedKeyB64: string,
  nonceB64: string,
  ciphertextB64: string
): unknown | null {
  const shared = fromBase64Url(sharedKeyB64);
  const nonce = fromBase64Url(nonceB64);
  const cipher = fromBase64Url(ciphertextB64);
  const opened = nacl.box.open.after(cipher, nonce, shared);
  if (!opened) return null;
  return decodeJsonSafe(opened);
}

/** Helpers d’encodage base64url */
export const b64u = { encode: toBase64Url, decode: fromBase64Url };


