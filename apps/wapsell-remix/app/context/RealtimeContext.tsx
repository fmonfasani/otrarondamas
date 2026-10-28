import { createContext, useContext, ReactNode } from 'react';
import { Socket } from 'socket.io-client';

interface RealtimeContextType {
  isConnected: boolean;
  socket: Socket | null;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export function RealtimeProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: RealtimeContextType;
}) {
  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextType {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
}
