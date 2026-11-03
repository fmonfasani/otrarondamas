import { json, type ActionFunctionArgs, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Form, useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";

type Product = {
  productoId: string;
  nombre: string;
  codigoInterno?: string | null;
  unidadBase?: string | null;
  precio: string;
  precioSinDescuento?: string | null;
  descuentoPorcentaje?: number | null;
  disponible: boolean;
  stockTotal: number;
};

type CartLine = { product: Product; quantity: number };

const apiUrl = () =>
  (process.env.API_BASE_URL || process.env.API_URL || "http://localhost:3000").replace(/\/$/, "");

/**
 * Customer Public Storefront
 *
 * ROUTE: /_customer/
 * AREA: Customer Experience
 *
 * Public storefront catalog, cart, and checkout.
 * No authentication required for browsing; checkout submits order to NestJS.
 */

export const meta: MetaFunction = () => [
  { title: "Otra Ronda Más | Tu tienda online" },
  { name: "description", content: "Explorá el catálogo, armá tu pedido y comprá en Otra Ronda Más." },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  try {
    const response = await fetch(
      `${apiUrl()}/tienda/productos${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) {
      return json({ products: [] as Product[], error: "No pudimos cargar el catálogo. Intentá nuevamente en unos minutos.", search });
    }
    const products = (await response.json()) as Product[];
    return json({ products, error: null, search });
  } catch {
    return json({
      products: [] as Product[],
      error: "No pudimos conectar con la tienda. Verificá que el servicio esté disponible.",
      search,
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData();
  const nombre = String(form.get("nombre") || "").trim();
  const email = String(form.get("email") || "").trim();
  const telefono = String(form.get("telefono") || "").trim();
  let items: Array<{ productoId: string; cantidad: number }>;
  try {
    items = JSON.parse(String(form.get("items") || "[]"));
  } catch {
    return json({ ok: false, message: "El carrito no es válido." }, { status: 400 });
  }
  if (nombre.length < 2 || !email || !items.length) {
    return json({ ok: false, message: "Completá tus datos y agregá al menos un producto." }, { status: 400 });
  }
  try {
    const response = await fetch(`${apiUrl()}/tienda/pedidos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ nombre, email, telefono: telefono || undefined, items }),
      signal: AbortSignal.timeout(15000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = typeof payload.message === "string" ? payload.message : "No pudimos registrar el pedido.";
      return json({ ok: false, message }, { status: response.status });
    }
    return json({ ok: true, message: "¡Pedido recibido! El comercio se pondrá en contacto para confirmar los detalles." });
  } catch {
    return json({ ok: false, message: "No pudimos conectar con el comercio. Tu pedido no fue enviado." }, { status: 502 });
  }
}

const money = (value: string) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 2 }).format(Number(value));

export default function Index() {
  const { products, error, search } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderConfirmation, setOrderConfirmation] = useState("");
  const total = useMemo(
    () => cart.reduce((sum, line) => sum + Number(line.product.precio) * line.quantity, 0),
    [cart],
  );

  useEffect(() => {
    if (fetcher.data?.ok) {
      setOrderConfirmation(fetcher.data.message);
      setCart([]);
      setCartOpen(false);
    }
  }, [fetcher.data]);

  const add = (product: Product) => {
    setCart((current) => {
      const found = current.find((line) => line.product.productoId === product.productoId);
      if (found) {
        return current.map((line) =>
          line.product.productoId === product.productoId
            ? { ...line, quantity: Math.min(line.quantity + 1, product.stockTotal) }
            : line,
        );
      }
      return [...current, { product, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const changeQuantity = (id: string, quantity: number) =>
    setCart((current) =>
      current
        .map((line) => (line.product.productoId === id ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0),
    );

  return (
    <main className="store-shell">
      <header className="store-header">
        <a className="brand" href="/" aria-label="Otra Ronda Más, inicio">
          <span className="brand-mark">OR</span>
          <span>OTRA RONDA <strong>MÁS</strong></span>
        </a>
        <nav className="header-actions" aria-label="Navegación principal">
          <a href="#catalogo">Catálogo</a>
          <button className="cart-trigger" type="button" onClick={() => setCartOpen(!cartOpen)}>
            Mi pedido <span>{cart.reduce((sum, line) => sum + line.quantity, 0)}</span>
          </button>
        </nav>
      </header>

      {orderConfirmation ? <div className="order-confirmation" role="status"><strong>Pedido enviado</strong><span>{orderConfirmation}</span><button type="button" onClick={() => setOrderConfirmation("")} aria-label="Cerrar confirmación">×</button></div> : null}

      <section className="store-hero">
        <div className="hero-copy">
          <span className="eyebrow">TU TIENDA, MÁS CERCA</span>
          <h1>Lo que necesitás.<br /><em>En una ronda.</em></h1>
          <p>Explorá nuestros productos, armá tu pedido y coordiná la entrega directamente con el comercio.</p>
          <a className="primary-link" href="#catalogo">Ver productos <span>↘</span></a>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-disc"><span>UNA<br />RONDA<br /><b>MÁS.</b></span></div>
          <span className="art-spark spark-one">✳</span><span className="art-spark spark-two">✳</span>
        </div>
        <div className="hero-foot"><span>COMPRA SIMPLE</span><span>ATENCIÓN DIRECTA</span><span>HECHO PARA VOS</span></div>
      </section>

      <section className="catalog-section" id="catalogo">
        <div className="section-heading">
          <div><span className="eyebrow">SELECCIÓN DEL COMERCIO</span><h2>El catálogo</h2></div>
          <span className="product-count">{products.length} productos</span>
        </div>
        <Form method="get" className="search-form">
          <span aria-hidden="true">⌕</span>
          <input type="search" name="search" placeholder="¿Qué estás buscando?" defaultValue={search} aria-label="Buscar productos" />
          <button type="submit">Buscar</button>
        </Form>

        {error ? (
          <div className="catalog-state" role="status"><span>!</span><p>{error}</p></div>
        ) : products.length === 0 ? (
          <div className="catalog-state"><span>○</span><p>No encontramos productos para mostrar. Probá con otra búsqueda.</p></div>
        ) : (
          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.productoId}>
                <div className="product-visual"><span className="product-initial">{product.nombre.trim().charAt(0).toUpperCase()}</span>
                  {product.descuentoPorcentaje ? <span className="discount-tag">-{product.descuentoPorcentaje}%</span> : null}
                  {!product.disponible ? <span className="unavailable-tag">Sin stock</span> : null}
                </div>
                <div className="product-info">
                  <span className="product-code">{product.codigoInterno || "PRODUCTO"}</span>
                  <h3>{product.nombre}</h3>
                  <div className="product-bottom"><div><strong>{money(product.precio)}</strong>
                    {product.precioSinDescuento ? <del>{money(product.precioSinDescuento)}</del> : null}
                    <small>{product.unidadBase || "Unidad"}</small></div>
                    <button type="button" className="add-button" disabled={!product.disponible} onClick={() => add(product)} aria-label={`Agregar ${product.nombre}`}>+</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="store-footer"><a className="brand brand-footer" href="/"><span className="brand-mark">OR</span><span>OTRA RONDA <strong>MÁS</strong></span></a><span>Una forma más simple de comprar.</span></footer>

      {cartOpen ? (
        <div className="cart-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false); }}>
          <aside className="cart-panel" aria-label="Tu pedido">
            <div className="cart-heading"><div><span className="eyebrow">TU COMPRA</span><h2>Mi pedido</h2></div><button type="button" className="close-cart" onClick={() => setCartOpen(false)} aria-label="Cerrar carrito">×</button></div>
            {cart.length === 0 ? <p className="empty-cart">Todavía no agregaste productos.</p> : (
              <>
                <div className="cart-lines">{cart.map((line) => (
                  <div className="cart-line" key={line.product.productoId}>
                    <div className="line-copy"><strong>{line.product.nombre}</strong><span>{money(line.product.precio)}</span></div>
                    <div className="quantity-control"><button type="button" onClick={() => changeQuantity(line.product.productoId, line.quantity - 1)} aria-label="Restar">−</button><span>{line.quantity}</span><button type="button" disabled={line.quantity >= line.product.stockTotal} onClick={() => changeQuantity(line.product.productoId, line.quantity + 1)} aria-label="Sumar">+</button></div>
                  </div>
                ))}</div>
                <div className="cart-total"><span>Total estimado</span><strong>{money(total.toFixed(2))}</strong></div>
                <fetcher.Form method="post" className="checkout-form">
                  <input type="hidden" name="items" value={JSON.stringify(cart.map((line) => ({ productoId: line.product.productoId, cantidad: line.quantity })))} />
                  <label>Nombre<input name="nombre" required minLength={2} placeholder="Tu nombre" /></label>
                  <label>Email<input name="email" type="email" required placeholder="tu@email.com" /></label>
                  <label>Teléfono <span>(opcional)</span><input name="telefono" type="tel" placeholder="11 1234 5678" /></label>
                  {fetcher.data?.message ? <p className={fetcher.data.ok ? "form-success" : "form-error"} role="status">{fetcher.data.message}</p> : null}
                  <button className="submit-order" type="submit" disabled={fetcher.state !== "idle"}>{fetcher.state !== "idle" ? "Enviando pedido…" : "Confirmar pedido · " + money(total.toFixed(2))}</button>
                  <small>El pedido queda sujeto a confirmación del comercio.</small>
                </fetcher.Form>
              </>
            )}
          </aside>
        </div>
      ) : null}
    </main>
  );
}
