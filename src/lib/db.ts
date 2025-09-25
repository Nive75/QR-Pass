//db.ts
import Dexie, { Table } from "dexie";
import { v4 as uuidv4 } from "uuid";
import { base64url } from "@scure/base";

/** Une rencontre avec un pair (peer) avec horodatage. */
export interface Encounter {
  id?: number;
  peerIdHash: string;
  ts: number;
  lastSeen: number;
}

/** Un message stocké que l’on transporte ou que l’on a reçu. */
export interface StoredMessage {
  id: string;
  toPeerIdHash: string;
  fromPeerIdHash?: string;
  /** Clé publique éphémère (base64url) utilisée par l'expéditeur pour chiffrer */
  epk_b64: string;
  payload: unknown;
  nonce_b64: string;
  ciphertext_b64: string;
  createdAt: number;
  delivered: boolean;
  deliveredAt?: number;
}

/**
 * Base Dexie de QR-Pass.
 * - encounters : pairs vus et horodatages
 * - messages : messages transportés ou reçus
 */
class QrPassDB extends Dexie {
  encounters!: Table<Encounter, number>;
  messages!: Table<StoredMessage, string>;

  constructor() {
    super("qrpass");
    // v1: messages sans epk_b64
    this.version(1).stores({
      encounters: "++id, peerIdHash, ts, lastSeen",
      messages: "id, toPeerIdHash, delivered, createdAt",
    });
    // v2: ajout du champ epk_b64 pour permettre au destinataire de déchiffrer
    this.version(2).stores({
      encounters: "++id, peerIdHash, ts, lastSeen",
      messages: "id, toPeerIdHash, delivered, createdAt, epk_b64",
    }).upgrade(async (tx) => {
      const msgs = await tx.table("messages").toArray();
      for (const m of msgs) {
        if (!("epk_b64" in m)) {
          // Valeur vide si inconnue; les anciens messages ne seront pas livrables sans ce champ
          (m as any).epk_b64 = "";
          await tx.table("messages").put(m);
        }
      }
    });
  }
}

export const db = new QrPassDB();

/** Encodage/décodage Base64URL via @scure/base (compatible navigateur) */
function toBase64Url(bytes: Uint8Array): string {
  return base64url.encode(bytes);
}
function fromBase64Url(b64: string): Uint8Array {
  return base64url.decode(b64);
}

/**
 * SHA-256 via WebCrypto. Copie en ArrayBuffer pour satisfaire les types TS.
 */
async function sha256Bytes(data: Uint8Array): Promise<Uint8Array> {
  if (globalThis.crypto && "subtle" in globalThis.crypto) {
    // Crée un nouveau Uint8Array pour garantir un ArrayBuffer en mémoire (et non un SharedArrayBuffer)
    const copy = new Uint8Array(data);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", copy);
    return new Uint8Array(digest);
  }
  throw new Error("WebCrypto n'est pas disponible pour SHA-256 dans cet environnement");
}

/**
 * Calcule peerIdHash = base64url(sha256(pubKeyRaw) tronqué à 16 octets)
 */
export async function computePeerIdHashFromPubB64(pubB64: string): Promise<string> {
  const raw = fromBase64Url(pubB64);
  const digest = await sha256Bytes(raw);
  const truncated = digest.slice(0, 16); // 128-bit
  return toBase64Url(truncated);
}

export async function saveEncounter(peerPubB64: string, ts: number): Promise<{ peerIdHash: string }> {
  const peerIdHash = await computePeerIdHashFromPubB64(peerPubB64);
  const existing = await db.encounters.where({ peerIdHash }).first();
  if (existing) {
    await db.encounters.update(existing.id!, { lastSeen: ts });
  } else {
    await db.encounters.add({ peerIdHash, ts, lastSeen: ts });
  }
  return { peerIdHash };
}

export async function saveMessage(msg: Omit<StoredMessage, "id" | "createdAt" | "delivered"> & { id?: string }): Promise<string> {
  const id = msg.id ?? uuidv4();
  const toSave: StoredMessage = {
    id,
    toPeerIdHash: msg.toPeerIdHash,
    fromPeerIdHash: msg.fromPeerIdHash,
    epk_b64: msg.epk_b64,
    payload: msg.payload,
    nonce_b64: msg.nonce_b64,
    ciphertext_b64: msg.ciphertext_b64,
    createdAt: Date.now(),
    delivered: false,
  };
  await db.messages.put(toSave);
  return id;
}

export async function listMessages(filter?: { toPeerIdHash?: string; delivered?: boolean }): Promise<StoredMessage[]> {
  if (filter?.toPeerIdHash != null && filter?.delivered != null) {
    // Filtre composé via .filter pour compatibilité boolean
    return await db.messages
      .where("toPeerIdHash")
      .equals(filter.toPeerIdHash)
      .filter((m) => m.delivered === filter.delivered)
      .sortBy("createdAt");
  }
  if (filter?.toPeerIdHash != null) {
    return await db.messages.where("toPeerIdHash").equals(filter.toPeerIdHash).sortBy("createdAt");
  }
  if (filter?.delivered != null) {
    return await db.messages.filter((m) => m.delivered === filter.delivered).sortBy("createdAt");
  }
  return await db.messages.orderBy("createdAt").toArray();
}

export async function markDelivered(id: string): Promise<void> {
  const existing = await db.messages.get(id);
  if (!existing) return;
  await db.messages.update(id, { delivered: true, deliveredAt: Date.now() });
}


