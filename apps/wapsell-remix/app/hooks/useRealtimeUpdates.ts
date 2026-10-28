import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseRealtimeUpdatesOptions {
  token: string;
  empresaId: string;
  userId: string;
}

export function useRealtimeUpdates({
  token,
  empresaId,
  userId,
}: UseRealtimeUpdatesOptions) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(window.location.origin, {
      auth: {
        token,
        empresaId,
        userId,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('[WebSocket] Connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[WebSocket] Disconnected');
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [token, empresaId, userId]);

  const subscribe = useCallback(
    (event: string, callback: (data: any) => void) => {
      if (socket) {
        socket.on(event, callback);
        return () => socket.off(event, callback);
      }
    },
    [socket]
  );

  const emit = useCallback(
    (event: string, data: any) => {
      if (socket) {
        socket.emit(event, data);
      }
    },
    [socket]
  );

  return {
    socket,
    isConnected,
    subscribe,
    emit,
  };
}
