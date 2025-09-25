//gossip.ts
import { listMessages, markDelivered } from "./db";
import type { Beacon, Response } from "./payloads";

// attemptDeliveryForPeer : essaie de livrer les messages en file pour un peerIdHash donné.
// La couche de transport (afficher un QR, envoyer par NFC, etc.) est à l’extérieur ;
// ici on renvoie simplement la liste des messages à transmettre.

export async function attemptDeliveryForPeer(peerIdHash: string) {
  const pending = await listMessages({ toPeerIdHash: peerIdHash, delivered: false });
  return pending;
}

// ingestBeaconOrResponse : crochet pour persister les rencontres, et plus tard traiter des accusés.
export async function ingestBeaconOrResponse(obj: Beacon | Response) {
  // Dans une application complète, on mettrait à jour les rencontres
  // et on traiterait éventuellement des accusés de réception.
  // Ici, c’est un placeholder pour conserver une API cohérente.
  return obj;
}

// Utilitaire pour marquer un message comme livré (si c’est le nôtre),
// ou l’ajouter au stock si on est transporteur (selon votre flux UI).
export async function acceptDeliveredMessage(
  id: string
) {
  await markDelivered(id);
}


