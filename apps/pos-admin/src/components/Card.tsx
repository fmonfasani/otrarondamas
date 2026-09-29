import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface CardSubProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => (
  <div className={`bg-white rounded-lg shadow-md border border-gray-200 ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader: React.FC<CardSubProps> = ({ children, className = '', ...props }) => (
  <div className={`px-6 py-4 border-b border-gray-200 ${className}`} {...props}>
    {children}
  </div>
);

export const CardBody: React.FC<CardSubProps> = ({ children, className = '', ...props }) => (
  <div className={`px-6 py-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<CardSubProps> = ({ children, className = '', ...props }) => (
  <div
    className={`px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg ${className}`}
    {...props}
  >
    {children}
  </div>
);
