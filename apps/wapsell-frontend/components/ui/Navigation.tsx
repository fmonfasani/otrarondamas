'use client';

import React from 'react';
import Link from 'next/link';

export interface NavItem {
  href: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  target?: string;
}

interface NavigationProps {
  items: NavItem[];
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'pills' | 'underline';
}

const Navigation: React.FC<NavigationProps> = ({
  items,
  orientation = 'horizontal',
  variant = 'default',
}) => {
  const baseClasses = 'transition-colors duration-200 font-medium';

  const variantClasses = {
    default: {
      container: orientation === 'horizontal' ? 'flex gap-1' : 'flex flex-col gap-1',
      item: 'px-3 py-2 rounded hover:bg-[#F3F1ED] data-[active]:text-[#D97757]',
    },
    pills: {
      container: orientation === 'horizontal' ? 'flex gap-2' : 'flex flex-col gap-2',
      item: 'px-4 py-2 rounded-full hover:bg-[#F3F1ED] data-[active]:bg-[#D97757] data-[active]:text-white',
    },
    underline: {
      container:
        orientation === 'horizontal'
          ? 'flex gap-4 border-b border-[#E8E5E0]'
          : 'flex flex-col gap-0',
      item: 'px-1 py-2 border-b-2 border-transparent data-[active]:border-[#D97757] data-[active]:text-[#D97757] hover:text-[#D97757]',
    },
  };

  const containerClasses = variantClasses[variant].container;
  const itemClasses = variantClasses[variant].item;

  return (
    <nav className={containerClasses}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          target={item.target}
          className={`${baseClasses} ${itemClasses} text-sm text-[#1A1815]`}
          data-active={item.active ? true : undefined}
        >
          <span className="flex items-center gap-2">
            {item.icon && <span className="flex-shrink-0 w-5 h-5">{item.icon}</span>}
            <span>{item.label}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
};

export default Navigation;
