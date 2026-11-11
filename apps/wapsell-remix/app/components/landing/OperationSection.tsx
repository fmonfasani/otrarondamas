const PRINCIPLES = [
  {
    icon: 'plug',
    title: 'Conexiones útiles',
    body: 'Revisa qué canales y herramientas necesita tu negocio. Define las integraciones que acompañan tu proceso de venta.',
  },
  {
    icon: 'shield-check-28',
    title: 'Accesos con criterio',
    body: 'Organiza quién atiende cada consulta y cómo se comparte el contexto. Tu equipo trabaja con responsabilidades claras.',
  },
  {
    icon: 'route',
    title: 'Un inicio acompañado',
    body: 'Prepara tus canales, ordena contactos y diseña un primer flujo. Empieza por lo esencial y amplía tu operación a tu ritmo.',
  },
];

/** Figma "Operación · Conexiones con sentido" (145:12783 / 145:13123). */
export function OperationSection() {
  return (
    <section className="lp-section lp-operation" aria-labelledby="lp-operation-title">
      <div className="lp-inner lp-intro">
        <p className="lp-intro__eyebrow">05 / UNA BASE PARA TU OPERACIÓN</p>
        <h2 id="lp-operation-title" className="lp-intro__title">
          Conecta el negocio.
          <br />
          Conserva el control.
        </h2>
        <p className="lp-intro__lead">
          Una atención ordenada empieza por decidir cómo se conectan tus canales, tus personas y tus
          procesos.
        </p>
      </div>
      <div className="lp-inner lp-operation__principles">
        {PRINCIPLES.map((principle) => (
          <article key={principle.title} className="lp-principle">
            <img src={`/landing/${principle.icon}.svg`} alt="" width={28} height={28} />
            <h3>{principle.title}</h3>
            <p>{principle.body}</p>
          </article>
        ))}
      </div>
      <p className="lp-inner lp-operation__reassurance">
        <img src="/landing/info.svg" alt="" width={20} height={20} />
        Cada operación es distinta. Conversemos sobre compatibilidad, permisos y alcance antes de
        conectar tus herramientas.
      </p>
    </section>
  );
}
