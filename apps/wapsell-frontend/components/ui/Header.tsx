'use client';

import React from 'react';

interface HeaderProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'transparent';
  sticky?: boolean;
  shadow?: boolean;
}

const Header: React.FC<HeaderProps> = ({
  children,
  className = '',
  variant = 'default',
  sticky = false,
  shadow = true,
}) => {
  const variantClasses = {
    default: 'bg-white border-b border-[#E8E5E0]',
    transparent: 'bg-transparent',
  };

  const stickyClasses = sticky ? 'sticky top-0 z-40' : '';
  const shadowClasses = shadow ? 'shadow-sm' : '';

  return (
    <header
      className={`${variantClasses[variant]} ${stickyClasses} ${shadowClasses} transition-colors duration-200 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 py-4">{children}</div>
    </header>
  );
};

interface HeaderContentProps {
  title?: React.ReactNode;
  subtitle?: string;
  actions?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

export const HeaderContent: React.FC<HeaderContentProps> = ({
  title,
  subtitle,
  actions,
  leading,
  trailing,
}) => (
  <div className="flex items-center justify-between gap-4">
    <div className="flex items-center gap-4">
      {leading && <div>{leading}</div>}
      <div className="flex-1">
        {title && <h1 className="text-2xl font-bold text-[#1A1815]">{title}</h1>}
        {subtitle && <p className="text-sm text-[#666666] mt-1">{subtitle}</p>}
      </div>
    </div>
    <div className="flex items-center gap-3">
      {actions && <div>{actions}</div>}
      {trailing && <div>{trailing}</div>}
    </div>
  </div>
);

export default Header;
