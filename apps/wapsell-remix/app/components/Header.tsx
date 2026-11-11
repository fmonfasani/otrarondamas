import { Link } from '@remix-run/react';
import { useEffect, useState } from 'react';

interface HeaderProps {
  area?: 'customer' | 'business' | 'platform';
  userName?: string;
}

export function Header({ area = 'customer', userName }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.user-menu')) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/logout';
    document.body.appendChild(form);
    form.submit();
  };

  return (
    <header className="app-header">
      <Link to="/" className="app-brand">
        <span className="brand-mark">W</span>
        <span>WAPSELL</span>
      </Link>

      <nav className="app-nav" aria-label="Navegación principal">
        {area === 'customer' && (
          <>
            <a href="/tienda">Tienda</a>
            <Link to="/es/auth/login">Ingresar</Link>
          </>
        )}

        {area === 'business' && (
          <>
            <Link to="/es/dashboard">Dashboard</Link>
            <Link to="/es/dashboard/pedidos">Pedidos</Link>
            <Link to="/es/dashboard/productos">Productos</Link>
          </>
        )}

        {area === 'platform' && (
          <>
            <Link to="/es/platform-admin">Admin</Link>
          </>
        )}
      </nav>

      {userName && (
        <div className="user-menu">
          <button
            className="user-menu-trigger"
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-expanded={showUserMenu}
          >
            {userName}
            <span>▼</span>
          </button>
          {showUserMenu && (
            <div className="user-menu-dropdown">
              <button
                className="user-menu-item logout-btn"
                onClick={handleLogout}
              >
                Salir
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
