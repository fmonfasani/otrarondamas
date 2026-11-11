const CHANNELS = [
  { name: 'WhatsApp', detail: 'Consultas y seguimiento', icon: 'message-circle-20', tone: 'success' },
  { name: 'Instagram', detail: 'De un mensaje a una oportunidad', icon: 'instagram', tone: 'primary' },
  { name: 'Messenger', detail: 'Atención que continúa', icon: 'messages-square-20', tone: 'secondary' },
];

/** Figma "Canales · Una sola bandeja" (145:12666 / 145:13006). */
export function ChannelsSection() {
  return (
    <section className="lp-section lp-split lp-channels" aria-labelledby="lp-channels-title">
      <div className="lp-split__story">
        <div className="lp-intro">
          <p className="lp-intro__eyebrow">02 / DONDE ESTÁN TUS CLIENTES</p>
          <h2 id="lp-channels-title" className="lp-intro__title">
            Distintos canales.
            <br />
            La misma cercanía.
          </h2>
          <p className="lp-intro__lead">
            No les pidas que cambien de canal. Reúne tus conversaciones de WhatsApp, Instagram y
            Messenger en un espacio de trabajo común.
          </p>
        </div>
        <p className="lp-small">Conecta las cuentas de tu negocio y organiza la atención desde Wapsell.</p>
      </div>

      <div className="lp-channels__panel">
        <div className="lp-channels__heading">
          Tus canales, conectados
          <img src="/landing/link.svg" alt="" width={20} height={20} />
        </div>
        {CHANNELS.map((channel) => (
          <div key={channel.name} className="lp-channel">
            <span className={`lp-channel__icon lp-symbol--${channel.tone}`} aria-hidden="true">
              <img src={`/landing/${channel.icon}.svg`} alt="" width={20} height={20} />
            </span>
            <span className="lp-channel__info">
              <b>{channel.name}</b>
              <span>{channel.detail}</span>
            </span>
            <img src="/landing/check-16.svg" alt="Conectado" width={16} height={16} />
          </div>
        ))}
        <p className="lp-channels__note">
          Ejemplo de configuración · La conexión depende de los permisos de cada cuenta.
        </p>
      </div>
    </section>
  );
}
