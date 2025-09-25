## QR‑Pass — Description fonctionnelle et technique

### Objectif

QR‑Pass implémente un schéma de « gossip » sécurisé: un émetteur prépare un message chiffré pour un destinataire, puis des pairs intermédiaires le transportent et le livrent opportunément (par QR, NFC, etc.) sans jamais pouvoir lire le contenu. Les données persistent côté client (IndexedDB via Dexie).

---

## Périmètre réalisé

- Crypto helpers: génération de clés, ECDH, chiffrement/déchiffrement (`src/lib/crypto.ts`).
- Payloads: constructeurs Beacon/Response avec validations (`src/lib/payloads.ts`).
- Persistance: schéma Dexie, stockage des rencontres et des messages (`src/lib/db.ts`).
- Gossip minimal: récupération des messages à livrer, marquage livré (`src/lib/gossip.ts`).
- Service haut‑niveau: orchestration préparation → stockage → livraison → déchiffrement (`src/lib/service.ts`).
- Documentation d’usage dans `README.md` et ce document.

---

## Architecture

- `src/lib/crypto.ts` (TweetNaCl)
  - `generateKeyPair()` — clés X25519 en base64url.
  - `computeShared(theirPubB64, mySecretKeyB64)` — derive la clé partagée (ECDH).
  - `encryptWithShared(sharedKeyB64, clearObj)` / `decryptWithShared(...)` — chiffrer/déchiffrer (XSalsa20‑Poly1305) un objet JSON.
  - Helpers base64url et encodage JSON.

- `src/lib/payloads.ts`
  - `makeBeacon(epkB64)` — annonce une clé éphémère publique.
  - `makeResponse(epkB64, nonceB64, ciphertextB64)` — porte la clé éphémère et le chiffré.
  - Validation base64url.

- `src/lib/db.ts` (Dexie/IndexedDB)
  - Tables:
    - `encounters`: `++id, peerIdHash, ts, lastSeen` (rencontres de pairs)
    - `messages`: `id, toPeerIdHash, delivered, createdAt, epk_b64` + contenu
  - Fonctions:
    - `computePeerIdHashFromPubB64(pubB64)` — SHA‑256(pub) tronqué 16 bytes → base64url.
    - `saveEncounter(peerPubB64, ts)` — log d’une rencontre.
    - `saveMessage(msg)` / `listMessages(filter)` / `markDelivered(id)` — gestion messages.

- `src/lib/gossip.ts`
  - `attemptDeliveryForPeer(peerIdHash)` — récupère les messages à livrer.
  - `acceptDeliveredMessage(id)` — marque livré.
  - `ingestBeaconOrResponse(obj)` — point d’extension (placeholder) pour persister/traiter un scan.

- `src/lib/service.ts` (orchestration)
  - `prepareMessage(recipientPubB64, mySecretKeyB64, clearPayload)` — génère `epk`, dérive `shared`, chiffre, calcule `toPeerIdHash`.
  - `storePreparedMessage({ toPeerIdHash, epk_b64, nonce_b64, ciphertext_b64, ... })` — persiste un message à transporter.
  - `listPendingFor(peerIdHash)` — liste des messages en attente.
  - `delivered(id)` — marque livré.
  - `decryptReceived(mySecretKeyB64, senderEpkB64, nonceB64, ciphertextB64)` — déchiffrement côté destinataire.

---

## Choix techniques importants

- Courbe/Schéma: X25519 (ECDH) + XSalsa20‑Poly1305 (NaCl box.after). Nonce aléatoire 24 octets.
- Encodage: Base64URL (sans padding) pour clés/nonce/chiffré (compatibles QR/URLs).
- Identifiant destinataire: `peerIdHash = base64url(sha256(pubKeyRaw)[0..16])` — 128 bits, collisions négligeables pour l’usage d’identifiant non secret.
- Persistance: IndexedDB via Dexie. Migration `v2` ajoute `epk_b64` aux messages pour permettre au destinataire de déchiffrer.

---

## Flux fonctionnels (départ → arrivée)

### 1) Préparation d’un message (Expéditeur → Transport)

1. L’expéditeur connaît `pubC_b64` (clé publique de C).
2. Il appelle `Service.prepareMessage(pubC_b64, mySecret_b64, payload)`:
   - Génère une éphémère `epk` (clé publique/privée).
   - Calcule `shared = computeShared(pubC_b64, epk.secret)`.
   - Chiffre `payload` → `{ nonce_b64, ciphertext_b64 }`.
   - Calcule `toPeerIdHash = hash(pubC_b64)`.
   - Retourne `{ toPeerIdHash, epk_b64, nonce_b64, ciphertext_b64 }`.
3. Il persiste le paquet via `Service.storePreparedMessage(...)`.
4. Un transporteur (pair B) récupère ce paquet (hors bande) et le stocke.

### 2) Transport opportuniste (Gossip)

1. Quand B rencontre un pair (ex: C), il obtient/derive `peerIdHash(C)`.
2. B appelle `Service.listPendingFor(peerIdHashC)` pour lister les messages destinés à C.
3. B « livre » en présentant/émettant `{ epk_b64, nonce_b64, ciphertext_b64 }` (p.ex. QR).

### 3) Réception et déchiffrement (Destinataire)

1. C reçoit le paquet et appelle `Service.decryptReceived(mySecret_b64, epk_b64, nonce_b64, ciphertext_b64)`.
2. C récupère l’objet clair si l’authentification réussit (`null` sinon).
3. Après succès, B (ou l’expéditeur) marque le message livré: `Service.delivered(id)`.

---

## Exemples d’usage (extraits)

### Préparer et stocker

```ts
import { Service } from "./src/lib/service";

const prepared = await Service.prepareMessage(pubC_b64, mySecret_b64, { hello: "C" });
const id = await Service.storePreparedMessage(prepared);
```

### Lister à livrer

```ts
const pending = await Service.listPendingFor(peerIdHashC);
// Afficher chaque paquet (QR, NFC, etc.)
```

### Déchiffrer côté destinataire

```ts
const clear = Service.decryptReceived(mySecret_b64, epk_b64, nonce_b64, ciphertext_b64);
```

### Marquer livré

```ts
await Service.delivered(id);
```

---

## Sécurité et bonnes pratiques

- Utiliser des clés éphémères par session/message pour la confidentialité persistante (PFS).
- Nonce unique par chiffrement; généré aléatoirement.
- Ne jamais persister les clés secrètes en clair dans IndexedDB.
- `peerIdHash` n’est pas un secret; c’est un identifiant routage.

---

## Évolutions possibles

- Accusés de réception signés, mécanisme d’anti‑rejeu.
- Gestion d’identité long‑terme (signature, rotation des clés éphémères).
- Compression/fragmentation pour gros payloads (QR multi‑trames).
- Tests unitaires et scénarios d’intégration.


