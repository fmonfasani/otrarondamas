import { json, redirect, LoaderFunction } from '@remix-run/node';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { useState, useEffect } from 'react';
import { ChatContainer, Message } from '~/components/chat/ChatContainer';
import { SessionList } from '~/components/chat/SessionList';
import {
  sendChatMessage,
  getChatHistory,
  getChatSessions,
  deleteChatSession,
  ChatAPIError,
} from '~/services/chat.client';
import { requireAuth } from '~/services/auth.server';
import type { ChatMessageResponse } from '@wapsell/shared-types';

interface ProtectedChatLoaderData {
  sessionId: string | null;
  sessions: Array<{
    id: string;
    created_at: string;
    message_count: number;
    preview?: string;
  }>;
  token: string;
}

/**
 * Loader: Fetch authenticated user's chat sessions
 * Auth: required (redirect to login if not)
 */
export const loader: LoaderFunction = async ({ request }): Promise<ProtectedChatLoaderData> => {
  const token = await requireAuth(request);

  try {
    const sessions = await getChatSessions(token);

    // Return loader data with first session selected (if exists)
    return json<ProtectedChatLoaderData>({
      sessionId: sessions.length > 0 ? sessions[0].id : null,
      sessions: sessions.map((s) => ({
        id: s.id,
        created_at: s.created_at.toISOString(),
        message_count: s.message_count,
        preview: s.preview,
      })),
      token,
    });
  } catch (error) {
    if (error instanceof ChatAPIError && error.statusCode === 401) {
      return redirect('/login');
    }

    console.error('[protected-chat] Loader error:', error);

    // Return empty sessions on error (graceful degradation)
    return json<ProtectedChatLoaderData>({
      sessionId: null,
      sessions: [],
      token,
    });
  }
};

interface Session {
  id: string;
  created_at: Date;
  message_count: number;
  preview?: string;
}

/**
 * Protected User Chat Route
 * - Requires authentication
 * - Multi-session chat with history
 * - Session list on sidebar
 * - Persona detection
 * - Session persistence
 */
export default function ProtectedChatPage() {
  const { sessionId: initialSessionId, sessions: initialSessions, token } =
    useLoaderData<ProtectedChatLoaderData>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<Session[]>(
    initialSessions.map((s) => ({
      ...s,
      created_at: new Date(s.created_at),
    }))
  );
  const [activeSessionId, setActiveSessionId] = useState<string | null>(
    initialSessionId
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // Load chat history when active session changes
  useEffect(() => {
    if (!activeSessionId || !token) {
      setMessages([]);
      return;
    }

    loadChatHistory(activeSessionId);
  }, [activeSessionId]);

  const loadChatHistory = async (sessionId: string) => {
    setIsLoadingHistory(true);
    setError(undefined);

    try {
      const history = await getChatHistory(sessionId, token);

      const historyMessages: Message[] = history.messages.flatMap((item) => [
        {
          id: `user-${item.id}`,
          content: item.message,
          role: 'user' as const,
          timestamp: new Date(item.created_at),
        },
        {
          id: `bot-${item.id}`,
          content: item.response,
          role: 'bot' as const,
          timestamp: new Date(item.created_at),
          persona: item.persona,
        },
      ]);

      setMessages(historyMessages);
    } catch (err) {
      let errorMessage = 'Failed to load chat history';

      if (err instanceof ChatAPIError) {
        if (err.statusCode === 401) {
          errorMessage = 'Your session expired. Please login again.';
        } else if (err.statusCode === 404) {
          errorMessage = 'Chat session not found.';
        } else if (err.statusCode === 408) {
          errorMessage = 'Request timeout. Please try again.';
        }
      }

      setError(errorMessage);
      console.error('[protected-chat] Load history error:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!activeSessionId || !token) {
      setError('No active session');
      return;
    }

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
      const response = await sendChatMessage(
        userMessage,
        activeSessionId,
        token
      );

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

      // Update message count in sessions list
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSessionId
            ? { ...s, message_count: s.message_count + 1 }
            : s
        )
      );
    } catch (err) {
      let errorMessage = 'Chat service unavailable';

      if (err instanceof ChatAPIError) {
        if (err.statusCode === 400) {
          errorMessage = 'Invalid message. Please try again.';
        } else if (err.statusCode === 401) {
          errorMessage = 'Your session expired. Please login again.';
        } else if (err.statusCode === 408) {
          errorMessage = 'Request timeout. Please try again.';
        } else if (err.statusCode >= 500) {
          errorMessage = 'Chat service unavailable';
        }
      }

      setError(errorMessage);
      console.error('[protected-chat] Send message error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewSession = () => {
    // Generate new session by passing undefined (server creates new)
    setActiveSessionId(null);
    setMessages([]);
    setError(undefined);

    // Reload sessions
    window.location.reload();
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!token) return;

    try {
      await deleteChatSession(sessionId, token);

      // Remove from sessions list
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));

      // If deleted session was active, select another or clear
      if (activeSessionId === sessionId) {
        const remaining = sessions.filter((s) => s.id !== sessionId);
        setActiveSessionId(remaining.length > 0 ? remaining[0].id : null);
        setMessages([]);
      }
    } catch (err) {
      const errorMessage = err instanceof ChatAPIError
        ? err.message
        : 'Failed to delete session';
      setError(errorMessage);
      console.error('[protected-chat] Delete session error:', err);
    }
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - Sessions List (hidden on mobile, shown on md+) */}
      <div className="hidden md:flex md:w-64">
        <SessionList
          sessions={sessions}
          activeSessionId={activeSessionId || undefined}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          isLoading={isLoading || isLoadingHistory}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-screen">
        {/* Mobile Sessions Dropdown */}
        <div className="md:hidden p-4 bg-gray-50 border-b border-gray-200">
          <button
            onClick={handleNewSession}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 text-sm"
          >
            + Nueva Conversación
          </button>
          {activeSessionId && (
            <select
              value={activeSessionId}
              onChange={(e) => handleSelectSession(e.target.value)}
              className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.preview || `Conversación - ${session.message_count} mensajes`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          {activeSessionId ? (
            <ChatContainer
              messages={messages}
              isLoading={isLoading}
              onSendMessage={handleSendMessage}
              error={error}
              title="Mis Conversaciones"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <div className="text-5xl mb-4">💬</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Inicia una nueva conversación
                </h2>
                <p className="text-gray-500 mb-4">
                  Haz una pregunta o comienza a chatear
                </p>
                <button
                  onClick={handleNewSession}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  Nueva Conversación
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
