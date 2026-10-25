import React, { useState, useRef, useEffect, ReactNode } from 'react';

type DropdownAlign = 'left' | 'right';

interface DropdownTriggerProps {
  children: ReactNode;
}

const DropdownTrigger: React.FC<DropdownTriggerProps> = ({ children }) => (
  <div data-testid="dropdown-trigger">{children}</div>
);

interface DropdownContentProps {
  children: ReactNode;
  align?: DropdownAlign;
}

const DropdownContent: React.FC<DropdownContentProps> = ({ children, align = 'left' }) => (
  <div
    data-testid="dropdown-content"
    className={`absolute z-10 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg ${
      align === 'right' ? 'right-0' : 'left-0'
    }`}
  >
    {children}
  </div>
);

interface DropdownItemProps {
  children: ReactNode;
  onClick?: () => void;
  onSelect?: (value: string) => void;
  value?: string;
}

const DropdownItem: React.FC<DropdownItemProps> = ({ children, onClick, onSelect, value }) => (
  <button
    data-testid="dropdown-item"
    onClick={() => {
      if (onClick) {
        onClick();
      }
      if (onSelect && value) {
        onSelect(value);
      }
    }}
    className="w-full text-left px-4 py-2 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
  >
    {children}
  </button>
);

interface DropdownDividerProps {}

const DropdownDivider: React.FC<DropdownDividerProps> = () => (
  <div data-testid="dropdown-divider" className="border-t border-gray-200 my-1" />
);

interface DropdownProps {
  children: ReactNode;
  onSelect?: (value: string) => void;
  align?: DropdownAlign;
}

export const Dropdown: React.FC<DropdownProps> & {
  Trigger: typeof DropdownTrigger;
  Content: typeof DropdownContent;
  Item: typeof DropdownItem;
  Divider: typeof DropdownDivider;
} = ({ children, onSelect, align = 'left' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) {
        return;
      }

      const items = contentRef.current?.querySelectorAll('button[data-testid="dropdown-item"]') || [];
      const focusedItem = document.activeElement;
      let nextIndex = 0;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const focusedItemIndex = Array.from(items).indexOf(focusedItem as Element);
        nextIndex = focusedItemIndex === -1 ? 0 : Math.min(focusedItemIndex + 1, items.length - 1);
        (items[nextIndex] as HTMLElement)?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const focusedItemIndex = Array.from(items).indexOf(focusedItem as Element);
        nextIndex = focusedItemIndex === -1 ? items.length - 1 : Math.max(focusedItemIndex - 1, 0);
        (items[nextIndex] as HTMLElement)?.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedItem instanceof HTMLElement && focusedItem.hasAttribute('data-testid')) {
          focusedItem.click();
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus first item when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const firstItem = contentRef.current?.querySelector('button[data-testid="dropdown-item"]') as HTMLElement;
        firstItem?.focus();
      }, 0);
    }
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <div
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setIsOpen(!isOpen);
          }
        }}
      >
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === DropdownTrigger) {
            return child;
          }
          return null;
        })}
      </div>

      {isOpen && (
        <div ref={contentRef} data-testid="dropdown-menu">
          {React.Children.map(children, (child) => {
            if (React.isValidElement(child) && child.type === DropdownContent) {
              return React.cloneElement(child, { align } as any);
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
};

Dropdown.Trigger = DropdownTrigger;
Dropdown.Content = DropdownContent;
Dropdown.Item = DropdownItem;
Dropdown.Divider = DropdownDivider;
