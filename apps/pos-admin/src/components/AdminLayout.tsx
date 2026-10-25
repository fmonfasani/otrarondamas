import React, { useState } from 'react';
import { Menu, LogOut, Settings, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: string;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, currentPage }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      path: '/admin/dashboard',
      icon: '📊',
    },
    {
      label: 'Products',
      path: '/admin/products',
      icon: '📦',
    },
    {
      label: 'Orders',
      path: '/admin/orders',
      icon: '📋',
    },
    {
      label: 'Customers',
      path: '/admin/customers',
      icon: '👥',
    },
    {
      label: 'Settings',
      path: '/admin/settings',
      icon: '⚙️',
    },
  ];

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-brand-dark text-white transition-all duration-200 flex flex-col border-r border-gray-700`}
      >
        {/* Logo */}
        <div className="px-4 py-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {sidebarOpen && <span className="text-xl font-bold">Admin</span>}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-700 rounded-md transition"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition ${
                currentPage === item.path
                  ? 'bg-brand-yellow text-brand-dark font-semibold'
                  : 'hover:bg-gray-700 text-gray-100'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Menu */}
        <div className="px-3 py-4 border-t border-gray-700">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-700 transition"
            >
              <div className="w-8 h-8 bg-brand-yellow rounded-full flex items-center justify-center flex-shrink-0 text-brand-dark font-bold text-sm">
                U
              </div>
              {sidebarOpen && (
                <>
                  <span className="truncate flex-1 text-sm text-left">User</span>
                  <ChevronDown
                    className={`w-4 h-4 transition ${userMenuOpen ? 'rotate-180' : ''}`}
                  />
                </>
              )}
            </button>

            {userMenuOpen && sidebarOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-gray-700 rounded-md shadow-lg overflow-hidden">
                <button
                  onClick={() => navigate('/admin/settings')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-600 transition text-gray-100"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-600 transition text-gray-100 border-t border-gray-600"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 shadow-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-h2 font-bold text-brand-dark">Admin Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Welcome back</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
