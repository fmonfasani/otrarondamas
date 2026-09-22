import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, ApiError } from '../../lib/api';
import { useCarritoContext } from '../carrito/CarritoContext';

/**
 * Carrito + datos de contacto + confirmar pedido (RF-06, Fase 3). Sin
 * pago todavía — eso es la Fase 5 (bloqueada por D-03, modalidad de
 * Mercado Pago sin definir, ver roadmap). El pedido queda RECIBIDO y el
 * dueño lo gestiona desde la bandeja de pedidos del panel (Fase 4).
 */
export function CheckoutPage() {
  const carrito = useCarritoContext();
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmarPedido() {
    setError(null);
    if (!nombre.trim() || !email.trim()) {
      setError('Completá nombre y email para continuar');
      return;
    }
    setEnviando(true);
    try {
      const pedido = await api.crearPedido({
        nombre,
        email,
        telefono: telefono || undefined,
        items: carrito.items.map((i) => ({
          productoId: i.producto.productoId,
          cantidad: i.cantidad,
        })),
      });
      carrito.vaciar();
      navigate(`/pedido/${pedido.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo confirmar el pedido');
    } finally {
      setEnviando(false);
    }
  }

  if (carrito.items.length === 0) {
    return (
      <div>
        <p>Tu carrito está vacío.</p>
        <Link to="/">Volver al catálogo</Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/">← Seguir comprando</Link>
      <h1>Tu pedido</h1>

      <ul>
        {carrito.items.map((item) => (
          <li key={item.producto.productoId}>
            <span>{item.producto.nombre}</span>
            <input
              type="number"
              min={1}
              value={item.cantidad}
              onChange={(e) =>
                carrito.actualizarCantidad(item.producto.productoId, Number(e.target.value))
              }
            />
            <span>${(Number(item.producto.precio) * item.cantidad).toFixed(2)}</span>
            <button type="button" onClick={() => carrito.quitar(item.producto.productoId)}>
              Quitar
            </button>
          </li>
        ))}
      </ul>

      <p>
        <strong>Total: ${carrito.total.toFixed(2)}</strong>
      </p>

      <h2>Tus datos</h2>
      <div>
        <label htmlFor="nombre">Nombre</label>
        <input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <label htmlFor="telefono">Teléfono (opcional)</label>
        <input id="telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
      </div>

      {error && <p role="alert">{error}</p>}

      <button type="button" disabled={enviando} onClick={confirmarPedido}>
        {enviando ? 'Confirmando…' : 'Confirmar pedido'}
      </button>
      {/* Sin pago dentro de la web todavía — D-03 (Mercado Pago) sin definir. */}
      <p>El pago se coordina al confirmar tu pedido. Te vamos a contactar por email.</p>
    </div>
  );
}
