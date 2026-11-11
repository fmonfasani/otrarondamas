const CAPABILITIES = [
  'Asignación clara de conversaciones',
  'Historial y notas para todo el equipo',
  'Contactos organizados por etapa e interés',
];

/** Figma "Equipo · Contexto compartido" (145:12741 / 145:13081). */
export function TeamSection() {
  return (
    <section className="lp-section lp-split lp-team" aria-labelledby="lp-team-title">
      <div className="lp-split__story">
        <div className="lp-intro">
          <p className="lp-intro__eyebrow">04 / PERSONAS, NO TICKETS</p>
          <h2 id="lp-team-title" className="lp-intro__title">
            Tu equipo en sintonía.
            <br />
            Tu cliente, en el centro.
          </h2>
          <p className="lp-intro__lead">
            Asigna cada conversación, comparte notas internas y organiza contactos con etiquetas. El
            siguiente paso siempre tiene un responsable.
          </p>
        </div>
        <ul className="lp-team__capabilities">
          {CAPABILITIES.map((capability) => (
            <li key={capability}>
              <span className="lp-team__check" aria-hidden="true">
                <img src="/brand/check.svg" alt="" width={12} height={12} />
              </span>
              {capability}
            </li>
          ))}
        </ul>
      </div>

      <div className="lp-contact" role="img" aria-label="Ejemplo de ficha de contacto">
        <div className="lp-contact__identity">
          <span className="lp-avatar lp-avatar--warning lp-contact__avatar">MS</span>
          <span className="lp-contact__details">
            <b>María Sánchez</b>
            <span>maria@ejemplo.com</span>
          </span>
        </div>
        <div className="lp-contact__tags">
          <span className="lp-pill lp-pill--secondary">Interés: mochila Urban</span>
          <span className="lp-pill lp-pill--success">En conversación</span>
        </div>
        <div className="lp-contact__note">
          <span className="lp-contact__note-head">
            <img src="/landing/lock-keyhole.svg" alt="" width={14} height={14} />
            NOTA INTERNA
          </span>
          <p>
            @Lucía, María busca la mochila en beige. Confirmemos disponibilidad antes de enviarle el
            enlace.
          </p>
          <small>Sofía · Hoy, 10:43</small>
        </div>
        <div className="lp-contact__owner">
          Responsable
          <span className="lp-pill lp-pill--bg">LC · Lucía / Ventas</span>
        </div>
        <small className="lp-contact__caption">Ejemplo de ficha de contacto.</small>
      </div>
    </section>
  );
}
