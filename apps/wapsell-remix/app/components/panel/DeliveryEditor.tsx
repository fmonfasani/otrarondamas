import { useFetcher } from '@remix-run/react';
import { useState } from 'react';
import { WAPSELL_DELIVERY, feeExample, type DeliveryPanel } from '~/utils/envios';

type Answer = { intent: string; ok: boolean; message?: string };

/**
 * OR-B4-054 — «Envíos y retiro», in Ajustes. The Owner chooses pickup, delivery or both, how far
 * it delivers and its fee (never below Wapsell's $ 2.500 + $ 500 per km). Delivery needs the
 * store's pin: the fee is measured from it. The rest of the team sees it, without changing it.
 */
export function DeliveryEditor({ data }: Readonly<{ data: DeliveryPanel }>) {
  const saver = useFetcher<Answer>();
  const [envio, setEnvio] = useState(data.envios.envio);
  const [retiro, setRetiro] = useState(data.envios.retiro);
  const [base, setBase] = useState(String(data.envios.base));
  const [porKm, setPorKm] = useState(String(data.envios.porKm));
  const busy = saver.state !== 'idle';
  const example = { base: Number(base) || WAPSELL_DELIVERY.base, porKm: Number(porKm) || WAPSELL_DELIVERY.porKm };
  const answer = saver.data?.intent === 'delivery-save' ? saver.data : null;

  return (
    <saver.Form method="post" className="ws-envios">
      <input type="hidden" name="intent" value="delivery-save" />
      <fieldset disabled={!data.puedeEditar} className="ws-envios__options">
        <legend className="ws-visually-hidden">Cómo reciben los pedidos tus clientes</legend>
        <label className="ws-check" aria-label="Retiro en el local">
          <input type="checkbox" name="retiro" value="true" checked={retiro} onChange={(e) => setRetiro(e.target.checked)} />
          <span>
            <b>Retiro en el local</b>
            <small>El cliente pasa a buscar el pedido. Sin costo de envío.</small>
          </span>
        </label>
        <label className="ws-check" aria-label="Envío a domicilio">
          <input
            type="checkbox"
            name="envio"
            value="true"
            checked={envio}
            disabled={!data.ubicacionConfirmada && !envio}
            onChange={(e) => setEnvio(e.target.checked)}
          />
          <span>
            <b>Envío a domicilio</b>
            <small>
              {data.ubicacionConfirmada
                ? 'Lo lleva tu repartidor. El envío se cobra aparte y es todo para él.'
                : 'Primero marcá tu negocio en el mapa (más arriba): el envío se mide desde ahí.'}
            </small>
          </span>
        </label>

        <div className="ws-envios__fields" hidden={!envio}>
          <label className="ws-field">
            <span className="ws-field__label">Hasta cuántos km enviás</span>
            <span className="ws-field__control">
              <input name="radioKm" type="number" inputMode="numeric" min={1} max={50} step={1} defaultValue={data.envios.radioKm} required />
            </span>
          </label>
          <label className="ws-field">
            <span className="ws-field__label">Base del envío ($)</span>
            <span className="ws-field__control">
              <input name="base" type="number" inputMode="numeric" min={WAPSELL_DELIVERY.base} step={100} value={base} onChange={(e) => setBase(e.target.value)} required />
            </span>
          </label>
          <label className="ws-field">
            <span className="ws-field__label">Por km o fracción ($)</span>
            <span className="ws-field__control">
              <input name="porKm" type="number" inputMode="numeric" min={WAPSELL_DELIVERY.porKm} step={50} value={porKm} onChange={(e) => setPorKm(e.target.value)} required />
            </span>
          </label>
        </div>
        {envio ? (
          <p className="ws-meta">
            Ejemplo: {feeExample(example)}, todo para el repartidor. Lo mínimo es lo de Wapsell: $ 2.500 + $ 500 por km.
          </p>
        ) : null}
      </fieldset>

      {answer ? (
        <p className={answer.ok ? 'ws-notice' : 'ws-alert'} role={answer.ok ? undefined : 'alert'} aria-live={answer.ok ? 'polite' : undefined}>
          {answer.message}
        </p>
      ) : null}
      {data.puedeEditar ? (
        <div className="ws-location__actions">
          <button className="ws-button ws-button--primary ws-button--auto" type="submit" disabled={busy}>
            {busy ? 'Guardando…' : 'Guardar envíos y retiro'}
          </button>
        </div>
      ) : (
        <p className="ws-meta">Solo el Owner cambia los envíos y el retiro.</p>
      )}
    </saver.Form>
  );
}
