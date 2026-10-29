import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { ChatInput } from './ChatInput';
import { BuyerPersona } from '@wapsell/shared-types';

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'bot';
  timestamp: Date;
  persona?: {
    persona_type: BuyerPersona;
    confidence: number;
    characteristics: string[];
  };
}

export interface ChatContainerProps {
  messages: Message[];
  isLoading?: boolean;
  onSendMessage: (message: string) => void;
  error?: string;
  showHeader?: boolean;
  title?: string;
}

export const ChatContainer: React.FC<ChatContainerProps> = ({
  messages,
  isLoading = false,
  onSendMessage,
  error,
  showHeader = true,
  title = 'Chat',
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm">
      {/* Header */}
      {showHeader && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">Powered by AI</p>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !error && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-2">💬</div>
              <p className="text-gray-500">
                Inicia una conversación haciendo una pregunta
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">Error</p>
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            persona={msg.persona}
            timestamp={msg.timestamp}
          />
        ))}

        {isLoading && <TypingIndicator isVisible={true} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <ChatInput
        onSend={onSendMessage}
        disabled={error !== undefined && error !== ''}
        isLoading={isLoading}
      />
    </div>
  );
};
