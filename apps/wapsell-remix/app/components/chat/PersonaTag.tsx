import React from 'react';
import { BuyerPersona } from '@wapsell/shared-types';

interface PersonaMetadata {
  persona_type: BuyerPersona;
  confidence: number;
  characteristics: string[];
}

export interface PersonaTagProps {
  persona: PersonaMetadata;
}

const personaConfig: Record<BuyerPersona, { color: string; label: string; emoji: string }> = {
  [BuyerPersona.RESEARCHER]: {
    color: 'bg-blue-100 text-blue-800 border border-blue-300',
    label: 'Researcher',
    emoji: '🔍',
  },
  [BuyerPersona.EARLY_ADOPTER]: {
    color: 'bg-purple-100 text-purple-800 border border-purple-300',
    label: 'Early Adopter',
    emoji: '🚀',
  },
  [BuyerPersona.DECISION_MAKER]: {
    color: 'bg-green-100 text-green-800 border border-green-300',
    label: 'Decision Maker',
    emoji: '👔',
  },
  [BuyerPersona.LATE_ADOPTER]: {
    color: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    label: 'Late Adopter',
    emoji: '⏱️',
  },
  [BuyerPersona.SKEPTIC]: {
    color: 'bg-red-100 text-red-800 border border-red-300',
    label: 'Skeptic',
    emoji: '⚠️',
  },
  [BuyerPersona.UNKNOWN]: {
    color: 'bg-gray-100 text-gray-800 border border-gray-300',
    label: 'Unknown',
    emoji: '❓',
  },
};

export const PersonaTag: React.FC<PersonaTagProps> = ({ persona }) => {
  const config = personaConfig[persona.persona_type];
  const confidencePercent = Math.round(persona.confidence * 100);

  return (
    <div className="flex flex-col gap-2">
      <div className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        <div className="flex items-center gap-1">
          <span>{config.emoji}</span>
          <span>{config.label}</span>
        </div>
        <div className="text-xs opacity-75 mt-0.5">
          Confidence: {confidencePercent}%
        </div>
      </div>
      {persona.characteristics.length > 0 && (
        <div className="text-xs text-gray-600 flex flex-col gap-0.5">
          {persona.characteristics.slice(0, 2).map((char, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <span className="text-gray-400">•</span>
              <span>{char}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
