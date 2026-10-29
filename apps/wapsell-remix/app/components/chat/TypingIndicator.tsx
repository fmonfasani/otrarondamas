import React from 'react';

export interface TypingIndicatorProps {
  isVisible: boolean;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="flex gap-3 mb-4 animate-fadeIn">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium text-white bg-gray-500">
        B
      </div>

      {/* Typing Indicator */}
      <div className="flex items-center gap-1 px-4 py-2 bg-gray-100 rounded-lg rounded-bl-none">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
};
