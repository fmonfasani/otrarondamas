import { useState } from 'react';

/** OR-B4-044 — the recovery codes, shown once: copy or download them. */
export function RecoveryCodes({ codes }: Readonly<{ codes: string[] }>) {
  const [copied, setCopied] = useState(false);
  const text = `Wapsell — códigos de recuperación\nCada uno sirve una sola vez.\n\n${codes.join('\n')}\n`;
  const download = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
  return (
    <section className="ws-mfa-codes" aria-label="Códigos de recuperación">
      <ol>
        {codes.map((c) => (
          <li key={c}>
            <code>{c}</code>
          </li>
        ))}
      </ol>
      <div className="ws-mfa-codes__actions">
        <button
          type="button"
          className="ws-button ws-button--outline ws-button--auto"
          onClick={() => {
            navigator.clipboard
              ?.writeText(text)
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
        >
          {copied ? 'Copiados' : 'Copiar'}
        </button>
        <a
          className="ws-button ws-button--outline ws-button--auto"
          href={download}
          download="wapsell-codigos-recuperacion.txt"
        >
          Descargar
        </a>
      </div>
    </section>
  );
}
