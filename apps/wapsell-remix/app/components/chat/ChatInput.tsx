import React, { useRef, useEffect } from 'react';

export interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isLoading?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Escribe tu mensaje...',
  isLoading = false,
}) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, but allow Shift+Enter for newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const message = inputRef.current?.value.trim();
    if (message && !disabled && !isLoading) {
      onSend(message);
      if (inputRef.current) {
        inputRef.current.value = '';
        // Reset height
        inputRef.current.style.height = 'auto';
      }
    }
  };

  // Auto-expand textarea as user types
  const handleInput = () => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="flex gap-2 items-end p-4 bg-white border-t border-gray-200 rounded-b-lg">
      <textarea
        ref={inputRef}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className={`flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
          disabled || isLoading ? 'bg-gray-50 cursor-not-allowed opacity-60' : 'bg-white'
        }`}
        rows={1}
        style={{ maxHeight: '120px', minHeight: '40px' }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || isLoading || !inputRef.current?.value.trim()}
        className={`px-4 py-2 rounded-lg font-medium text-white transition-colors whitespace-nowrap ${
          disabled || isLoading || !inputRef.current?.value.trim()
            ? 'bg-gray-400 cursor-not-allowed opacity-60'
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
        }`}
      >
        {isLoading ? (
          <span className="flex items-center gap-1">
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </span>
        ) : (
          'Enviar'
        )}
      </button>
    </div>
  );
};
