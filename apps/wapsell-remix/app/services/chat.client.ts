import {
  ChatMessageResponse,
  ChatHistoryResponse,
  SessionDeleteResponse,
} from '@wapsell/shared-types';

const API_URL = process.env.VITE_API_URL || 'http://localhost:8600';
const API_TIMEOUT = parseInt(process.env.VITE_API_TIMEOUT || '30000');

export class ChatAPIError extends Error {
  constructor(
    public statusCode: number,
    public message: string
  ) {
    super(message);
    this.name = 'ChatAPIError';
  }
}

/**
 * Send a message to the chat API
 * Demo: no auth required, generates temporary session_id
 * Protected: requires JWT token, persists session_id
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string,
  token?: string
): Promise<ChatMessageResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}/chat/message`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        session_id: sessionId,
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ChatAPIError(
        response.status,
        errorData.message || `Chat API error: ${response.status}`
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ChatAPIError) {
      throw error;
    }
    if (error instanceof TypeError && error.message.includes('aborted')) {
      throw new ChatAPIError(408, 'Request timeout');
    }
    console.error('[chat] Send message error:', error);
    throw new ChatAPIError(
      500,
      'Connection failed, try again'
    );
  }
}

/**
 * Fetch chat history for a session
 * Protected: requires JWT token
 */
export async function getChatHistory(
  sessionId: string,
  token: string
): Promise<ChatHistoryResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(
      `${API_URL}/chat/history/${sessionId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new ChatAPIError(401, 'Unauthorized');
      }
      if (response.status === 404) {
        throw new ChatAPIError(404, 'Session not found');
      }
      throw new ChatAPIError(
        response.status,
        errorData.message || `Chat API error: ${response.status}`
      );
    }

    const data = await response.json();
    // Convert date strings to Date objects
    return {
      ...data,
      messages: data.messages.map((msg: any) => ({
        ...msg,
        created_at: new Date(msg.created_at),
      })),
    };
  } catch (error) {
    if (error instanceof ChatAPIError) {
      throw error;
    }
    if (error instanceof TypeError && error.message.includes('aborted')) {
      throw new ChatAPIError(408, 'Request timeout');
    }
    console.error('[chat] Get history error:', error);
    throw new ChatAPIError(
      500,
      'Failed to fetch chat history'
    );
  }
}

/**
 * Fetch all sessions for a user
 * Protected: requires JWT token
 */
export async function getChatSessions(token: string): Promise<Array<{
  id: string;
  created_at: Date;
  message_count: number;
  preview?: string;
}>> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${API_URL}/chat/sessions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new ChatAPIError(401, 'Unauthorized');
      }
      throw new ChatAPIError(
        response.status,
        errorData.message || `Chat API error: ${response.status}`
      );
    }

    const data = await response.json();
    return (data.sessions || []).map((session: any) => ({
      id: session.id,
      created_at: new Date(session.created_at),
      message_count: session.message_count || 0,
      preview: session.preview,
    }));
  } catch (error) {
    if (error instanceof ChatAPIError) {
      throw error;
    }
    if (error instanceof TypeError && error.message.includes('aborted')) {
      throw new ChatAPIError(408, 'Request timeout');
    }
    console.error('[chat] Get sessions error:', error);
    throw new ChatAPIError(
      500,
      'Failed to fetch chat sessions'
    );
  }
}

/**
 * Delete a chat session
 * Protected: requires JWT token
 */
export async function deleteChatSession(
  sessionId: string,
  token: string
): Promise<SessionDeleteResponse> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(
      `${API_URL}/chat/session/${sessionId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        signal: controller.signal,
      }
    ).finally(() => clearTimeout(timeoutId));

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        throw new ChatAPIError(401, 'Unauthorized');
      }
      if (response.status === 404) {
        throw new ChatAPIError(404, 'Session not found');
      }
      throw new ChatAPIError(
        response.status,
        errorData.message || `Chat API error: ${response.status}`
      );
    }

    const data = await response.json();
    return {
      ...data,
      deleted_at: new Date(data.deleted_at),
    };
  } catch (error) {
    if (error instanceof ChatAPIError) {
      throw error;
    }
    if (error instanceof TypeError && error.message.includes('aborted')) {
      throw new ChatAPIError(408, 'Request timeout');
    }
    console.error('[chat] Delete session error:', error);
    throw new ChatAPIError(
      500,
      'Failed to delete chat session'
    );
  }
}

/**
 * Generate a unique temporary session ID for demo chat
 * (not persisted in database)
 */
export function generateDemoSessionId(): string {
  return `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}
