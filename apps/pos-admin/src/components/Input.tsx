import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-label font-semibold text-brand-dark mb-2">{label}</label>
      )}
      <input
        className={`w-full px-4 py-2 border rounded-md font-body text-base transition-all ${
          error ? 'border-brand-error' : 'border-gray-300 focus:border-brand-yellow'
        } focus:outline-none ${className}`}
        {...props}
      />
      {error && <p className="text-brand-error text-small mt-1">{error}</p>}
    </div>
  );
};
