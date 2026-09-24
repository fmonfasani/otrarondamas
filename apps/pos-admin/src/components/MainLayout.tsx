import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface MainLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_KEY = 'orm_sidebar_collapsed';

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        /* private window */
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div
        className={`flex-1 flex flex-col ${collapsed ? 'ml-16' : 'ml-64'} transition-all duration-200`}
      >
        <Header />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
};
