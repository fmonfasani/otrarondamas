import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CarritoProvider } from './features/carrito/CarritoContext';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import { CatalogoPage } from './features/catalogo/CatalogoPage';
import { CheckoutPage } from './features/checkout/CheckoutPage';
import { SeguimientoPedidoPage } from './features/pedido/SeguimientoPedidoPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegistroPage } from './features/auth/RegistroPage';
import { ActivarInvitacionMayoristaPage } from './features/auth/ActivarInvitacionMayoristaPage';
import { MiCuentaPage } from './features/auth/MiCuentaPage';
import { LegajoMayoristaPage } from './features/auth/LegajoMayoristaPage';

function RequiereAuth({ children }: { children: React.ReactNode }) {
  const { cliente } = useAuth();
  const location = useLocation();
  if (!cliente) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}

/**
 * Tienda online privada (RF-17): requiere login para acceder al catálogo
 * y al checkout. Las rutas de auth (/login, /registro, activar-invitacion)
 * y seguimiento de pedido son públicas.
 */
function App() {
  return (
    <AuthProvider>
      <CarritoProvider>
        <Router>
          <Routes>
            <Route
              path="/"
              element={
                <RequiereAuth>
                  <CatalogoPage />
                </RequiereAuth>
              }
            />
            <Route
              path="/checkout"
              element={
                <RequiereAuth>
                  <CheckoutPage />
                </RequiereAuth>
              }
            />
            {/* Seguimiento público: el cliente accede desde el email de confirmación */}
            <Route path="/pedido/:id" element={<SeguimientoPedidoPage />} />
            {/* RF-17: auth de clientes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegistroPage />} />
            <Route
              path="/activar-invitacion-mayorista"
              element={<ActivarInvitacionMayoristaPage />}
            />
            <Route
              path="/mi-cuenta"
              element={
                <RequiereAuth>
                  <MiCuentaPage />
                </RequiereAuth>
              }
            />
            <Route
              path="/mi-cuenta/legajo"
              element={
                <RequiereAuth>
                  <LegajoMayoristaPage />
                </RequiereAuth>
              }
            />
          </Routes>
        </Router>
      </CarritoProvider>
    </AuthProvider>
  );
}

export default App;
