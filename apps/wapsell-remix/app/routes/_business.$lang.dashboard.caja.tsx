import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import { formatDateTime, formatMoney } from '~/utils/format';

export const meta: MetaFunction = () => [{ title: 'Caja · Wapsell' }];

interface CashStatus {
  caja: { nombre: string; estado: 'ABIERTA' | 'CERRADA'; fondoFijo: string };
  aperturaVigente: { montoInicial: string; fechaApertura: string; usuarioId: string } | null;
}
interface Movement {
  id: string;
  tipo: string;
  monto: string;
  descripcion: string | null;
  createdAt: string;
}
interface StaffUser {
  id: string;
  nombre: string;
}
interface CashCount {
  efectivoEsperado: string;
  efectivoContado: string;
  diferencia: string;
}

/** Manual movement types accepted by POST /caja/movimientos (RegisterMovementDto). */
export const MOVEMENT_TYPES = [
  { value: 'Ingreso', label: 'Ingreso de efectivo' },
  { value: 'Egreso', label: 'Egreso' },
  { value: 'Gasto', label: 'Gasto' },
  { value: 'Retiro', label: 'Retiro' },
];
const OUTFLOWS = new Set(['Egreso', 'Gasto', 'Retiro']);

export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const status = await settle(apiRequest<CashStatus>(token, '/caja/estado'));
  const open = status?.caja.estado === 'ABIERTA';
  const [movements, staff] = await Promise.all([
    open ? settle(apiRequest<Movement[]>(token, '/caja/movimientos')) : Promise.resolve([] as Movement[]),
    open ? settle(apiRequest<StaffUser[]>(token, '/usuarios')) : Promise.resolve([] as StaffUser[]),
  ]);
  return json({ status, movements: movements ?? [], staff: staff ?? [] });
}

type ActionData = { ok: boolean; message: string; count?: CashCount };

const amount = (value: FormDataEntryValue | null) => Number(String(value ?? '').replace(',', '.'));

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = form.get('intent');
  try {
    switch (intent) {
      case 'open': {
        const montoInicial = amount(form.get('montoInicial'));
        if (!(montoInicial > 0)) return json<ActionData>({ ok: false, message: 'Ingresa un monto inicial mayor a cero.' }, { status: 400 });
        await apiRequest(token, '/caja/apertura', { method: 'POST', body: JSON.stringify({ montoInicial }) });
        return json<ActionData>({ ok: true, message: 'Caja abierta.' });
      }
      case 'movement': {
        const monto = amount(form.get('monto'));
        const tipo = String(form.get('tipo') ?? '');
        const descripcion = String(form.get('descripcion') ?? '').trim();
        if (!(monto > 0)) return json<ActionData>({ ok: false, message: 'Ingresa un monto mayor a cero.' }, { status: 400 });
        await apiRequest(token, '/caja/movimientos', {
          method: 'POST',
          body: JSON.stringify({ tipo, monto, ...(descripcion ? { descripcion } : {}) }),
        });
        return json<ActionData>({ ok: true, message: 'Movimiento registrado.' });
      }
      case 'count': {
        const efectivoContado = amount(form.get('efectivoContado'));
        const usuarioEntranteId = String(form.get('usuarioEntranteId') ?? '');
        if (!(efectivoContado >= 0) || !usuarioEntranteId) {
          return json<ActionData>({ ok: false, message: 'Elige quién recibe el turno e ingresa el efectivo contado.' }, { status: 400 });
        }
        const count = await apiRequest<CashCount>(token, '/caja/arqueo', {
          method: 'POST',
          body: JSON.stringify({ usuarioEntranteId, efectivoContado }),
        });
        return json<ActionData>({ ok: true, message: 'Arqueo registrado.', count });
      }
      case 'close':
        await apiRequest(token, '/caja/cierre', { method: 'POST' });
        return json<ActionData>({ ok: true, message: 'Caja cerrada.' });
      default:
        return json<ActionData>({ ok: false, message: 'Acción desconocida.' }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof ApiError) return json<ActionData>({ ok: false, message: error.message }, { status: error.status });
    throw error;
  }
}

/** Cash register: open → manual movements → shift count (arqueo) → close (GET/POST /caja/*). */
export default function CashPage() {
  const { status, movements, staff } = useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const navigation = useNavigation();
  const busy = navigation.state === 'submitting';

  if (!status) {
    return (
      <div className="ws-page">
        <h1 className="ws-page__title">Caja</h1>
        <p className="ws-alert" role="alert">No pudimos cargar la caja. Puede que tu rol no tenga acceso.</p>
      </div>
    );
  }

  const open = status.caja.estado === 'ABIERTA';
  const opening = status.aperturaVigente;
  const outgoing = opening?.usuarioId;
  const candidates = staff.filter((user) => user.id !== outgoing);
  const total = movements.reduce((sum, m) => sum + (OUTFLOWS.has(m.tipo) ? -1 : 1) * Number(m.monto), 0);

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">{status.caja.nombre.toUpperCase()}</p>
          <h1 className="ws-page__title">Caja</h1>
          <p className="ws-page__lead">
            {open && opening
              ? `Abierta desde ${formatDateTime(opening.fechaApertura)} con ${formatMoney(opening.montoInicial)}.`
              : 'La caja está cerrada.'}
          </p>
        </div>
        <span className={`ws-chip ${open ? 'ws-chip--success' : 'ws-chip--muted'}`}>{open ? 'Abierta' : 'Cerrada'}</span>
      </div>

      {result && (
        <p className={result.ok ? 'ws-success-note' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>
          {result.message}
          {result.count &&
            ` Esperado ${formatMoney(result.count.efectivoEsperado)}, contado ${formatMoney(result.count.efectivoContado)}, diferencia ${formatMoney(result.count.diferencia)}.`}
        </p>
      )}

      {!open && (
        <section className="ws-card" aria-labelledby="open-title">
          <h2 id="open-title" className="ws-card__title">Abrir caja</h2>
          <Form method="post" className="ws-form ws-form--inline">
            <input type="hidden" name="intent" value="open" />
            <label className="ws-field">
              <span className="ws-field__label">Monto inicial</span>
              <span className="ws-field__control">
                <input name="montoInicial" inputMode="decimal" required placeholder={String(Number(status.caja.fondoFijo) || '')} />
              </span>
            </label>
            <button className="ws-button ws-button--primary" disabled={busy}>Abrir caja</button>
          </Form>
        </section>
      )}

      {open && (
        <div className="ws-columns">
          <section className="ws-card" aria-labelledby="movements-title">
            <div className="ws-card__head">
              <h2 id="movements-title" className="ws-card__title">Movimientos del turno</h2>
              <span className="ws-chip ws-chip--muted">Neto {formatMoney(total)}</span>
            </div>
            {movements.length === 0 ? (
              <div className="ws-empty"><b>Sin movimientos todavía.</b> Las ventas en efectivo y los movimientos manuales aparecen acá.</div>
            ) : (
              <div className="ws-list">
                {movements.map((movement) => (
                  <div key={movement.id} className="ws-list__row">
                    <span className="ws-list__main">
                      <b>{movement.tipo}</b>
                      <span>{movement.descripcion ?? '—'} · {formatDateTime(movement.createdAt)}</span>
                    </span>
                    <span className="ws-list__aside">
                      {OUTFLOWS.has(movement.tipo) ? '−' : '+'}{formatMoney(movement.monto)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="ws-stack">
            <section className="ws-card" aria-labelledby="movement-title">
              <h2 id="movement-title" className="ws-card__title">Registrar movimiento</h2>
              {/* Re-keyed after each new movement so the fields start empty again. */}
              <Form key={movements.length} method="post" className="ws-form">
                <input type="hidden" name="intent" value="movement" />
                <label className="ws-field">
                  <span className="ws-field__label">Tipo</span>
                  <span className="ws-field__control">
                    <select name="tipo" defaultValue="Gasto">
                      {MOVEMENT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                    </select>
                  </span>
                </label>
                <label className="ws-field">
                  <span className="ws-field__label">Monto</span>
                  <span className="ws-field__control"><input name="monto" inputMode="decimal" required /></span>
                </label>
                <label className="ws-field">
                  <span className="ws-field__label">Descripción (opcional)</span>
                  <span className="ws-field__control"><input name="descripcion" maxLength={200} /></span>
                </label>
                <button className="ws-button ws-button--primary" disabled={busy}>Registrar</button>
              </Form>
            </section>

            <section className="ws-card" aria-labelledby="count-title">
              <h2 id="count-title" className="ws-card__title">Arqueo y cambio de turno</h2>
              {candidates.length === 0 ? (
                <p className="ws-page__lead">
                  El arqueo pasa la caja a otra persona del equipo, y cerrar la caja requiere un arqueo previo. Invita a alguien de tu equipo para poder hacerlo.
                </p>
              ) : (
                <Form method="post" className="ws-form">
                  <input type="hidden" name="intent" value="count" />
                  <label className="ws-field">
                    <span className="ws-field__label">Recibe el turno</span>
                    <span className="ws-field__control">
                      <select name="usuarioEntranteId" required>
                        {candidates.map((user) => <option key={user.id} value={user.id}>{user.nombre}</option>)}
                      </select>
                    </span>
                  </label>
                  <label className="ws-field">
                    <span className="ws-field__label">Efectivo contado</span>
                    <span className="ws-field__control"><input name="efectivoContado" inputMode="decimal" required /></span>
                  </label>
                  <button className="ws-button ws-button--outline" disabled={busy}>Registrar arqueo</button>
                </Form>
              )}
              <Form method="post">
                <input type="hidden" name="intent" value="close" />
                <button className="ws-button ws-button--outline" disabled={busy}>Cerrar caja</button>
              </Form>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
