import { Fragment } from 'react';

const STEPS = [
  { label: 'CUANDO', icon: 'message-circle-18', tone: 'secondary', title: 'Llega una consulta', detail: 'Nuevo mensaje en WhatsApp' },
  { label: 'ENTONCES', icon: 'sparkles', tone: 'warning', title: 'Da la bienvenida', detail: '“¡Hola! ¿En qué podemos ayudarte?”' },
  { label: 'DESPUÉS', icon: 'users', tone: 'primary', title: 'Conecta con tu equipo', detail: 'Asignar a Ventas y añadir etiqueta' },
];

/** Figma "Automatización · Flujos con intención" (145:12699 / 145:13039). */
export function AutomationSection() {
  return (
    <section className="lp-section lp-dark lp-automation" aria-labelledby="lp-automation-title">
      <div className="lp-inner lp-automation__intro">
        <div className="lp-intro">
          <p className="lp-intro__eyebrow">03 / AUTOMATIZA LO HABITUAL</p>
          <h2 id="lp-automation-title" className="lp-intro__title">
            Un buen flujo sabe
            <br />
            cuándo dar paso.
          </h2>
        </div>
        <p className="lp-automation__lead">
          Da la bienvenida, identifica la consulta y asígnala al equipo adecuado. Automatización
          para avanzar; personas para conectar.
        </p>
      </div>

      <div className="lp-inner lp-flow">
        <div className="lp-flow__toolbar">
          <b>Flujo de bienvenida</b>
          <span className="lp-pill lp-pill--success">Activo</span>
        </div>
        <ol className="lp-flow__steps">
          {STEPS.map((step, index) => (
            <Fragment key={step.label}>
              {index > 0 && (
                <li className="lp-flow__connector" aria-hidden="true">
                  <img src="/brand/arrow-right.svg" alt="" width={16} height={16} />
                </li>
              )}
              <li className="lp-flow__step">
                <span className="lp-flow__label">
                  <span className={`lp-flow__symbol lp-symbol--${step.tone}`}>
                    <img src={`/landing/${step.icon}.svg`} alt="" width={18} height={18} />
                  </span>
                  {step.label}
                  {index < STEPS.length - 1 && (
                    <img className="lp-flow__next" src="/brand/arrow-right.svg" alt="" width={16} height={16} />
                  )}
                </span>
                <b className="lp-flow__title">{step.title}</b>
                <span className="lp-flow__detail">{step.detail}</span>
              </li>
            </Fragment>
          ))}
        </ol>
        <p className="lp-flow__note">
          Ejemplo de flujo · El equipo puede tomar la conversación cuando sea necesario.
        </p>
      </div>

      <p className="lp-inner lp-automation__principle">
        <img src="/landing/handshake.svg" alt="" width={24} height={24} />
        Automatizar no es alejarse. Es llegar mejor preparado.
      </p>
    </section>
  );
}
