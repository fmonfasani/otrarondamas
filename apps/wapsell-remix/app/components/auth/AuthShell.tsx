import type { ReactNode } from 'react';
import { Logo } from '~/components/brand/Logo';

/** Where "¿Necesitas ayuda?" points until a support channel is defined. */
export const SUPPORT_HREF = '/#ayuda';

/**
 * Layout of the auth screens — Figma "Ingresar a Wapsell · Web" (145:13208) and
 * "· Móvil" (145:13261). Web: dark brand panel + centered form. Mobile: dark logo,
 * "Volver a Wapsell", form and footer.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="ws-auth">
      <aside className="ws-auth__brand" aria-label="Wapsell">
        <Logo variant="light" />
        <div className="ws-brand-story">
          <p className="ws-brand-story__eyebrow">CADA CONVERSACIÓN CUENTA</p>
          <p className="ws-brand-story__title">
            Más cerca
            <br />
            de tus clientes.
            <br />
            Más lejos
            <br />
            del caos.
          </p>
          <p className="ws-brand-story__lead">
            Tu equipo, tus canales y el contexto que necesitas. Todo listo para seguir la
            conversación.
          </p>
          <div className="ws-brand-chat" aria-hidden="true">
            <div className="ws-brand-chat__bubble ws-brand-chat__bubble--customer">
              <img src="/brand/message-circle.svg" alt="" width={20} height={20} />
              <span>Hola, ¿me ayudas a elegir?</span>
            </div>
            <div className="ws-brand-chat__bubble ws-brand-chat__bubble--team">
              <span>¡Claro! Cuéntame qué estás buscando.</span>
            </div>
          </div>
        </div>
        <div className="ws-brand-footer">
          <span>© 2026 Wapsell</span>
          <span>Conversar. Conectar. Vender.</span>
        </div>
      </aside>

      <main className="ws-auth__main">
        <div className="ws-auth__mobile-header">
          <Logo variant="dark" />
          <a className="ws-auth__back" href="/">
            <img src="/brand/arrow-left.svg" alt="" width={16} height={16} />
            Volver a Wapsell
          </a>
        </div>

        <nav className="ws-auth__utility" aria-label="Navegación">
          <a href="/">← Volver a Wapsell</a>
          <a href={SUPPORT_HREF}>¿Necesitas ayuda? ↗</a>
        </nav>

        <div className="ws-auth__content">{children}</div>

        <footer className="ws-auth__footer">
          <a className="ws-auth__help" href={SUPPORT_HREF}>
            ¿Necesitas ayuda? Contacta a soporte ↗
          </a>
          <p className="ws-auth__legal">
            Al continuar, aceptas los Términos y condiciones
            <br />y la Política de privacidad de Wapsell.
          </p>
        </footer>
      </main>
    </div>
  );
}
