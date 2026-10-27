'use client';

import React from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-[#F3F1ED] text-[#1A1815] border border-[#E8E5E0]',
  primary: 'bg-[#D97757] text-white',
  success: 'bg-[#10B981] text-white',
  warning: 'bg-[#F59E0B] text-white',
  danger: 'bg-[#EF4444] text-white',
  info: 'bg-[#3B82F6] text-white',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-1 text-xs rounded-full',
  md: 'px-3 py-1.5 text-sm rounded-full',
  lg: 'px-4 py-2 text-base rounded-full',
};

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  icon,
  dismissible = false,
  onDismiss,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`inline-flex items-center gap-2 font-medium transition-opacity duration-200 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {dismissible && (
        <button
          onClick={onDismiss}
          className="ml-1 flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Dismiss badge"
        >
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Badge;
