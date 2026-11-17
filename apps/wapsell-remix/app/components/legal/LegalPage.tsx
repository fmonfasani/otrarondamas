import type { ReactNode } from 'react';

/** Public legal pages (privacy, terms): plain, readable on a phone, no session needed. */
export function LegalPage({
  title,
  updated,
  children,
}: Readonly<{ title: string; updated: string; children: ReactNode }>) {
  return (
    <main className="ws-legal">
      <header className="ws-legal__head">
        <a href="https://app.wapsell.com" className="ws-legal__brand">
          wapsell<span>.</span>
        </a>
        <nav aria-label="Legales">
          <a href="/privacidad">Privacidad</a>
          <a href="/terminos">Términos</a>
        </nav>
      </header>
      <article className="ws-legal__body">
        <h1>{title}</h1>
        <p className="ws-legal__updated">Última actualización: {updated}</p>
        {children}
      </article>
    </main>
  );
}
