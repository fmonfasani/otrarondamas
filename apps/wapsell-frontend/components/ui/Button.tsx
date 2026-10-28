'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[#D97757] hover:bg-[#C86543] active:bg-[#B85533] text-white',
  secondary: 'bg-[#F3F1ED] hover:bg-[#E8E5E0] active:bg-[#D4D0C8] text-[#1A1815]',
  danger: 'bg-[#DC2626] hover:bg-[#B91C1C] active:bg-[#991B1B] text-white',
  ghost: 'bg-transparent hover:bg-[#F3F1ED] active:bg-[#E8E5E0] text-[#1A1815]',
  outline:
    'border-2 border-[#D97757] bg-transparent hover:bg-[#FFF5F2] active:bg-[#FFE5DC] text-[#D97757]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm font-medium rounded',
  md: 'px-4 py-2 text-base font-medium rounded',
  lg: 'px-6 py-3 text-lg font-medium rounded',
};

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  className = '',
  children,
  ...props
}) => {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#D97757] focus:ring-offset-2';

  const finalClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button className={finalClasses} disabled={disabled || isLoading} {...props}>
      {isLoading && (
        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
