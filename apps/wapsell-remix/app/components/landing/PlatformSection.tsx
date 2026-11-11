import { Logo } from '~/components/brand/Logo';

const RAIL = [
  { icon: 'messages-square-18', label: 'Mensajes', active: true },
  { icon: 'users', label: 'Clientes' },
  { icon: 'workflow', label: 'Automatizaciones' },
  { icon: 'chart', label: 'Reportes' },
  { icon: 'settings', label: 'Configuración' },
];

const CONVERSATIONS = [
  { initials: 'MS', name: 'María Sánchez', time: '10:42', last: '¡Genial! ¿Lo tienen en beige?', active: true },
  { initials: 'DR', name: 'Diego Ruiz', time: '10:38', last: 'Gracias, quedo pendiente del envío.' },
  { initials: 'AL', name: 'Ana López', time: '10:25', last: '¿Puedo cambiar la dirección?' },
  { initials: 'PT', name: 'Pablo Torres', time: '09:56', last: 'Hola, me interesa el catálogo.' },
];

const icon = (name: string, size: number, className?: string) => (
  <img className={className} src={`/landing/${name}.svg`} alt="" width={size} height={size} />
);

/**
 * Figma "Plataforma · Centro de mensajes" (145:12483 / 145:12901): an illustrative,
 * static view of the messaging center. On mobile only the active conversation shows.
 */
export function PlatformSection() {
  return (
    <section id="plataforma" className="lp-platform" aria-labelledby="lp-platform-title">
      <div className="lp-inner lp-platform__caption">
        <span className="lp-eyebrow">EL CENTRO DE TUS CONVERSACIONES</span>
        <small>Vista ilustrativa de la plataforma ↙</small>
      </div>

      <div className="lp-inner lp-app" role="img" aria-label="Vista ilustrativa del centro de mensajes de Wapsell">
        <div className="lp-app__toolbar">
          <span className="lp-app__logo">
            <Logo variant="dark" href="#plataforma" />
          </span>
          <span className="lp-app__workspace">
            Mi tienda / Centro de mensajes {icon('chevron-down', 14)}
          </span>
          <span className="lp-app__account">
            <span className="lp-pill lp-pill--success">
              {icon('circle-check-12', 12)}
              Disponible
            </span>
            <span className="lp-avatar lp-avatar--me">LC</span>
          </span>
        </div>

        <div className="lp-app__panels">
          <div className="lp-app__rail">
            {RAIL.map((item) => (
              <span key={item.icon} className={item.active ? 'is-active' : undefined} title={item.label}>
                {icon(item.icon, 18)}
              </span>
            ))}
          </div>

          <div className="lp-app__list">
            <div className="lp-app__list-head">
              Bandeja de entrada {icon('square-pen', 18)}
            </div>
            <div className="lp-app__search">
              {icon('search', 16)} Buscar conversaciones
            </div>
            <div className="lp-app__filters">
              <span className="lp-pill lp-pill--secondary">Abiertas · 8</span>
              <span className="lp-pill lp-pill--bg">Todas</span>
            </div>
            {CONVERSATIONS.map((row) => (
              <div key={row.initials} className={`lp-row${row.active ? ' is-active' : ''}`}>
                <span className={`lp-avatar lp-avatar--row${row.active ? ' lp-avatar--warning' : ''}`}>
                  {row.initials}
                </span>
                <span className="lp-row__summary">
                  <span className="lp-row__meta">
                    <span className="lp-row__name">{row.name}</span>
                    <span className="lp-row__time">{row.time}</span>
                  </span>
                  <span className="lp-row__last">{row.last}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="lp-app__chat">
            <div className="lp-app__chat-head">
              <img className="lp-back" src="/brand/arrow-left.svg" alt="" width={20} height={20} />
              <span className="lp-app__chat-contact">
                <b>María Sánchez</b>
                <span>WhatsApp · Asignada a Lucía</span>
              </span>
              {icon('ellipsis', 20, 'lp-more')}
            </div>
            <div className="lp-thread">
              <span className="lp-thread__day">HOY</span>
              <div className="lp-bubble">
                <p>¡Hola! Vi la mochila Urban. ¿Todavía está disponible?</p>
                <small>10:40</small>
              </div>
              <div className="lp-bubble lp-bubble--team">
                <p>
                  ¡Hola, María! Sí, la tenemos. Es liviana y tiene espacio para tu portátil. ¿Qué
                  color estás buscando?
                </p>
                <small>{'10:41  ✓✓'}</small>
              </div>
              <div className="lp-bubble">
                <p>¡Genial! ¿Lo tienen en beige?</p>
                <small>10:42</small>
              </div>
              <div className="lp-note">
                {icon('lock-keyhole', 14)}
                Nota interna · Consultar disponibilidad con almacén.
              </div>
            </div>
            <div className="lp-composer">
              Escribe tu respuesta…
              <div className="lp-composer__tools">
                <span>
                  {icon('paperclip', 16)}
                  {icon('smile', 16)}
                  {icon('zap', 16)}
                </span>
                <span className="lp-composer__send">{icon('arrow-up', 16)}</span>
              </div>
            </div>
          </div>

          <div className="lp-app__context">
            <h3>Información del cliente</h3>
            <span className="lp-avatar lp-avatar--lg lp-avatar--warning">MS</span>
            <div className="lp-app__customer">
              <b>María Sánchez</b>
              <span>maria@ejemplo.com</span>
            </div>
            <div className="lp-divider" />
            <div className="lp-app__group">
              <span>ETIQUETAS</span>
              <span className="lp-pill lp-pill--secondary">Interés: mochila Urban</span>
              <span className="lp-pill lp-pill--bg">Nueva consulta</span>
            </div>
            <div className="lp-app__group">
              <span>ETAPA COMERCIAL</span>
              <span className="lp-pill lp-pill--success">En conversación</span>
            </div>
            <div className="lp-divider" />
            <p className="lp-app__activity">
              Actividad reciente
              <br />
              Lucía tomó la conversación.
              <br />
              Hoy, 10:40
            </p>
          </div>
        </div>
      </div>

      <div className="lp-inner lp-platform__explain">
        <h2 id="lp-platform-title" className="lp-platform__claim">
          Un lugar para responder.
          <br />
          Mucho contexto para conectar.
        </h2>
        <p className="lp-platform__body">
          Mensajes, notas y datos del cliente, juntos. Para que cada respuesta se sienta como una
          conversación, no como empezar de cero.
        </p>
      </div>
      <p className="lp-inner lp-platform__disclaimer">Vista ilustrativa de la plataforma.</p>
    </section>
  );
}
