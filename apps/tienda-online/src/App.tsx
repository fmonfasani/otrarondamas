import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CarritoProvider } from './features/carrito/CarritoContext';
import { AuthProvider } from './features/auth/AuthContext';
import { CatalogoPage } from './features/catalogo/CatalogoPage';
import { CheckoutPage } from './features/checkout/CheckoutPage';
import { SeguimientoPedidoPage } from './features/pedido/SeguimientoPedidoPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegistroPage } from './features/auth/RegistroPage';
import { ActivarInvitacionMayoristaPage } from './features/auth/ActivarInvitacionMayoristaPage';
import { MiCuentaPage } from './features/auth/MiCuentaPage';
import { LegajoMayoristaPage } from './features/auth/LegajoMayoristaPage';

/**
 * Tienda online pública (RF-06, Fases 1-3) + auth de clientes (RF-17).
 * Nunca importar nada de pos-admin acá: son apps separadas a propósito
 * (bundle propio, sin código de gestión interna expuesto a un visitante).
 */
function App() {
  return (
    <AuthProvider>
      <CarritoProvider>
        <Router>
          <Routes>
            <Route path="/" element={<CatalogoPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/pedido/:id" element={<SeguimientoPedidoPage />} />
            {/* RF-17: auth de clientes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/registro" element={<RegistroPage />} />
            <Route
              path="/activar-invitacion-mayorista"
              element={<ActivarInvitacionMayoristaPage />}
            />
            <Route path="/mi-cuenta" element={<MiCuentaPage />} />
            <Route path="/mi-cuenta/legajo" element={<LegajoMayoristaPage />} />
          </Routes>
        </Router>
      </CarritoProvider>
    </AuthProvider>
  );
}

export default App;
