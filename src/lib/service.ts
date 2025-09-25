//service.ts
import { generateKeyPair, computeShared, encryptWithShared, decryptWithShared } from "./crypto";
import { computePeerIdHashFromPubB64, saveMessage, listMessages, markDelivered } from "./db";

/**
 * Service de haut niveau pour orchestrer la préparation et la livraison de messages.
 * Conçu pour s’intégrer facilement avec l’UI (scan QR, sélection du destinataire, etc.).
 */
export const Service = {
  /**
   * Prépare un message E2E pour un destinataire, en générant une clé éphémère d’expéditeur.
   * - recipientPubB64 : clé publique du destinataire (base64url)
   * - mySecretKeyB64 : notre clé secrète (base64url)
   * - clearPayload : objet JSON à chiffrer
   * Retourne : { toPeerIdHash, epk_b64, nonce_b64, ciphertext_b64 }
   */
  async prepareMessage(recipientPubB64: string, mySecretKeyB64: string, clearPayload: unknown) {
    const epk = generateKeyPair();
    const shared = computeShared(recipientPubB64, epk.secretKeyB64);
    const { nonceB64, ciphertextB64 } = encryptWithShared(shared, clearPayload);
    const toPeerIdHash = await computePeerIdHashFromPubB64(recipientPubB64);
    return { toPeerIdHash, epk_b64: epk.publicKeyB64, nonce_b64: nonceB64, ciphertext_b64: ciphertextB64 };
  },

  /**
   * Stocke un message préparé localement pour un transport ultérieur.
   * - opts doit inclure toPeerIdHash, epk_b64, nonce_b64, ciphertext_b64, et (optionnel) fromPeerIdHash, payload
   * Retourne l’ID du message.
   */
  async storePreparedMessage(opts: {
    toPeerIdHash: string;
    epk_b64: string;
    nonce_b64: string;
    ciphertext_b64: string;
    fromPeerIdHash?: string;
    payload?: unknown;
  }) {
    return await saveMessage({
      toPeerIdHash: opts.toPeerIdHash,
      fromPeerIdHash: opts.fromPeerIdHash,
      epk_b64: opts.epk_b64,
      payload: opts.payload ?? null,
      nonce_b64: opts.nonce_b64,
      ciphertext_b64: opts.ciphertext_b64,
    });
  },

  /**
   * Liste les messages en attente pour un destinataire (par peerIdHash).
   */
  async listPendingFor(peerIdHash: string) {
    return await listMessages({ toPeerIdHash: peerIdHash, delivered: false });
  },

  /**
   * Marque un message comme livré après remise réussie.
   */
  async delivered(id: string) {
    await markDelivered(id);
  },

  /**
   * Déchiffre côté destinataire un message reçu (nécessite sa clé secrète et l’epk_b64 de l’expéditeur).
   * Retourne l’objet clair ou null si l’authentification échoue.
   */
  decryptReceived(mySecretKeyB64: string, senderEpkB64: string, nonceB64: string, ciphertextB64: string) {
    const shared = computeShared(senderEpkB64, mySecretKeyB64);
    return decryptWithShared(shared, nonceB64, ciphertextB64);
  },
};


