'use client';

import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export default function Logo({ size = 'md', className = '', showText = true }: LogoProps) {
  const sizeMap = {
    sm: { width: 24, height: 24, textSize: 'text-lg' },
    md: { width: 32, height: 32, textSize: 'text-2xl' },
    lg: { width: 48, height: 48, textSize: 'text-4xl' },
  };

  const { width, height, textSize } = sizeMap[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background circle */}
        <circle cx="16" cy="16" r="15" fill="#FAF9F5" stroke="#D97757" strokeWidth="2" />

        {/* W letter */}
        <path
          d="M 8 10 L 10 22 L 14 14 L 18 22 L 20 10"
          stroke="#D97757"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Orange dot (accent) */}
        <circle cx="22" cy="8" r="2.5" fill="#D97757" />
      </svg>

      {showText && <span className={`font-bold text-[#D97757] ${textSize}`}>Wapsell</span>}
    </div>
  );
}
