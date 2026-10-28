'use client';

import React, { useState, useRef, useEffect } from 'react';

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  divider?: boolean;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  onClose?: () => void;
}

const sizeClasses = {
  sm: 'min-w-[150px]',
  md: 'min-w-[200px]',
  lg: 'min-w-[280px]',
};

const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'left',
  size = 'md',
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onClose?.();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled && !item.divider) {
      item.onClick?.();
      setIsOpen(false);
      onClose?.();
    }
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="focus:outline-none">
        {trigger}
      </button>

      {isOpen && (
        <div
          className={`absolute top-full ${align === 'right' ? 'right-0' : 'left-0'} mt-2 ${sizeClasses[size]} bg-white rounded-lg shadow-xl z-50 border border-[#E8E5E0] py-1`}
        >
          {items.map((item) => (
            <React.Fragment key={item.id}>
              {item.divider ? (
                <div className="border-t border-[#E8E5E0] my-1" />
              ) : (
                <button
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={`w-full text-left px-4 py-2.5 flex items-center gap-2 transition-colors duration-150 ${
                    item.disabled
                      ? 'text-[#CCCCCC] cursor-not-allowed'
                      : 'text-[#1A1815] hover:bg-[#F3F1ED] active:bg-[#E8E5E0]'
                  }`}
                >
                  {item.icon && (
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                      {item.icon}
                    </span>
                  )}
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown;
