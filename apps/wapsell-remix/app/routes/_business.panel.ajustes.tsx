import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData, useNavigation } from '@remix-run/react';
import { getCurrentUser, requireAuth } from '~/services/auth.server';
import { ApiError, apiRequest, settle } from '~/services/api.server';
import {
  CONTACT_FIELDS,
  businessFrom,
  paymentDiscountsFrom,
  paymentDiscountsMessage,
  storeUrl,
  type Business,
} from '~/utils/settings';
import { RETURN_WINDOW_DAYS, canManageReturns, windowDaysFrom } from '~/utils/returns';
import QRCode from 'qrcode';
import {
  LABEL_COLORS,
  WEEK_DAYS,
  autoRepliesFrom,
  quickRepliesFrom,
  type AutoReplies,
  type CustomerLabel,
  type QuickReply,
} from '~/utils/messaging';
import { CopyLink } from '~/components/panel/CopyLink';
import { LocationEditor } from '~/components/panel/LocationEditor';
import { DeliveryEditor } from '~/components/panel/DeliveryEditor';
import { deliveryFrom, deliveryMessage, type DeliveryPanel } from '~/utils/envios';
import { parsePoint, type GeorefCandidate, type LocationPanel } from '~/utils/map';
import { mapTiles } from '~/services/map.server';
import maplibreStyles from '../styles/maplibre-gl.css?url';
import mapStyles from '../styles/map.css?url';

export const links = () => [
  { rel: 'stylesheet', href: maplibreStyles },
  { rel: 'stylesheet', href: mapStyles },
];

/** E6a — how each label colour is called in Ajustes. */
const COLOR_NAMES: Record<(typeof LABEL_COLORS)[number], string> = {
  gris: 'Gris',
  rojo: 'Rojo',
  naranja: 'Naranja',
  amarillo: 'Amarillo',
  verde: 'Verde',
  celeste: 'Celeste',
  azul: 'Azul',
  violeta: 'Violeta',
};

export const meta: MetaFunction = () => [{ title: 'Ajustes · Wapsell' }];

/**
 * Ajustes — the Business's name and contact details (the Owner edits them; the store shows
 * them), its store address, the return window (Owner/Admin) and where to connect payments.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const token = await requireAuth(request);
  const [business, returns, user, quick, labels, auto, location, delivery] = await Promise.all([
    apiRequest<Business>(token, '/negocio'),
    settle(apiRequest<{ plazoDias: number }>(token, '/devoluciones/ajustes')),
    getCurrentUser(token),
    settle(apiRequest<{ items: QuickReply[]; puedeEditar: boolean }>(token, '/messaging/conversations/quick-replies')),
    settle(apiRequest<CustomerLabel[]>(token, '/messaging/etiquetas')),
    settle(apiRequest<AutoReplies & { puedeEditar: boolean }>(token, '/messaging/automaticos')),
    // Marketplace step 4: the store on Wapsell's map.
    settle(apiRequest<LocationPanel>(token, '/negocio/ubicacion')),
    // OR-B4-054: delivery and pickup.
    settle(apiRequest<DeliveryPanel>(token, '/negocio/envios')),
  ]);
  // E6b: the link that opens the store's chat, and its QR (made here, nothing goes out).
  const chatLink = `${new URL(request.url).origin}/tienda/${business.slug}/chat`;
  const chatQr = await QRCode.toDataURL(chatLink, { margin: 1, width: 480 }).catch(() => null);
  const role = String(user?.rol ?? '');
  return json({
    business,
    plazoDias: returns?.plazoDias ?? RETURN_WINDOW_DAYS,
    manageReturns: canManageReturns(role),
    owner: role === 'OWNER',
    quickReplies: quick?.items ?? [],
    editQuickReplies: Boolean(quick?.puedeEditar),
    // E6a: Owner and Admin make the customer labels.
    labels: labels ?? [],
    editLabels: ['OWNER', 'ADMIN'].includes(role),
    auto,
    chatLink,
    chatQr,
    location,
    delivery,
    mapTiles: mapTiles(),
    origin: new URL(request.url).origin,
  });
}

export async function action({ request }: ActionFunctionArgs) {
  const token = await requireAuth(request);
  const form = await request.formData();
  const intent = String(form.get('intent'));
  try {
    if (intent === 'business') {
      const parsed = businessFrom(form);
      if (!parsed.ok) return json({ intent, ok: false, message: parsed.message }, { status: 400 });
      await apiRequest(token, '/negocio', { method: 'PATCH', body: JSON.stringify(parsed.data) });
      return json({ intent, ok: true, message: 'Listo, guardamos los datos del negocio.' });
    }
    // OR-B4-051 rule 1: the counter's discount for paying in cash / by transfer.
    if (intent === 'payment-discounts') {
      const parsed = paymentDiscountsFrom(form);
      if (!parsed.ok) return json({ intent, ok: false, message: parsed.message }, { status: 400 });
      await apiRequest(token, '/negocio/precios', { method: 'PATCH', body: JSON.stringify(parsed.body) });
      return json({ intent, ok: true, message: paymentDiscountsMessage(parsed.body) });
    }
    // Marketplace step 4: find the address (Georef), confirm the pin, take it off the map.
    if (intent === 'location-find') {
      const direccion = String(form.get('direccion') ?? '').trim();
      if (direccion.length < 3) return json({ intent, ok: false, message: 'Escribí la dirección del negocio.' }, { status: 400 });
      const found = await apiRequest<{ candidatos: GeorefCandidate[] }>(token, '/negocio/ubicacion/buscar', {
        method: 'POST',
        body: JSON.stringify({ direccion, ciudad: String(form.get('ciudad') ?? '').trim() || undefined, provincia: String(form.get('provincia') ?? '').trim() || undefined }),
      });
      return json({ intent, ok: true, candidatos: found.candidatos, message: '' });
    }
    if (intent === 'location-save') {
      const point = parsePoint(form.get('lat'), form.get('lng'));
      if (!point) return json({ intent, ok: false, message: 'Ese punto no está en Argentina. Mové el pin a tu local.' }, { status: 400 });
      const zona = form.get('zona') === 'true';
      await apiRequest(token, '/negocio/ubicacion', {
        method: 'PUT',
        body: JSON.stringify({ ...point, zona, direccion: String(form.get('direccion') ?? '').slice(0, 200) }),
      });
      return json({ intent, ok: true, message: zona ? 'Listo: en el mapa de Wapsell se ve la zona de tu negocio, no tu dirección.' : 'Listo: tu negocio ya está en el mapa de Wapsell.' });
    }
    if (intent === 'location-remove') {
      await apiRequest(token, '/negocio/ubicacion', { method: 'DELETE' });
      return json({ intent, ok: true, message: 'Quitamos tu negocio del mapa de Wapsell.' });
    }
    // OR-B4-054: delivery and pickup.
    if (intent === 'delivery-save') {
      const parsed = deliveryFrom(form);
      if (!parsed.ok) return json({ intent, ok: false, message: parsed.message }, { status: 400 });
      await apiRequest(token, '/negocio/envios', { method: 'PUT', body: JSON.stringify(parsed.body) });
      return json({ intent, ok: true, message: deliveryMessage(parsed.body) });
    }
    if (intent === 'returns') {
      const days = windowDaysFrom(form.get('plazoDias'));
      if (days === null) return json({ intent, ok: false, message: 'El plazo tiene que ser de 1 a 365 días.' }, { status: 400 });
      await apiRequest(token, '/devoluciones/ajustes', { method: 'PUT', body: JSON.stringify({ plazoDias: days }) });
      return json({ intent, ok: true, message: `Listo: se aceptan devoluciones hasta ${days} días después de la venta.` });
    }
    if (intent === 'auto-replies') {
      const parsed = autoRepliesFrom(form);
      if (!parsed.ok) return json({ intent, ok: false, message: parsed.message }, { status: 400 });
      await apiRequest(token, '/messaging/automaticos', { method: 'PUT', body: JSON.stringify(parsed.value) });
      return json({ intent, ok: true, message: 'Listo: guardamos los mensajes automáticos y el horario.' });
    }
    if (intent === 'label-create') {
      const nombre = String(form.get('nombre') ?? '').trim();
      const color = String(form.get('color') ?? 'gris');
      if (!nombre) return json({ intent, ok: false, message: 'Escribí el nombre de la etiqueta.' }, { status: 400 });
      await apiRequest(token, '/messaging/etiquetas', { method: 'POST', body: JSON.stringify({ nombre, color }) });
      return json({ intent, ok: true, message: `Listo: etiqueta «${nombre}» creada.` });
    }
    if (intent === 'label-delete') {
      const id = encodeURIComponent(String(form.get('labelId') ?? ''));
      await apiRequest(token, `/messaging/etiquetas/${id}`, { method: 'DELETE' });
      return json({ intent: 'label-create', ok: true, message: 'Etiqueta borrada: ya no la tiene ningún cliente.' });
    }
    if (intent === 'quick-replies') {
      const parsed = quickRepliesFrom(form);
      if (!parsed.ok) return json({ intent, ok: false, message: parsed.message }, { status: 400 });
      await apiRequest(token, '/messaging/conversations/quick-replies', { method: 'PUT', body: JSON.stringify({ items: parsed.items }) });
      return json({ intent, ok: true, message: `Listo: ${parsed.items.length} respuestas rápidas guardadas.` });
    }
    return json({ intent, ok: false, message: 'Acción desconocida.' }, { status: 400 });
  } catch (error) {
    if (error instanceof ApiError) return json({ intent, ok: false, message: error.message }, { status: error.status });
    throw error;
  }
}

export default function Ajustes() {
  const { business, plazoDias, manageReturns, owner, origin, quickReplies, editQuickReplies, labels, editLabels, auto, chatLink, chatQr, location, delivery, mapTiles } =
    useLoaderData<typeof loader>();
  const result = useActionData<typeof action>();
  const busy = useNavigation().state !== 'idle';
  const notice = (intent: string) =>
    result?.intent === intent ? (
      <p className={result.ok ? 'ws-notice' : 'ws-alert'} role={result.ok ? 'status' : 'alert'}>{result.message}</p>
    ) : null;
  const url = storeUrl(business.slug, origin);

  return (
    <div className="ws-page">
      <div className="ws-page__head">
        <div className="ws-page__titles">
          <p className="ws-page__eyebrow">NEGOCIO</p>
          <h1 className="ws-page__title">Ajustes</h1>
          <p className="ws-page__lead">Los datos de {business.nombre} y cómo trabaja.</p>
        </div>
      </div>

      <section className="ws-card" aria-labelledby="business-title">
        <h2 id="business-title" className="ws-card__title">Datos del negocio</h2>
        <p className="ws-meta">
          Estos datos se ven en tu tienda. {business.puedeEditar ? '' : 'Solo el Owner los cambia.'}
        </p>
        <p className="ws-meta">
          Tu tienda: <a className="ws-link ws-link--inline" href={url} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\//, '')}</a>
        </p>
        <Form method="post" className="ws-pos__checkout">
          <input type="hidden" name="intent" value="business" />
          <fieldset disabled={!business.puedeEditar} className="ws-settings-fields">
            <label className="ws-field">
              <span className="ws-field__label">Nombre del negocio</span>
              <span className="ws-field__control"><input name="nombre" defaultValue={business.nombre} required minLength={2} maxLength={120} /></span>
            </label>
            {CONTACT_FIELDS.map((f) => (
              <label key={f.name} className="ws-field">
                <span className="ws-field__label">{f.label}</span>
                <span className="ws-field__control">
                  <input name={f.name} defaultValue={business[f.name]} maxLength={f.max} placeholder={f.placeholder} />
                </span>
              </label>
            ))}
            <label className="ws-check">
              <input type="checkbox" name="ocultarSinStock" value="true" defaultChecked={business.ocultarSinStock} />
              <span>
                <b>Ocultar en la tienda los productos sin stock</b>
                <small>Si no lo marcás, se ven con «Sin stock» y no se pueden pedir.</small>
              </span>
            </label>
            <label className="ws-check">
              <input type="checkbox" name="enExplorador" value="true" defaultChecked={business.enExplorador} />
              <span>
                <b>Aparecer en el explorador de Wapsell</b>
                <small>Tu tienda se muestra a todos los clientes de Wapsell, con tus ofertas. Nunca se muestra cuánto vendés.</small>
              </span>
            </label>
          </fieldset>
          {notice('business')}
          {business.puedeEditar && (
            <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={busy}>Guardar datos</button>
          )}
        </Form>
      </section>

      <section className="ws-card" id="mapa" aria-labelledby="map-title">
        <h2 id="map-title" className="ws-card__title">Tu negocio en el mapa</h2>
        <p className="ws-meta">Los clientes de Wapsell encuentran los negocios cerca suyo en el mapa.</p>
        {location ? <LocationEditor data={location} tiles={mapTiles} /> : <p className="ws-alert">No pudimos cargar la ubicación. Probá en un ratito.</p>}
      </section>

      <section className="ws-card" id="envios" aria-labelledby="delivery-title">
        <h2 id="delivery-title" className="ws-card__title">Envíos y retiro</h2>
        <p className="ws-meta">Cómo reciben tus clientes los pedidos de la tienda.</p>
        {delivery ? <DeliveryEditor data={delivery} /> : <p className="ws-alert">No pudimos cargar los envíos. Probá en un ratito.</p>}
      </section>

      <section className="ws-card" aria-labelledby="payment-title">
        <h2 id="payment-title" className="ws-card__title">Descuento por medio de pago</h2>
        <p className="ws-meta">
          Se aplica en el mostrador cuando toda la venta se paga con ese medio. No se suma a otras rebajas: el cliente paga el
          precio más bajo.{business.puedeEditarPrecios ? '' : ' Lo cambian el Owner o un Administrador.'}
        </p>
        <Form method="post" className="ws-pos__checkout">
          <input type="hidden" name="intent" value="payment-discounts" />
          <fieldset disabled={!business.puedeEditarPrecios} className="ws-settings-fields ws-settings-fields--pair">
            <label className="ws-field">
              <span className="ws-field__label">Pagando en efectivo</span>
              <span className="ws-field__control">
                <input name="descuentoEfectivo" inputMode="decimal" defaultValue={business.descuentoEfectivo || ''} placeholder="0" />
                <span aria-hidden="true">%</span>
              </span>
            </label>
            <label className="ws-field">
              <span className="ws-field__label">Pagando por transferencia</span>
              <span className="ws-field__control">
                <input name="descuentoTransferencia" inputMode="decimal" defaultValue={business.descuentoTransferencia || ''} placeholder="0" />
                <span aria-hidden="true">%</span>
              </span>
            </label>
          </fieldset>
          {notice('payment-discounts')}
          {business.puedeEditarPrecios && (
            <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={busy}>Guardar descuentos</button>
          )}
        </Form>
      </section>

      {editQuickReplies && (
        <section className="ws-card" aria-labelledby="quick-title">
          <h2 id="quick-title" className="ws-card__title">Respuestas rápidas</h2>
          <p className="ws-meta">
            Mensajes que el equipo manda con un clic desde Mensajes. Escribí <code>{'{cliente}'}</code> para poner el nombre del cliente.
          </p>
          <Form method="post" className="ws-pos__checkout">
            <input type="hidden" name="intent" value="quick-replies" />
            <ol className="ws-quick-list">
              {[...quickReplies, { titulo: '', texto: '' }, { titulo: '', texto: '' }].map((r, n) => (
                <li key={`${n}-${r.titulo}`}>
                  <label className="ws-field">
                    <span className="ws-field__label">Título</span>
                    <span className="ws-field__control">
                      <input name={`titulo-${n}`} defaultValue={r.titulo} maxLength={60} placeholder="Ej.: Saludo" />
                    </span>
                  </label>
                  <label className="ws-field">
                    <span className="ws-field__label">Texto</span>
                    <span className="ws-field__control">
                      <textarea name={`texto-${n}`} defaultValue={r.texto} maxLength={1000} rows={2} placeholder="Ej.: Hola {cliente}, ¿en qué te ayudo?" />
                    </span>
                  </label>
                </li>
              ))}
            </ol>
            <small className="ws-meta">Para borrar una, dejá vacíos su título y su texto. Se guardan hasta 50.</small>
            {notice('quick-replies')}
            <button className="ws-button ws-button--outline ws-button--auto" type="submit" disabled={busy}>
              Guardar respuestas
            </button>
          </Form>
        </section>
      )}

      {auto?.puedeEditar && (
        <section className="ws-card" id="automaticos" aria-labelledby="auto-title">
          <h2 id="auto-title" className="ws-card__title">Mensajes automáticos</h2>
          <p className="ws-meta">
            Respuestas que la tienda manda sola en el chat, marcadas «Mensaje automático». La bienvenida sale con el primer mensaje de un
            cliente (o si vuelve después de 14 días); la de ausencia, fuera del horario, una vez cada 12 horas por cliente.
          </p>
          <Form method="post" className="ws-auto">
            <input type="hidden" name="intent" value="auto-replies" />
            {(
              [
                ['bienvenida', 'Mensaje de bienvenida', auto.bienvenida],
                ['ausencia', 'Mensaje de ausencia', auto.ausencia],
              ] as const
            ).map(([key, title, msg]) => (
              <fieldset key={key} className="ws-auto__message">
                <legend>{title}</legend>
                <label className="ws-auto__toggle">
                  <input type="checkbox" name={`${key}-activo`} defaultChecked={msg.activo} />
                  Activado
                </label>
                <label className="ws-field">
                  <span className="ws-field__label">Texto</span>
                  <span className="ws-field__control">
                    <textarea name={`${key}-texto`} defaultValue={msg.texto} maxLength={1000} rows={3} required />
                  </span>
                </label>
              </fieldset>
            ))}
            <fieldset className="ws-auto__hours">
              <legend>Horario de atención</legend>
              <small className="ws-meta">Hora de Argentina. Hasta 2 turnos por día; dejá vacío el segundo si cortás de corrido, y el día entero si cerrás.</small>
              <table className="ws-hours">
                <thead>
                  <tr>
                    <th scope="col">Día</th>
                    <th scope="col">Turno 1</th>
                    <th scope="col">Turno 2</th>
                  </tr>
                </thead>
                <tbody>
                  {WEEK_DAYS.map(({ key, nombre }) => (
                    <tr key={key}>
                      <th scope="row">{nombre}</th>
                      {[1, 2].map((turn) => {
                        const value = auto.horario[key]?.[turn - 1];
                        return (
                          <td key={turn}>
                            <span className="ws-hours__turn">
                              <input type="time" name={`d${key}-${turn}-desde`} defaultValue={value?.[0] ?? ''} aria-label={`${nombre}, turno ${turn}, desde`} />
                              <span aria-hidden="true">a</span>
                              <input type="time" name={`d${key}-${turn}-hasta`} defaultValue={value?.[1] ?? ''} aria-label={`${nombre}, turno ${turn}, hasta`} />
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </fieldset>
            {notice('auto-replies')}
            <button className="ws-button ws-button--outline ws-button--auto" type="submit" disabled={busy}>
              Guardar mensajes automáticos
            </button>
          </Form>
        </section>
      )}

      <section className="ws-card" id="link-chat" aria-labelledby="chat-link-title">
        <h2 id="chat-link-title" className="ws-card__title">Link y QR del chat</h2>
        <p className="ws-meta">
          Compartilo en tus redes o imprimí el QR para el mostrador: abre el chat con {business.nombre} (el cliente entra con su cuenta).
        </p>
        <div className="ws-chat-link">
          {chatQr ? <img src={chatQr} alt={`QR del chat de ${business.nombre}`} width={160} height={160} /> : null}
          <div className="ws-chat-link__body">
            <code>{chatLink}</code>
            <CopyLink value={chatLink} />
            {chatQr ? (
              <a className="ws-button ws-button--outline ws-button--auto" href={chatQr} download={`qr-chat-${business.slug}.png`}>
                Descargar QR
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {editLabels && (
        <section className="ws-card" id="etiquetas" aria-labelledby="labels-title">
          <h2 id="labels-title" className="ws-card__title">Etiquetas de clientes</h2>
          <p className="ws-meta">
            Para ordenar a tus clientes en Mensajes (por ejemplo «Mayorista» o «VIP»). Las pone cualquiera del equipo; el cliente
            nunca las ve.
          </p>
          {labels.length > 0 ? (
            <ul className="ws-labels ws-labels--settings">
              {labels.map((label) => (
                <li key={label.id}>
                  <span className={`ws-label ws-label--${label.color} is-on`}>{label.nombre}</span>
                  <Form method="post">
                    <input type="hidden" name="intent" value="label-delete" />
                    <input type="hidden" name="labelId" value={label.id} />
                    <button className="ws-link" type="submit" disabled={busy} aria-label={`Borrar la etiqueta ${label.nombre}`}>
                      Borrar
                    </button>
                  </Form>
                </li>
              ))}
            </ul>
          ) : null}
          <Form method="post" className="ws-settings-fields ws-settings-fields--pair">
            <input type="hidden" name="intent" value="label-create" />
            <label className="ws-field">
              <span className="ws-field__label">Nueva etiqueta</span>
              <span className="ws-field__control">
                <input name="nombre" maxLength={30} placeholder="Ej.: Mayorista" required />
              </span>
            </label>
            <label className="ws-field">
              <span className="ws-field__label">Color</span>
              <span className="ws-field__control">
                <select name="color" defaultValue="verde">
                  {LABEL_COLORS.map((color) => (
                    <option key={color} value={color}>{COLOR_NAMES[color]}</option>
                  ))}
                </select>
              </span>
            </label>
            <button className="ws-button ws-button--outline ws-button--auto" type="submit" disabled={busy}>
              Crear etiqueta
            </button>
          </Form>
          {notice('label-create')}
        </section>
      )}

      <div className="ws-columns ws-columns--even">
        <section className="ws-card" aria-labelledby="returns-title">
          <h2 id="returns-title" className="ws-card__title">Devoluciones</h2>
          {manageReturns ? (
            <Form method="post" className="ws-pos__checkout">
              <input type="hidden" name="intent" value="returns" />
              <label className="ws-field">
                <span className="ws-field__label">Plazo para devolver (días después de la venta)</span>
                <span className="ws-field__control">
                  <input name="plazoDias" type="number" min={1} max={365} step={1} defaultValue={plazoDias} inputMode="numeric" />
                </span>
                <small className="ws-meta">Fuera de plazo solo el Owner o un administrador la registra, con un motivo.</small>
              </label>
              {notice('returns')}
              <button className="ws-button ws-button--outline ws-button--auto" type="submit" disabled={busy}>Guardar plazo</button>
            </Form>
          ) : (
            <p className="ws-meta">Se aceptan devoluciones hasta {plazoDias} días después de la venta.</p>
          )}
        </section>
        <section className="ws-card" aria-labelledby="payments-title">
          <h2 id="payments-title" className="ws-card__title">Cobros online</h2>
          <p className="ws-meta">La cuenta de Mercado Pago donde entra la plata de los pedidos de la tienda.</p>
          {owner ? (
            <Link className="ws-button ws-button--outline ws-button--auto" to={`/panel/cobros`}>Ir a Cobros</Link>
          ) : (
            <p className="ws-meta">La conecta el Owner.</p>
          )}
        </section>
      </div>
    </div>
  );
}
