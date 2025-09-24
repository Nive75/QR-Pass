
// Import des hooks React et du composant QRCodeSVG
import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

// Props du composant BeaconQR
interface BeaconQRProps {
  /** Donnée à afficher dans le QR code (optionnelle) */
  jsonData?: string;
  /** Intervalle de rafraîchissement en ms (optionnel, défaut 60s) */
  refreshInterval?: number;
}

// Génère une string JSON aléatoire pour simuler un beacon (id + clé publique)
function generateRandomBeacon() {
  return JSON.stringify({
    // id alphanumérique court
    id: Math.random().toString(36).substring(2, 10),
    // pubKey alphanumérique plus long (factice ici)
    pubKey: Math.random().toString(36).substring(2, 34),
  });
}

// Composant principal BeaconQR
const BeaconQR: React.FC<BeaconQRProps> = ({
  jsonData,
  refreshInterval = 60000, // 60 secondes par défaut
}) => {
  // qrValue = valeur affichée dans le QR code
  // Si jsonData existe, on l'utilise, sinon on génère une valeur aléatoire
  const [qrValue, setQrValue] = useState(jsonData || generateRandomBeacon());

  // Si aucune donnée n'est passée, on régénère le QR code toutes les X secondes
  useEffect(() => {
    if (!jsonData) {
      const interval = setInterval(() => {
        setQrValue(generateRandomBeacon());
      }, refreshInterval);
      // Nettoyage de l'intervalle quand le composant est démonté ou jsonData change
      return () => clearInterval(interval);
    }
  }, [jsonData, refreshInterval]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Affichage du QR code avec la valeur courante */}
      <QRCodeSVG value={qrValue} size={256} />
      {/* Affichage du contenu JSON sous le QR code */}
      <pre className="text-xs bg-gray-100 p-2 rounded w-full max-w-xs overflow-x-auto">
        {qrValue}
      </pre>
      {/* Indication du rafraîchissement automatique */}
      <span className="text-gray-500 text-xs">
        QR actualisé toutes les {refreshInterval / 1000} secondes
      </span>
    </div>
  );
};

// Export du composant
export default BeaconQR;
