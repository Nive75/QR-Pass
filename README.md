# QR-Pass

Projet collaboratif QR-Pass — Crypto helpers + Gossip + Persistance

## Pile

- Dexie (IndexedDB) pour la persistance
- TweetNaCl pour X25519 + XSalsa20-Poly1305
- `@scure/base` pour base64url
- `uuid` pour les identifiants de messages

## Modules

- `src/lib/crypto.ts` — utilitaires crypto
  - `generateKeyPair()` → `{ publicKeyB64, secretKeyB64 }`
  - `computeShared(theirPubB64, mySecretKeyB64)` → `sharedKeyB64`
  - `encryptWithShared(sharedKeyB64, clearObj)` → `{ nonceB64, ciphertextB64 }`
  - `decryptWithShared(sharedKeyB64, nonceB64, ciphertextB64)` → `clearObj | null`
  - Encodage: Base64URL

- `src/lib/payloads.ts` — builders et validations
  - `makeBeacon(epkB64)` → `{ type:"beacon", epk_b64, v:1 }`
  - `makeResponse(epkB64, nonceB64, ciphertextB64)` → `{ type:"response", ... }`
  - `validators.isBase64Url(str)`

- `src/lib/db.ts` — persistance Dexie
  - Tables:
    - `encounters`: `++id, peerIdHash, ts, lastSeen`
    - `messages`: `id, toPeerIdHash, delivered, createdAt`
  - `computePeerIdHashFromPubB64(pubB64)` → base64url(SHA-256(pub) tronqué 16 bytes)
  - `saveEncounter(peerPubB64, ts)` → `{ peerIdHash }`
  - `saveMessage(msg)` / `listMessages(filter)` / `markDelivered(id)`

- `src/lib/gossip.ts` — helpers basiques de livraison
  - `attemptDeliveryForPeer(peerIdHash)` → liste des messages en attente pour ce peer
  - `ingestBeaconOrResponse(obj)` → hook extensible
  - `acceptDeliveredMessage(id)` → marque livré

## Flux E2E (résumé)

1. Un expéditeur chiffre un message avec un `sharedKey` dérivé via ECDH (X25519) entre sa clé éphémère et la clé publique du destinataire.
2. Le message est encapsulé `{ epk_sender, nonce, ciphertext }` et confié à un pair transporteur.
3. Le transporteur ne peut pas lire (E2E). Il ne fait que relayer jusqu’à rencontrer le destinataire.
4. À la réception, le destinataire dérive le même `sharedKey` et déchiffre le payload.

## Exemples rapides

```ts
import { generateKeyPair, computeShared, encryptWithShared, decryptWithShared } from "./src/lib/crypto";
import { saveMessage, listMessages } from "./src/lib/db";

const alice = generateKeyPair();
const bob = generateKeyPair();

const sharedA = computeShared(bob.publicKeyB64, alice.secretKeyB64);
const { nonceB64, ciphertextB64 } = encryptWithShared(sharedA, { hello: "bob" });

const sharedB = computeShared(alice.publicKeyB64, bob.secretKeyB64);
const clear = decryptWithShared(sharedB, nonceB64, ciphertextB64);
```

## Sécurité

- Clés éphémères recommandées par session; nonces aléatoires 24 octets.
- Clés privées jamais persistées en clair dans IndexedDB.
- Identifiants `peerIdHash`: SHA-256 tronqué (128 bits) → collision négligeable.

