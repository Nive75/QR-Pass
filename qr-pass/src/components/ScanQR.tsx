import React, { useState, useRef } from "react";
import { QrReader } from "@blackbox-vision/react-qr-reader";
import { QRCodeSVG } from "qrcode.react";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";
import { addEncounter } from "../pages/Encounters";

const TRANSIENT_ERRORS = new Set([
  "NotFoundException",
  "NotFoundException2",
  "ChecksumException",
  "ChecksumException2",
  "FormatException",
  "FormatException2",
]);

const ScanQR: React.FC = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decryptedMsg, setDecryptedMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [localKeyPair] = useState(() => nacl.box.keyPair());

  function decryptMessage(
    sharedKey: Uint8Array,
    nonce: Uint8Array,
    box: Uint8Array
  ) {
    try {
      const msgUint8 = nacl.box.open(
        box,
        nonce,
        sharedKey,
        localKeyPair.secretKey
      );
      if (!msgUint8) return null;
      return naclUtil.encodeUTF8(msgUint8);
    } catch {
      return null;
    }
  }

  const [beaconData, setBeaconData] = useState<any>(null);
  const [responseMsg, setResponseMsg] = useState("");
  const [responseQR, setResponseQR] = useState<string | null>(null);

  // Petit throttle pour éviter trop d’updates UI
  const lastHandledRef = useRef<number>(0);
  const MIN_INTERVAL_MS = 200;

  const handleResult = (result?: unknown, err?: Error | null) => {
    const now = Date.now();
    if (now - lastHandledRef.current < MIN_INTERVAL_MS) return;
    lastHandledRef.current = now;

    if (result && typeof (result as { getText: () => string }).getText === "function") {
      const raw = (result as { getText: () => string }).getText();

      setScanResult(raw);
      setError(null);
      setDecryptedMsg(null);
      setToast(null);
      setResponseQR(null);

      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        setToast("QR non reconnu (pas un JSON valide)");
        setBeaconData(null);
        return;
      }

      // Détection du type
      if (parsed && parsed.type === "response" && parsed.pubKey && parsed.nonce && parsed.box) {
        try {
          const theirPubKey = naclUtil.decodeBase64(parsed.pubKey);
          const nonce = naclUtil.decodeBase64(parsed.nonce);
          const box = naclUtil.decodeBase64(parsed.box);

          // Dérivation du sharedKey
          const sharedKey = nacl.box.before(theirPubKey, localKeyPair.secretKey);

          const msg = decryptMessage(sharedKey, nonce, box);
          if (msg) {
            setDecryptedMsg(msg);
            setToast("Message déchiffré !");
          } else {
            setToast("Impossible de déchiffrer le message.");
          }
        } catch (e) {
          console.error("Déchiffrement error:", e);
          setToast("Erreur lors du déchiffrement.");
        }
        setBeaconData(null);
      } else if (parsed && parsed.pubKey && parsed.id) {
        setToast("QR Beacon détecté. Prêt à générer une réponse.");
        setBeaconData(parsed);
        addEncounter(parsed.id);
      } else {
        setToast("QR inconnu ou incomplet.");
        setBeaconData(null);
      }
    } else if (err) {
      // On ignore les erreurs de décodage transitoires
      if (!TRANSIENT_ERRORS.has(err.name)) {
        setError((err.message || JSON.stringify(err)) + ` (type: ${err.name})`);
        console.error("Erreur ScanQR:", err);
      }
    }
  };

  function handleGenerateResponse() {
    if (!beaconData || !responseMsg) return;

    const keyPairB = nacl.box.keyPair();
    const recipientPubKey = naclUtil.decodeBase64(beaconData.pubKey);

    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    // NOTE: On chiffre directement avec pubKey destinataire + secret B
    const box = nacl.box(
      naclUtil.decodeUTF8(responseMsg),
      nonce,
      recipientPubKey,
      keyPairB.secretKey
    );

    const response = {
      type: "response",
      pubKey: naclUtil.encodeBase64(keyPairB.publicKey),
      nonce: naclUtil.encodeBase64(nonce),
      box: naclUtil.encodeBase64(box),
      from: beaconData.id,
      note: responseMsg,
      at: Date.now(),
    };

    setResponseQR(JSON.stringify(response));
    setToast("QR Response généré !");
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Caméra */}
      <div
        className="w-full max-w-xs bg-gray-200 rounded-lg overflow-hidden flex flex-col items-center justify-center"
        style={{ minHeight: 260 }}
      >
        <QrReader
          onResult={handleResult}
          constraints={{
            facingMode: { ideal: "environment" },
            width: { ideal: 960, min: 640 },
            height: { ideal: 720, min: 480 },
          }}
          scanDelay={200}
          containerStyle={{ width: "100%", maxWidth: 360 }}
          videoStyle={{ width: "100%", minHeight: 260, objectFit: "cover" }}
        />
      </div>

      <div className="w-full max-w-xs text-center mt-2">
        <span className="bg-black bg-opacity-40 text-white rounded px-3 py-1 text-sm">
          Visez un QR code avec la caméra
        </span>
      </div>

      <div className="w-full max-w-xs">
        {scanResult ? (
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
            {scanResult}
          </pre>
        ) : null}

        {decryptedMsg && (
          <div className="bg-green-100 text-green-800 p-2 rounded text-xs mt-2">
            Message déchiffré : {decryptedMsg}
          </div>
        )}

        {beaconData && (
          <div className="bg-yellow-50 p-2 rounded text-xs mt-2 flex flex-col gap-2">
            <span className="font-bold text-yellow-800">Générer une réponse :</span>
            <input
              type="text"
              className="border rounded p-1 text-xs mb-2"
              placeholder="Message à envoyer (ex: coucou)"
              value={responseMsg}
              onChange={(e) => setResponseMsg(e.target.value)}
            />
            <button
              className="bg-blue-600 text-white rounded p-2 text-xs hover:bg-blue-700 transition"
              onClick={handleGenerateResponse}
            >
              Générer QR Response
            </button>
          </div>
        )}

        {responseQR && (
          <div className="flex flex-col items-center gap-2 mt-2">
            <span className="font-bold text-green-700 text-xs">QR Response :</span>
            <QRCodeSVG value={responseQR} size={320} level="H" includeMargin />
            <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto max-w-xs">
              {responseQR}
            </pre>
          </div>
        )}

        {toast && (
          <div className="bg-blue-100 text-blue-800 p-2 rounded text-xs mt-2">
            {toast}
          </div>
        )}

        {/* Erreur caméra “vive” uniquement (permissions, device) */}
        {error && (
          <div className="bg-red-100 text-red-800 p-2 rounded text-xs mt-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScanQR;
