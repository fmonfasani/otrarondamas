const FEATURES = [
  {
    icon: 'inbox',
    tone: 'secondary',
    title: 'Todo entra. Nada se pierde.',
    body: 'Organiza consultas de distintos canales en una bandeja compartida. Encuentra lo importante y continúa desde ahí.',
    items: ['Sin asignar', 'En seguimiento', 'Resueltas'],
  },
  {
    icon: 'contact-round',
    tone: 'warning',
    title: 'El contexto hace la diferencia.',
    body: 'Ten a mano el historial, las etiquetas y las notas de cada cliente. Responde con memoria, no con suposiciones.',
    items: ['Historial', 'Intereses', 'Notas internas'],
  },
  {
    icon: 'zap-24',
    tone: 'success',
    title: 'Menos repetir. Más resolver.',
    body: 'Usa respuestas guardadas y flujos para lo habitual. Deja que tu equipo se concentre en lo que necesita atención.',
    items: ['Bienvenida', 'Asignación', 'Seguimiento'],
  },
];

/** Figma "Funciones · De mensajes a oportunidades" (145:12615 / 145:12955). */
export function FeaturesSection() {
  return (
    <section id="funciones" className="lp-section lp-features" aria-labelledby="lp-features-title">
      <div className="lp-inner lp-intro">
        <p className="lp-intro__eyebrow">01 / MENOS CAOS, MÁS CLARIDAD</p>
        <h2 id="lp-features-title" className="lp-intro__title">
          Conversar es fácil.
          <br />
          Hacerlo bien, también.
        </h2>
        <p className="lp-intro__lead">
          Dale estructura a tu atención sin quitarle lo más importante: el lado humano.
        </p>
      </div>
      <div className="lp-inner lp-features__grid">
        {FEATURES.map((feature) => (
          <article key={feature.title} className="lp-feature">
            <span className={`lp-symbol lp-symbol--${feature.tone}`} aria-hidden="true">
              <img src={`/landing/${feature.icon}.svg`} alt="" width={24} height={24} />
            </span>
            <h3 className="lp-feature__title">{feature.title}</h3>
            <p className="lp-feature__body">{feature.body}</p>
            <ul className="lp-feature__list">
              {feature.items.map((item) => (
                <li key={item}>
                  {item}
                  <img src="/landing/check-14.svg" alt="" width={14} height={14} />
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
