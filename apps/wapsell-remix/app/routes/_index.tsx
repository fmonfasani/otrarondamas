import { redirect, type LoaderFunction } from '@remix-run/node';

/**
 * Root Landing Page
 *
 * ROUTE: /
 * AREA: Public (no auth required)
 *
 * Entry point for Wapsell brand experience.
 * Redirects authenticated users to dashboard.
 */

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  if (url.pathname === '/') {
    return redirect('/es');
  }
  return null;
};

export default function LandingPage() {
  return (
    <main className="landing-shell">
      <header className="landing-header">
        <a className="landing-brand" href="/" aria-label="Wapsell, inicio">
          <span className="brand-mark">W</span>
          <span>WAPSELL</span>
        </a>
        <nav className="landing-nav">
          <a href="/#features">Características</a>
          <a href="/es/auth/login">Ingresar</a>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <span className="eyebrow">PLATAFORMA DE COMERCIO</span>
          <h1>Vendé más.<br /><em>En cada ronda.</em></h1>
          <p>Wapsell te ayuda a conectar con tus clientes, gestionar pedidos y crecer tu negocio. Todo desde una plataforma simple y poderosa.</p>
          <div className="cta-group">
            <a className="primary-link" href="/es/auth/login">
              Acceder <span>↘</span>
            </a>
            <a className="secondary-link" href="/_customer">
              Ver tienda <span>↘</span>
            </a>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-disc"><span>WAPSELL<br /><b>+</b></span></div>
          <span className="art-spark spark-one">✳</span><span className="art-spark spark-two">✳</span>
        </div>
      </section>

      <section className="landing-features" id="features">
        <div className="section-heading">
          <span className="eyebrow">LO QUE OFRECEMOS</span>
          <h2>Características</h2>
        </div>
        <div className="features-grid">
          <article className="feature-card">
            <div className="feature-icon">🏪</div>
            <h3>Tienda Online</h3>
            <p>Cataálogo de productos, carrito y checkout simplificado para tus clientes.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Dashboard</h3>
            <p>KPIs, órdenes recientes, gestión de inventario y ventas en tiempo real.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">👥</div>
            <h3>Multi-negocio</h3>
            <p>Administrá múltiples negocios desde una única plataforma integrada.</p>
          </article>
          <article className="feature-card">
            <div className="feature-icon">🔒</div>
            <h3>Seguro</h3>
            <p>Autenticación segura, datos encriptados y cumplimiento de normativas.</p>
          </article>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <a className="landing-brand" href="/">
            <span className="brand-mark">W</span>
            <span>WAPSELL</span>
          </a>
          <p>Plataforma de comercio para negocios en crecimiento.</p>
        </div>
        <div className="footer-links">
          <a href="/es/auth/login">Ingresar</a>
          <a href="/_customer">Tienda</a>
        </div>
      </footer>
    </main>
  );
}
