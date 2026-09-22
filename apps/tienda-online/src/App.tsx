import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CarritoProvider } from './features/carrito/CarritoContext';
import { CatalogoPage } from './features/catalogo/CatalogoPage';
import { CheckoutPage } from './features/checkout/CheckoutPage';
import { SeguimientoPedidoPage } from './features/pedido/SeguimientoPedidoPage';

/**
 * Tienda online pública (RF-06, Fases 1-3). Sin login, sin permisos —
 * ver docs del roadmap (artifact "Roadmap de Tienda Online"). Nunca
 * importar nada de pos-admin acá: son apps separadas a propósito
 * (bundle propio, sin código de gestión interna expuesto a un
 * visitante anónimo).
 */
function App() {
  return (
    <CarritoProvider>
      <Router>
        <Routes>
          <Route path="/" element={<CatalogoPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/pedido/:id" element={<SeguimientoPedidoPage />} />
        </Routes>
      </Router>
    </CarritoProvider>
  );
}

export default App;
