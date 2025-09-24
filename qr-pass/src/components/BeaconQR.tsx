import React, { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface BeaconQRProps {
  jsonData?: string;
  refreshInterval?: number; // en ms
}

// Génère une string JSON aléatoire pour la démo
function generateRandomBeacon() {
  return JSON.stringify({
    id: Math.random().toString(36).substring(2, 10),
    pubKey: Math.random().toString(36).substring(2, 34),
  });
}

const BeaconQR: React.FC<BeaconQRProps> = ({
  jsonData,
  refreshInterval = 60000,
}) => {
  const [qrValue, setQrValue] = useState(jsonData || generateRandomBeacon());

  useEffect(() => {
    if (!jsonData) {
      const interval = setInterval(() => {
        setQrValue(generateRandomBeacon());
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [jsonData, refreshInterval]);

  return (
    <div className="flex flex-col items-center gap-4">
      <QRCodeSVG value={qrValue} size={256} />
      <pre className="text-xs bg-gray-100 p-2 rounded w-full max-w-xs overflow-x-auto">
        {qrValue}
      </pre>
      <span className="text-gray-500 text-xs">
        QR actualisé toutes les {refreshInterval / 1000} secondes
      </span>
    </div>
  );
};

export default BeaconQR;
