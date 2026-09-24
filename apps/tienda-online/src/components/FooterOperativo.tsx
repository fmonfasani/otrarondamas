/**
 * Barra fija con horario/ubicación (spec de diseño). Datos operativos
 * reales del negocio, no editables desde acá — si cambian, se
 * actualizan en este único lugar.
 */
export function FooterOperativo() {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--brand-black)',
        padding: '9px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--brand-yellow)"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
        <span style={{ fontSize: 10.5, color: '#c9c9c6' }}>8:00–24:00 · Río Cuarto</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <a href="tel:3586081000" aria-label="Llamar por teléfono">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c9c9c6"
            strokeWidth="1.8"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </a>
        <a
          href="https://www.instagram.com/otrarondamas.ok/"
          target="_blank"
          rel="noreferrer"
          aria-label="Instagram"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c9c9c6"
            strokeWidth="1.8"
          >
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" />
          </svg>
        </a>
      </div>
    </div>
  );
}
