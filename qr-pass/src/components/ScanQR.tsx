import React, { useState } from "react";
import { QrReader } from "@blackbox-vision/react-qr-reader";

/**
 * Composant ScanQR
 * Utilise la caméra pour scanner un QR code et affiche le contenu JSON scanné
 */
const ScanQR: React.FC = () => {
  // État pour stocker le résultat du scan
  const [scanResult, setScanResult] = useState<string | null>(null);
  // État pour les erreurs éventuelles
  const [error, setError] = useState<string | null>(null);

  // Fonction appelée à chaque scan ou erreur (types adaptés à la librairie)
  const handleResult = (result?: unknown, error?: Error | null) => {
    if (
      result &&
      typeof (result as { getText: () => string }).getText === "function"
    ) {
      setScanResult((result as { getText: () => string }).getText());
      setError(null);
    } else if (error && error.name !== "NotFoundException") {
      // Message personnalisé si la caméra n'est pas accessible
      if (
        error.name === "NotAllowedError" ||
        error.name === "NotFoundError" ||
        error.message?.toLowerCase().includes("camera")
      ) {
        setError(
          "Caméra non disponible ou refusée. Essayez sur un mobile ou autorisez l'accès à la caméra."
        );
      } else {
        setError(error.message || "Erreur lors du scan");
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Composant de scan QR */}
      <QrReader
        constraints={{ facingMode: "environment" }}
        onResult={handleResult}
        containerStyle={{ width: "100%", maxWidth: 320 }}
        videoStyle={{ width: "100%" }}
      />
      {/* Affichage du résultat brut */}
      <div className="w-full max-w-xs">
        <h3 className="font-bold text-sm mb-1">Résultat du scan :</h3>
        {scanResult ? (
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
            {scanResult}
          </pre>
        ) : (
          <span className="text-gray-400 text-xs">Aucun QR code scanné</span>
        )}
        {error && <div className="text-red-500 text-xs mt-2">{error}</div>}
      </div>
    </div>
  );
};

export default ScanQR;
