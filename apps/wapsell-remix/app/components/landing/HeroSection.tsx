import { Logo } from '~/components/brand/Logo';

export const LOGIN_HREF = '/es/auth/login';

/** Figma "Hero · Conversaciones que venden" (145:12448 / 145:12869). */
export function HeroSection() {
  return (
    <header>
      <div className="lp-header">
        <span className="lp-header__balance" aria-hidden="true" />
        <Logo variant="dark" />
        <nav className="lp-nav" aria-label="Principal">
          <a className="lp-nav__link" href="#funciones">
            Funciones
          </a>
          <a className="lp-nav__link" href="#plataforma">
            Plataforma
          </a>
          <a className="lp-btn lp-btn--outline lp-nav__login-outline" href={LOGIN_HREF}>
            Ingresar
          </a>
          <a className="lp-nav__login-text" href={LOGIN_HREF}>
            Ingresar ↗
          </a>
        </nav>
      </div>

      <div className="lp-hero">
        <span className="lp-pill lp-pill--card">
          <img src="/landing/messages-square-12.svg" alt="" width={12} height={12} />
          MENOS FRICCIÓN. MÁS CONVERSACIÓN.
        </span>
        <h1 className="lp-hero__title">
          Cada conversación <br />
          puede ser una <em>venta.</em>
        </h1>
        <p className="lp-hero__lead">
          Reúne tus mensajes, acompaña a cada cliente y vende en equipo. Todo desde un mismo
          lugar, sin perder el hilo.
        </p>
        <div className="lp-hero__actions">
          <a className="lp-btn lp-btn--primary" href="#funciones">
            Conocer Wapsell
            <img src="/landing/arrow-up-right.svg" alt="" width={16} height={16} />
          </a>
          <a className="lp-btn lp-btn--outline" href="#plataforma">
            Explorar la plataforma
          </a>
        </div>
        <ul className="lp-promises">
          {['Una bandeja compartida', 'Atención con contexto', 'Tu equipo conectado'].map((promise) => (
            <li key={promise}>
              <img src="/landing/check-14.svg" alt="" width={14} height={14} />
              {promise}
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
