'use client';

import React from 'react';

type InputType = 'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';
type InputSize = 'sm' | 'md' | 'lg';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  type?: InputType;
  size?: InputSize;
  error?: string;
  helperText?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const sizeClasses: Record<InputSize, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-4 py-3 text-lg',
};

const Input: React.FC<InputProps> = ({
  label,
  type = 'text',
  size = 'md',
  error,
  helperText,
  startIcon,
  endIcon,
  fullWidth = false,
  className = '',
  disabled = false,
  ...props
}) => {
  const baseClasses =
    'w-full border-2 border-[#E8E5E0] rounded focus:outline-none focus:border-[#D97757] focus:ring-2 focus:ring-[#D97757]/20 transition-colors duration-200 disabled:bg-[#F3F1ED] disabled:cursor-not-allowed';

  const errorClasses = error ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-[#DC2626]/20' : '';

  const paddingClasses = `${sizeClasses[size]} ${startIcon ? 'pl-10' : ''} ${endIcon ? 'pr-10' : ''}`;

  return (
    <div className={`flex flex-col ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-sm font-medium text-[#1A1815] mb-1">
          {label}
          {props.required && <span className="text-[#DC2626] ml-1">*</span>}
        </label>
      )}

      <div className="relative">
        {startIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]">
            {startIcon}
          </div>
        )}

        <input
          type={type}
          className={`${baseClasses} ${paddingClasses} ${errorClasses} ${className}`}
          disabled={disabled}
          {...props}
        />

        {endIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999]">
            {endIcon}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-[#DC2626]">{error}</p>
      )}

      {helperText && !error && (
        <p className="mt-1 text-sm text-[#666666]">{helperText}</p>
      )}
    </div>
  );
};

export default Input;
