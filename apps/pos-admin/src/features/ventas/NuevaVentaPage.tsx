import { useState } from 'react';
import type { CanalVenta, Cliente, MedioPago, Venta } from '@otrarondamas/shared-types';
import { api, ApiError } from '../../lib/api';
import { useCarrito } from './useCarrito';
import { BuscadorProductos } from './BuscadorProductos';
import { BuscadorClientes } from './BuscadorClientes';

const MEDIOS_PAGO: MedioPago[] = ['efectivo', 'transferencia', 'QR'];

/**
 * Flujo: armar carrito -> confirmar venta (POST /ventas, el backend
 * recalcula precios y total desde el catálogo, no confía en lo que se
 * ve acá) -> registrar uno o más pagos sobre la venta ya creada
 * (POST /ventas/:id/pagos). No hay edición de una venta ya confirmada
 * (INV-02) ni anulación todavía.
 */
export function NuevaVentaPage() {
  const carrito = useCarrito();
  const [canal] = useState<CanalVenta>('presencial'); // único canal operable desde este POS por ahora
  // Fase 2 del roadmap de Fidelización: identificar opcionalmente al
  // comprador — null = "al mostrador", sigue funcionando igual que
  // siempre. Ver BuscadorClientes.tsx.
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [creandoVenta, setCreandoVenta] = useState(false);
  const [errorVenta, setErrorVenta] = useState<string | null>(null);
  const [venta, setVenta] = useState<Venta | null>(null);
  // Fase 5 de Inventario (D-09): nombres de producto con lote vencido en
  // esta venta, resueltos contra el carrito ANTES de vaciarlo — la
  // respuesta de POST /ventas solo trae productoId (advertenciasStockVencido).
  // No bloquea nada, es solo para mostrarle la advertencia al vendedor.
  const [productosConLoteVencido, setProductosConLoteVencido] = useState<string[]>([]);
  // Fase 5 del roadmap de Fidelización: nombre de producto + % aplicado,
  // para los ítems de esta venta que recibieron el descuento automático
  // (venta.ventaItems solo trae productoId, no el nombre) — mismo
  // patrón que productosConLoteVencido arriba, resuelto ANTES de vaciar
  // el carrito.
  const [itemsConDescuentoFidelizacion, setItemsConDescuentoFidelizacion] = useState<
    { nombre: string; porcentaje: string }[]
  >([]);

  const [medioPago, setMedioPago] = useState<MedioPago>('efectivo');
  const [montoPago, setMontoPago] = useState('');
  const [registrandoPago, setRegistrandoPago] = useState(false);
  const [errorPago, setErrorPago] = useState<string | null>(null);
  const [pagosRegistrados, setPagosRegistrados] = useState<{ medio: string; monto: string }[]>([]);

  async function confirmarVenta() {
    setErrorVenta(null);
    setCreandoVenta(true);
    try {
      const idsAdvertidos = new Set(carrito.items.map((i) => i.producto.id));
      const nuevaVenta = await api.crearVenta({
        canal,
        clienteId: cliente?.id,
        items: carrito.items.map((i) => ({ productoId: i.producto.id, cantidad: i.cantidad })),
      });
      const nombresConLoteVencido = (nuevaVenta.advertenciasStockVencido ?? [])
        .filter((id) => idsAdvertidos.has(id))
        .map((id) => carrito.items.find((i) => i.producto.id === id)?.producto.nombre ?? id);
      setProductosConLoteVencido(nombresConLoteVencido);
      const conDescuento = nuevaVenta.ventaItems
        .filter((item) => item.descuentoFidelizacionPorcentaje)
        .map((item) => ({
          nombre:
            carrito.items.find((i) => i.producto.id === item.productoId)?.producto.nombre ??
            item.productoId,
          porcentaje: item.descuentoFidelizacionPorcentaje!,
        }));
      setItemsConDescuentoFidelizacion(conDescuento);
      setVenta(nuevaVenta);
      carrito.vaciar();
    } catch (err) {
      setErrorVenta(err instanceof ApiError ? err.message : 'No se pudo confirmar la venta');
    } finally {
      setCreandoVenta(false);
    }
  }

  async function registrarPago() {
    if (!venta) return;
    setErrorPago(null);
    const monto = Number(montoPago);
    if (!monto || monto <= 0) {
      setErrorPago('Ingresá un monto válido');
      return;
    }
    setRegistrandoPago(true);
    try {
      const pago = await api.crearPago(venta.id, { medio: medioPago, monto });
      setPagosRegistrados((prev) => [...prev, { medio: pago.medio, monto: pago.monto }]);
      setMontoPago('');
    } catch (err) {
      setErrorPago(err instanceof ApiError ? err.message : 'No se pudo registrar el pago');
    } finally {
      setRegistrandoPago(false);
    }
  }

  function nuevaVenta() {
    setVenta(null);
    setPagosRegistrados([]);
    setErrorVenta(null);
    setErrorPago(null);
    setProductosConLoteVencido([]);
    setItemsConDescuentoFidelizacion([]);
    setCliente(null);
  }

  const totalPagado = pagosRegistrados.reduce((acc, p) => acc + Number(p.monto), 0);
  const saldoPendiente = venta ? Number(venta.total) - totalPagado : 0;

  return (
    <div>
      <h2>Nueva venta</h2>
      {/* TODO: diseño visual pendiente */}

      {!venta ? (
        <>
          <BuscadorClientes clienteSeleccionado={cliente} onSeleccionar={setCliente} />

          <BuscadorProductos onSeleccionar={carrito.agregar} />

          <h3>Carrito</h3>
          {carrito.items.length === 0 ? (
            <p>Sin productos todavía.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Precio</th>
                  <th>Cantidad</th>
                  <th>Subtotal</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {carrito.items.map((item) => (
                  <tr key={item.producto.id}>
                    <td>{item.producto.nombre}</td>
                    <td>${item.producto.precioMinorista}</td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        value={item.cantidad}
                        onChange={(e) =>
                          carrito.actualizarCantidad(item.producto.id, Number(e.target.value))
                        }
                      />
                    </td>
                    <td>${(Number(item.producto.precioMinorista) * item.cantidad).toFixed(3)}</td>
                    <td>
                      <button type="button" onClick={() => carrito.quitar(item.producto.id)}>
                        Quitar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p>
            <strong>Total estimado: ${carrito.total.toFixed(3)}</strong>{' '}
            <span>(el precio final lo confirma el servidor al cerrar la venta)</span>
          </p>

          {errorVenta && <p role="alert">{errorVenta}</p>}

          <button
            type="button"
            disabled={carrito.items.length === 0 || creandoVenta}
            onClick={confirmarVenta}
          >
            {creandoVenta ? 'Confirmando…' : 'Confirmar venta'}
          </button>
        </>
      ) : (
        <>
          <h3>Venta confirmada</h3>
          <p>
            Venta <code>{venta.id}</code> — Total: <strong>${venta.total}</strong>
          </p>
          {cliente && <p>Cliente: {cliente.nombre}</p>}

          {productosConLoteVencido.length > 0 && (
            // No bloquea nada (D-09) — el lote vencido ya se vendió y
            // quedó auditado en MovimientoStock.loteVencidoAlMomento.
            // Esto es solo un aviso para el vendedor/dueño.
            <p role="alert">
              ⚠ Se vendió stock de un lote ya vencido para: {productosConLoteVencido.join(', ')}
            </p>
          )}

          {itemsConDescuentoFidelizacion.length > 0 && (
            // Fase 5 del roadmap de Fidelización — el descuento ya se
            // aplicó del lado del servidor (ver ventas.service.ts), esto
            // es solo para que el vendedor vea qué ítems lo recibieron y
            // por qué bajó el total.
            <p>
              ✓ Descuento por fidelización aplicado:{' '}
              {itemsConDescuentoFidelizacion
                .map((i) => `${i.nombre} (-${i.porcentaje}%)`)
                .join(', ')}
            </p>
          )}

          <h4>Registrar cobro</h4>
          <div>
            <label htmlFor="medio-pago">Medio</label>
            <select
              id="medio-pago"
              value={medioPago}
              onChange={(e) => setMedioPago(e.target.value as MedioPago)}
            >
              {MEDIOS_PAGO.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <label htmlFor="monto-pago">Monto</label>
            <input
              id="monto-pago"
              type="number"
              step="0.001"
              value={montoPago}
              onChange={(e) => setMontoPago(e.target.value)}
              placeholder={saldoPendiente > 0 ? saldoPendiente.toFixed(3) : '0'}
            />
            <button type="button" disabled={registrandoPago} onClick={registrarPago}>
              {registrandoPago ? 'Registrando…' : 'Registrar pago'}
            </button>
          </div>
          {errorPago && <p role="alert">{errorPago}</p>}

          {pagosRegistrados.length > 0 && (
            <ul>
              {pagosRegistrados.map((p, idx) => (
                <li key={idx}>
                  {p.medio}: ${p.monto}
                </li>
              ))}
            </ul>
          )}

          <p>
            Pagado: ${totalPagado.toFixed(3)} — Saldo pendiente: ${saldoPendiente.toFixed(3)}
          </p>

          <button type="button" onClick={nuevaVenta}>
            Nueva venta
          </button>
        </>
      )}
    </div>
  );
}
