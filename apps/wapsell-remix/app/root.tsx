import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
} from "@remix-run/react";
import { useEffect } from "react";
import styles from "./app.css?url";
import wapsellStyles from "./styles/wapsell.css?url";
import chatStyles from "./styles/chat.css?url";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  },
  { rel: "stylesheet", href: styles },
  { rel: "stylesheet", href: wapsellStyles },
  // Paquete 2: the chat's one look, for the store and the panel.
  { rel: "stylesheet", href: chatStyles },
];

/**
 * Login por rol (Owner, 2026-11-26): two installable apps from the same site. «Wapsell Negocios»
 * (the panel; keeps the original manifest, so installs already made stay the same) and «Wapsell»
 * (the customer: stores and their purchases, orange icon).
 */
function appOf(pathname: string) {
  const business = pathname.startsWith("/panel");
  return business
    ? { manifest: "/manifest.webmanifest", icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png", title: "Wapsell Negocios" }
    : { manifest: "/manifest-cliente.webmanifest", icon: "/icons/cliente-192.png", apple: "/icons/cliente-apple-touch-icon.png", title: "Wapsell" };
}

/** Registers the service worker that makes Wapsell installable (production only; see public/sw.js). */
function useServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not installable in this browser; the site works the same.
    });
  }, []);
}

export default function App() {
  useServiceWorker();
  const app = appOf(useLocation().pathname);
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#faf9f5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={app.title} />
        <link rel="manifest" href={app.manifest} />
        <link rel="icon" type="image/png" sizes="192x192" href={app.icon} />
        <link rel="apple-touch-icon" href={app.apple} />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
