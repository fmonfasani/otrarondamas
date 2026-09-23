import React from 'react';
import {
  BarChart3,
  ShoppingCart,
  Package,
  Users,
  DollarSign,
  FileText,
  Settings,
  User,
  Truck,
  LogOut,
  Tag,
  Heart,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <BarChart3 className="w-5 h-5 shrink-0" /> },
  {
    path: '/ventas/nueva',
    label: 'Nueva venta',
    icon: <ShoppingCart className="w-5 h-5 shrink-0" />,
  },
  { path: '/orders', label: 'Pedidos', icon: <Package className="w-5 h-5 shrink-0" /> },
  { path: '/inventory', label: 'Inventario', icon: <Package className="w-5 h-5 shrink-0" /> },
  { path: '/compras', label: 'Compras', icon: <Truck className="w-5 h-5 shrink-0" /> },
  { path: '/precios', label: 'Precios', icon: <Tag className="w-5 h-5 shrink-0" /> },
  { path: '/customers', label: 'Clientes', icon: <Users className="w-5 h-5 shrink-0" /> },
  { path: '/fidelizacion', label: 'Fidelización', icon: <Heart className="w-5 h-5 shrink-0" /> },
  { path: '/cash', label: 'Caja', icon: <DollarSign className="w-5 h-5 shrink-0" /> },
  { path: '/reports', label: 'Reportes', icon: <FileText className="w-5 h-5 shrink-0" /> },
  { path: '/settings', label: 'Configuración', icon: <Settings className="w-5 h-5 shrink-0" /> },
  { path: '/profile', label: 'Mi Perfil', icon: <User className="w-5 h-5 shrink-0" /> },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'} bg-brand-dark text-white flex flex-col h-screen fixed left-0 top-0 transition-all duration-200 z-40`}
    >
      {/* Header: logo + toggle */}
      <div className="flex items-center justify-between px-3 py-5 border-b border-gray-700 min-h-[72px]">
        {!collapsed && <h1 className="text-h2 font-bold text-brand-yellow truncate">OtraRonda</h1>}
        <button
          onClick={onToggle}
          className={`p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors ${collapsed ? 'mx-auto' : 'ml-auto'}`}
          aria-label={collapsed ? 'Expandir menú' : 'Contraer menú'}
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-3 rounded-md transition-all ${
                isActive
                  ? 'bg-brand-yellow text-brand-dark font-semibold'
                  : 'text-gray-300 hover:bg-gray-800'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              {item.icon}
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Salir' : undefined}
          className={`flex items-center gap-3 w-full px-3 py-3 text-gray-300 hover:bg-gray-800 rounded-md transition ${collapsed ? 'justify-center' : ''}`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Salir</span>}
        </button>
      </div>
    </aside>
  );
};
