import React, { useEffect, useState } from "react";

interface Encounter {
  id: string;
  timestamp: number;
}

const ENCOUNTERS_KEY = "qrpass_encounters";

function getEncounters(): Encounter[] {
  const raw = localStorage.getItem(ENCOUNTERS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function addEncounter(id: string) {
  const encounters = getEncounters();
  // Évite les doublons
  if (!encounters.find(e => e.id === id)) {
    encounters.unshift({ id, timestamp: Date.now() });
    localStorage.setItem(ENCOUNTERS_KEY, JSON.stringify(encounters));
  }
}

const Encounters: React.FC = () => {
  const [encounters, setEncounters] = useState<Encounter[]>([]);

  useEffect(() => {
    setEncounters(getEncounters());
    // Optionnel : écoute le storage pour mise à jour en direct
    const onStorage = () => setEncounters(getEncounters());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <div className="flex flex-col items-center min-h-screen p-4">
      <h2 className="text-xl font-bold mb-4">Rencontres</h2>
      {encounters.length === 0 ? (
        <div className="text-gray-500">Aucune rencontre enregistrée</div>
      ) : (
        <ul className="w-full max-w-md">
          {encounters.map(e => (
            <li key={e.id} className="bg-gray-100 rounded p-2 mb-2 flex flex-col">
              <span className="font-mono text-sm">ID: {e.id}</span>
              <span className="text-xs text-gray-600">{new Date(e.timestamp).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Encounters;
export { addEncounter };
