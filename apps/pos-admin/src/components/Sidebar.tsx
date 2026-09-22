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
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: <BarChart3 className="w-5 h-5" /> },
  { path: '/ventas/nueva', label: 'Nueva venta', icon: <ShoppingCart className="w-5 h-5" /> },
  { path: '/orders', label: 'Pedidos', icon: <Package className="w-5 h-5" /> },
  { path: '/inventory', label: 'Inventario', icon: <Package className="w-5 h-5" /> },
  { path: '/compras', label: 'Compras', icon: <Truck className="w-5 h-5" /> },
  { path: '/precios', label: 'Precios', icon: <Tag className="w-5 h-5" /> },
  { path: '/customers', label: 'Clientes', icon: <Users className="w-5 h-5" /> },
  { path: '/cash', label: 'Caja', icon: <DollarSign className="w-5 h-5" /> },
  { path: '/reports', label: 'Reportes', icon: <FileText className="w-5 h-5" /> },
  { path: '/settings', label: 'Configuración', icon: <Settings className="w-5 h-5" /> },
  { path: '/profile', label: 'Mi Perfil', icon: <User className="w-5 h-5" /> },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-brand-dark text-white flex flex-col h-screen fixed left-0 top-0">
      <div className="px-6 py-8 border-b border-gray-700">
        <h1 className="text-h2 font-bold text-brand-yellow">OtraRonda</h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-md transition-all ${
                isActive
                  ? 'bg-brand-yellow text-brand-dark font-semibold'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-6 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-gray-300 hover:bg-gray-800 rounded-md transition"
        >
          <LogOut className="w-5 h-5" />
          <span>Salir</span>
        </button>
      </div>
    </aside>
  );
};
