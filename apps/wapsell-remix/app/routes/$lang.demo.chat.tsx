import { json } from '@remix-run/node';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { ChatContainer, Message } from '~/components/chat/ChatContainer';
import {
  sendChatMessage,
  generateDemoSessionId,
  ChatAPIError,
} from '~/services/chat.client';
import type { ChatMessageResponse } from '@wapsell/shared-types';

interface DemoChatLoaderData {
  sessionId: string;
}

/**
 * Loader: Generate temporary demo session ID
 * No auth required
 */
export const loader = async () => {
  return json<DemoChatLoaderData>({
    sessionId: generateDemoSessionId(),
  });
};

/**
 * Public Demo Chat Route
 * - No authentication required
 * - Single-turn chat with message history (session only)
 * - Persona detection per message
 * - Temporary session ID (stored in browser state)
 */
export default function DemoChatPage() {
  const { sessionId: initialSessionId } = useLoaderData<DemoChatLoaderData>();
  const fetcher = useFetcher();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [sessionId, setSessionId] = useState(initialSessionId);

  // Auto-focus chat input on mount
  useEffect(() => {
    const inputElement = document.querySelector('textarea');
    inputElement?.focus();
  }, []);

  const handleSendMessage = async (userMessage: string) => {
    // Add user message optimistically
    const userMsgId = `user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        content: userMessage,
        role: 'user',
        timestamp: new Date(),
      },
    ]);

    setIsLoading(true);
    setError(undefined);

    try {
      const response = await sendChatMessage(userMessage, sessionId);

      // Add bot response with persona
      const botMsgId = `bot-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          content: response.response,
          role: 'bot',
          timestamp: new Date(response.created_at),
          persona: response.persona,
        },
      ]);

      // Update session ID if changed by server
      if (response.session_id !== sessionId) {
        setSessionId(response.session_id);
      }
    } catch (err) {
      let errorMessage = 'Chat service unavailable';

      if (err instanceof ChatAPIError) {
        if (err.statusCode === 400) {
          errorMessage = 'Invalid message. Please try again.';
        } else if (err.statusCode === 408) {
          errorMessage = 'Request timeout. Please try again.';
        } else if (err.statusCode >= 500) {
          errorMessage = 'Chat service unavailable';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
      console.error('[demo-chat] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl h-96 md:h-[600px]">
        <ChatContainer
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          error={error}
          title="Wapsell Demo Chat"
        />
      </div>
    </div>
  );
}
