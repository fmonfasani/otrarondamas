/**
 * Wapsell logo — Figma "Logo / Light" (145:13210) and "Logo / Dark" (145:13263):
 * a 31px square tilted 17°, the "W" counter-rotated, the brand period, and the wordmark.
 */
export function Logo({
  variant,
  href = '/',
}: {
  variant: 'light' | 'dark';
  href?: string;
}) {
  return (
    <a href={href} className={`ws-logo ws-logo--${variant}`} aria-label="Wapsell, inicio">
      <span className="ws-logo__mark" aria-hidden="true">
        <span className="ws-logo__square">
          <span>
            <b>W</b>
          </span>
        </span>
        <img className="ws-logo__period" src="/brand/brand-period.svg" alt="" width={8} height={8} />
      </span>
      <span className="ws-logo__word">wapsell</span>
    </a>
  );
}
