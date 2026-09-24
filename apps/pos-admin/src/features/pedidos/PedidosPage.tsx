import { useCallback, useEffect, useState } from 'react';
import { ShoppingBag, Check, X } from 'lucide-react';
import type { PedidoListado, TransicionPedido } from '@otrarondamas/shared-types';
import { Card, CardHeader, CardBody, Button } from '../../components';
import { api, ApiError } from '../../lib/api';

const ESTADO_LABEL: Record<string, string> = {
  RECIBIDO: 'Recibido',
  CONFIRMADO: 'Confirmado',
  CANCELADO: 'Cancelado',
  EN_PREPARACION: 'En preparación',
  LISTO: 'Listo',
  ASIGNADO: 'Asignado',
  EN_CAMINO: 'En camino',
  ENTREGADO: 'Entregado',
  PARCIALMENTE_ENTREGADO: 'Entregado parcialmente',
  ENTREGA_FALLIDA: 'Entrega fallida',
};

/**
 * Fase 4 de Tienda Online (RF-06) — contrapartida del vendedor:
 * bandeja de pedidos entrados por la tienda pública (canalOrigen='web')
 * o, en el futuro, WhatsApp (RF-07). Sin esta pantalla, un pedido
 * online queda RECIBIDO sin que nadie del panel lo vea.
 *
 * Solo dos acciones implementadas (ver ActualizarEstadoPedidoDto del
 * backend): confirmar (descuenta stock) o cancelar un pedido RECIBIDO.
 * El resto del ciclo de vida (preparación, entrega) es RF-13.
 *
 * El frontend no oculta las acciones según permiso (mismo criterio que
 * CajaPage/InventarioPage/ComprasPage) — el backend rechaza con 403 si
 * corresponde y ese error se muestra tal cual.
 */
export function PedidosPage() {
  const [pedidos, setPedidos] = useState<PedidoListado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actualizandoId, setActualizandoId] = useState<string | null>(null);
  const [errorPorPedido, setErrorPorPedido] = useState<Record<string, string>>({});

  const cargarPedidos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await api.listarPedidos();
      setPedidos(datos);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los pedidos');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // setCargando/setError dentro de cargarPedidos() no pueden correr
    // síncrono en el cuerpo del efecto (react-hooks/set-state-in-effect)
    // — mismo patrón ya usado en InventarioPage/ComprasPage.
    Promise.resolve().then(() => cargarPedidos());
  }, [cargarPedidos]);

  async function cambiarEstado(pedidoId: string, estado: TransicionPedido) {
    setActualizandoId(pedidoId);
    setErrorPorPedido((prev) => ({ ...prev, [pedidoId]: '' }));
    try {
      const actualizado = await api.actualizarEstadoPedido(pedidoId, { estado });
      setPedidos((prev) => prev.map((p) => (p.id === pedidoId ? actualizado : p)));
    } catch (err) {
      const mensaje = err instanceof ApiError ? err.message : 'No se pudo actualizar el pedido';
      setErrorPorPedido((prev) => ({ ...prev, [pedidoId]: mensaje }));
    } finally {
      setActualizandoId(null);
    }
  }

  const pedidosRecibidos = pedidos.filter((p) => p.estado === 'RECIBIDO');
  const pedidosGestionados = pedidos.filter((p) => p.estado !== 'RECIBIDO');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <ShoppingBag className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Pedidos</h2>
      </div>

      {error && <p role="alert">{error}</p>}
      {cargando && <p>Cargando…</p>}

      {!cargando && (
        <Card>
          <CardHeader>Pendientes de confirmar ({pedidosRecibidos.length})</CardHeader>
          <CardBody>
            {pedidosRecibidos.length === 0 ? (
              <p>No hay pedidos esperando confirmación.</p>
            ) : (
              <ul className="space-y-4">
                {pedidosRecibidos.map((pedido) => (
                  <li key={pedido.id} className="border-b pb-4 last:border-b-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium">
                          {pedido.cliente.nombre} — {pedido.cliente.email}
                        </p>
                        {pedido.cliente.telefono && <p>Tel: {pedido.cliente.telefono}</p>}
                        <p>Canal: {pedido.canalOrigen}</p>
                        <ul>
                          {pedido.pedidoItems.map((item) => (
                            <li key={item.id}>
                              {item.producto.nombre} — {item.cantidad} × ${item.precioUnitario}
                            </li>
                          ))}
                        </ul>
                        <p>
                          <strong>Total: ${pedido.total}</strong>
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          disabled={actualizandoId === pedido.id}
                          onClick={() => cambiarEstado(pedido.id, 'CONFIRMADO')}
                        >
                          <Check className="h-4 w-4" /> Confirmar
                        </Button>
                        <Button
                          variant="danger"
                          disabled={actualizandoId === pedido.id}
                          onClick={() => cambiarEstado(pedido.id, 'CANCELADO')}
                        >
                          <X className="h-4 w-4" /> Cancelar
                        </Button>
                      </div>
                    </div>
                    {errorPorPedido[pedido.id] && <p role="alert">{errorPorPedido[pedido.id]}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      )}

      {!cargando && pedidosGestionados.length > 0 && (
        <Card>
          <CardHeader>Ya gestionados</CardHeader>
          <CardBody>
            <ul className="space-y-2">
              {pedidosGestionados.map((pedido) => (
                <li key={pedido.id}>
                  {pedido.cliente.nombre} — {ESTADO_LABEL[pedido.estado] ?? pedido.estado} — $
                  {pedido.total}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
