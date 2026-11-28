import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation, useRevalidator, useRouteLoaderData } from '@remix-run/react';
import { useEffect, useRef, useState } from 'react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest } from '~/services/api.server';
import type { loader as businessLoader } from '~/routes/_business';
import { useSharedLive } from '~/hooks/useLiveUpdates';
import {
  boardColumns,
  COLUMNS,
  countdown,
  deliveryLabel,
  PREPARATION_OPTIONS,
  REJECT_REASONS,
  sinceLabel,
  type Board,
  type BoardOrder,
} from '~/utils/board';
import { playChime, setSoundWanted, soundReady, soundWanted, unlockSound } from '~/utils/chime';
import { formatMoney } from '~/utils/format';
import { MOVABLE_STATES, ORDER_MOVES, orderAbilities } from '~/utils/orders';
import type { OrderState } from '~/utils/format';

export const meta: MetaFunction = () => [{ title: 'Pedidos en vivo · Wapsell' }];

/** While a new order waits, the board rings again this often. */
const RING_EVERY_MS = 10_000;
/** Without the live stream, the board asks this often. */
const POLL_MS = 15_000;

type ActionData = { ok: boolean; message: string };

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  try {
    return json({ board: await apiRequest<Board>(token, '/pedidos/tablero'), error: null as string | null });
  } catch (error) {
    if (error instanceof ApiError) return json({ board: { pausadoHasta: null, pedidos: [] } as Board, error: error.message });
    throw error;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const id = encodeURIComponent(String(form.get('orderId') ?? ''));
  try {
    if (intent === 'accept') {
      const minutes = Number(form.get('minutos'));
      if (!PREPARATION_OPTIONS.includes(minutes as (typeof PREPARATION_OPTIONS)[number])) {
        return json<ActionData>({ ok: false, message: 'Elegí 10, 20 o 30 minutos.' }, { status: 400 });
      }
      await apiRequest(token, `/pedidos/${id}/estado`, {
        method: 'PATCH',
        body: JSON.stringify({ estado: 'CONFIRMADO', minutosPreparacion: minutes }),
      });
      return json<ActionData>({ ok: true, message: `Aceptado: listo en ${minutes} minutos. Le avisamos al cliente.` });
    }
    if (intent === 'reject') {
      const motivo = String(form.get('motivo') ?? '').trim();
      if (!motivo) return json<ActionData>({ ok: false, message: 'Contale al cliente por qué lo rechazás.' }, { status: 400 });
      await apiRequest(token, `/pedidos/${id}/cancel`, { method: 'POST', body: JSON.stringify({ motivo }) });
      return json<ActionData>({ ok: true, message: 'Rechazado. Le devolvemos el dinero al cliente por Mercado Pago.' });
    }
    if (intent === 'move') {
      const estado = String(form.get('estado') ?? '');
      if (!MOVABLE_STATES.has(estado)) return json<ActionData>({ ok: false, message: 'Ese cambio de estado no existe.' }, { status: 400 });
      await apiRequest(token, `/pedidos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado }) });
      return json<ActionData>({ ok: true, message: 'Listo, actualizado.' });
    }
    if (intent === 'pause') {
      const minutos = form.get('minutos') === '30' ? 30 : 0;
      await apiRequest(token, '/pedidos/pausa', { method: 'PUT', body: JSON.stringify({ minutos }) });
      return json<ActionData>({ ok: true, message: minutos ? 'Pausado: no entran pedidos nuevos por 30 minutos.' : 'Volviste a recibir pedidos.' });
    }
    return json<ActionData>({ ok: false, message: 'Acción desconocida.' }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) return json<ActionData>({ ok: false, message: error.message }, { status: error.status });
    throw error;
  }
}

/** A clock for the countdowns, one tick a second. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/** Reloads the board when an order arrives or moves, and asks every few seconds without the stream. */
function useBoardUpdates() {
  const live = useSharedLive();
  const revalidator = useRevalidator();
  const revalidate = useRef(revalidator.revalidate);
  revalidate.current = revalidator.revalidate;
  useEffect(() => {
    if (!live) return;
    return live.subscribe('pedido', () => revalidate.current());
  }, [live]);
  const connected = live?.live ?? false;
  useEffect(() => {
    if (connected) return;
    const timer = window.setInterval(() => revalidate.current(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [connected]);
  return connected;
}

/** Fase 3 (OR-B4-054) — the team's live board: accept, make and send every paid order. */
export default function LiveOrdersPage() {
  const { board, error } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const layout = useRouteLoaderData<typeof businessLoader>('routes/_business');
  const can = orderAbilities(layout?.user.rol ?? '');
  const navigation = useNavigation();
  const busy = navigation.state !== 'idle';
  const connected = useBoardUpdates();
  const now = useNow();
  const columns = boardColumns(board.pedidos);
  const waiting = columns.nuevos.length;

  // Sound: on unless turned off here; the browser allows it after a click on the page.
  const [wanted, setWanted] = useState(true);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setWanted(soundWanted());
    setReady(soundReady());
  }, []);
  const toggleSound = () => {
    if (wanted && ready) {
      setSoundWanted(false);
      setWanted(false);
      return;
    }
    unlockSound();
    setSoundWanted(true);
    setWanted(true);
    setReady(true);
    playChime();
  };
  // While a new order waits to be accepted, ring again every few seconds.
  useEffect(() => {
    if (waiting === 0 || !wanted) return;
    const timer = window.setInterval(playChime, RING_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [waiting, wanted]);

  const pausedUntil = board.pausadoHasta && Date.parse(board.pausadoHasta) > now ? board.pausadoHasta : null;
  const soundOn = wanted && ready;

  return (
    <div className="ws-page ws-board-page">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">PEDIDOS</p>
          <h1 className="ws-page__title">Pedidos en vivo</h1>
        </div>
        <div className="ws-board__tools">
          <span className={`ws-board__status ${pausedUntil ? 'ws-board__status--paused' : ''}`} role="status">
            <span aria-hidden="true" className="ws-board__dot" />
            {pausedUntil ? `Pausado hasta las ${clock(pausedUntil)}` : 'Recibiendo pedidos'}
            {connected ? '' : ' · reconectando'}
          </span>
          {can.confirm ? (
            <Form method="post">
              <input type="hidden" name="intent" value="pause" />
              <input type="hidden" name="minutos" value={pausedUntil ? '0' : '30'} />
              <button type="submit" className="ws-button ws-button--outline" disabled={busy}>
                {pausedUntil ? 'Volver a recibir' : 'Pausar 30 min'}
              </button>
            </Form>
          ) : null}
          <button type="button" className="ws-button ws-button--outline" aria-pressed={soundOn} onClick={toggleSound}>
            {soundOn ? 'Sonido activado' : 'Activar sonido'}
          </button>
          <Link className="ws-button ws-button--outline" to="/panel/pedidos">
            Todos los pedidos
          </Link>
        </div>
      </div>

      {error ? <p className="ws-alert" role="alert">{error}</p> : null}
      {result ? (
        <p className={result.ok ? 'ws-success-note' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>
          {result.message}
        </p>
      ) : null}

      <div className="ws-board">
        {COLUMNS.map((column) => (
          <section key={column.key} className="ws-board__column" aria-label={column.title}>
            <h2 className="ws-board__title">
              {column.title} · {columns[column.key].length}
            </h2>
            {columns[column.key].length === 0 ? <p className="ws-board__empty">Nada por acá.</p> : null}
            {columns[column.key].map((order) =>
              column.key === 'nuevos' ? (
                <NewOrder key={order.id} order={order} now={now} busy={busy} canAccept={can.confirm} canReject={can.cancel} />
              ) : (
                <OrderInProgress key={order.id} order={order} now={now} busy={busy} canMove={can.fulfill} />
              ),
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

function clock(at: string) {
  return new Date(at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function OrderHead({ order, now, children }: Readonly<{ order: BoardOrder; now: number; children?: React.ReactNode }>) {
  return (
    <div className="ws-board__head">
      <Link to={`/panel/pedidos/${order.id}`} className="ws-board__number">
        {order.numero ? `N° ${order.numero}` : 'Pedido'}
      </Link>
      {children ?? <span className="ws-board__since">{sinceLabel(order.createdAt, now)}</span>}
    </div>
  );
}

function NewOrder({
  order,
  now,
  busy,
  canAccept,
  canReject,
}: Readonly<{ order: BoardOrder; now: number; busy: boolean; canAccept: boolean; canReject: boolean }>) {
  const left = countdown(order.aceptarAntes, now);
  const paid = Number(order.pagado) > 0;
  return (
    <article className="ws-board__card ws-board__card--new">
      <OrderHead order={order} now={now} />
      <span className="ws-board__line">
        {deliveryLabel(order)}
        {order.cliente ? ` · ${order.cliente}` : ''}
        {paid ? <> · <strong className="ws-board__paid">Pagado</strong></> : null}
      </span>
      <ul className="ws-board__items">
        {order.items.map((item) => (
          <li key={item.producto}>
            {item.cantidad} × {item.producto}
          </li>
        ))}
      </ul>
      <span className="ws-board__line">
        Productos {formatMoney(order.total)}
        {Number(order.costoEnvio) > 0 ? <span className="ws-board__muted"> · Envío {formatMoney(order.costoEnvio)} (del repartidor)</span> : null}
      </span>
      {left ? (
        <strong className="ws-board__deadline">{left.late ? 'Se está rechazando…' : `Aceptá en ${left.text}`}</strong>
      ) : null}
      <span className="ws-board__muted">Si no lo aceptás, se cancela y se le devuelve el dinero.</span>
      {canAccept ? (
        <Form method="post" className="ws-board__accept" aria-label="Aceptar el pedido">
          <input type="hidden" name="intent" value="accept" />
          <input type="hidden" name="orderId" value={order.id} />
          <span className="ws-board__accept-label">Aceptar, listo en:</span>
          {PREPARATION_OPTIONS.map((minutes) => (
            <button key={minutes} type="submit" name="minutos" value={minutes} className="ws-button ws-button--primary" disabled={busy} aria-label={`Aceptar, listo en ${minutes} minutos`}>
              {minutes}′
            </button>
          ))}
        </Form>
      ) : null}
      {canReject ? (
        <details className="ws-board__reject">
          <summary>Rechazar…</summary>
          <Form method="post" className="ws-board__reject-form">
            <input type="hidden" name="intent" value="reject" />
            <input type="hidden" name="orderId" value={order.id} />
            <label className="ws-field">
              <span>¿Por qué? Se lo contamos al cliente</span>
              <select name="motivo" defaultValue={REJECT_REASONS[0]} className="ws-field__control">
                {REJECT_REASONS.map((reason) => (
                  <option key={reason}>{reason}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="ws-button ws-button--outline" disabled={busy}>
              Rechazar y devolver el dinero
            </button>
          </Form>
        </details>
      ) : null}
    </article>
  );
}

function OrderInProgress({ order, now, busy, canMove }: Readonly<{ order: BoardOrder; now: number; busy: boolean; canMove: boolean }>) {
  const ready = ['CONFIRMADO', 'EN_PREPARACION'].includes(order.estado) ? countdown(order.listoEstimado, now) : null;
  const moves = canMove ? (ORDER_MOVES[order.estado as OrderState] ?? []).filter((move) => fitsDelivery(order, move.to)) : [];
  const units = order.items.reduce((sum, item) => sum + item.cantidad, 0);
  return (
    <article className="ws-board__card">
      <OrderHead order={order} now={now}>
        <span className="ws-board__tag">{deliveryLabel(order)}</span>
      </OrderHead>
      <span className="ws-board__line">
        {units} {units === 1 ? 'producto' : 'productos'}
        {order.cliente ? ` · ${order.cliente}` : ''}
      </span>
      {order.estado === 'ENTREGA_FALLIDA' ? <strong className="ws-board__deadline">No se pudo entregar</strong> : null}
      {ready ? (
        <strong className={ready.late ? 'ws-board__deadline' : 'ws-board__line'}>
          {ready.late ? `Atrasado ${ready.text}` : `Listo en ${ready.text}`}
        </strong>
      ) : null}
      {moves.length > 0 ? (
        <Form method="post" className="ws-board__moves">
          <input type="hidden" name="intent" value="move" />
          <input type="hidden" name="orderId" value={order.id} />
          {moves.slice(0, 2).map((move) => (
            <button
              key={move.to}
              type="submit"
              name="estado"
              value={move.to}
              className={`ws-button ${move.primary ? 'ws-button--primary' : 'ws-button--outline'}`}
              disabled={busy}
            >
              {move.label}
            </button>
          ))}
        </Form>
      ) : null}
    </article>
  );
}

/** A pickup is never «on the way»; a delivery is not «picked up» from the board. */
function fitsDelivery(order: BoardOrder, to: string) {
  const delivery = order.tipoEntrega === 'ENVIO';
  if (to === 'EN_CAMINO') return delivery;
  if (to === 'ENTREGADO' && order.estado !== 'EN_CAMINO') return !delivery;
  return true;
}
