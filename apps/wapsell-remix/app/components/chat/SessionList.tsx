import React from 'react';

export interface Session {
  id: string;
  created_at: Date;
  message_count: number;
  preview?: string;
}

export interface SessionListProps {
  sessions: Session[];
  activeSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isLoading?: boolean;
}

export const SessionList: React.FC<SessionListProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isLoading = false,
}) => {
  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm('¿Estás seguro de que deseas eliminar esta sesión?')) {
      onDeleteSession(sessionId);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 border-r border-gray-200 w-full md:w-64">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={onNewSession}
          disabled={isLoading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          + Nueva Conversación
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-gray-500 text-sm">
              No hay conversaciones anteriores
            </p>
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                  activeSessionId === session.id
                    ? 'bg-blue-100 border border-blue-300'
                    : 'hover:bg-white border border-transparent'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {session.preview || `Conversación ${session.message_count} mensajes`}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {session.created_at.toLocaleDateString('es-ES', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
                    title="Eliminar sesión"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
