'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const paddingClasses = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  none: 'p-0',
};

const variantClasses = {
  default: 'bg-white border border-[#E8E5E0] rounded-lg',
  elevated: 'bg-white rounded-lg shadow-md',
  outlined: 'bg-[#FAF9F5] border-2 border-[#E8E5E0] rounded-lg',
};

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
}) => {
  return (
    <div className={`${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => (
  <div className={`border-b border-[#E8E5E0] pb-3 mb-3 ${className}`}>{children}</div>
);

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => (
  <div className={`border-t border-[#E8E5E0] pt-3 mt-3 ${className}`}>{children}</div>
);

export default Card;
