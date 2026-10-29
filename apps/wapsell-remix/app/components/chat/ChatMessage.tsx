import React from 'react';
import { PersonaTag } from './PersonaTag';
import { BuyerPersona } from '@otrarondamas/shared-types';

export interface ChatMessageProps {
  role: 'user' | 'bot';
  content: string;
  persona?: {
    persona_type: BuyerPersona;
    confidence: number;
    characteristics: string[];
  };
  timestamp?: Date;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  persona,
  timestamp,
}) => {
  const isUser = role === 'user';

  return (
    <div
      className={`flex gap-3 mb-4 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      } animate-fadeIn`}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white ${
          isUser ? 'bg-blue-600' : 'bg-gray-500'
        }`}
      >
        {isUser ? 'U' : 'B'}
      </div>

      {/* Message Bubble */}
      <div
        className={`flex-1 max-w-xs lg:max-w-md ${
          isUser ? 'flex justify-end' : 'flex justify-start'
        }`}
      >
        <div
          className={`px-4 py-2 rounded-lg break-words ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-none'
              : 'bg-gray-100 text-gray-900 rounded-bl-none'
          }`}
        >
          <p className="text-sm">{content}</p>
          {timestamp && (
            <p
              className={`text-xs mt-1 opacity-70 ${
                isUser ? 'text-blue-100' : 'text-gray-500'
              }`}
            >
              {timestamp.toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      </div>

      {/* Persona Badge */}
      {persona && !isUser && (
        <div className="flex-shrink-0 flex flex-col gap-1">
          <PersonaTag persona={persona} />
        </div>
      )}
    </div>
  );
};
