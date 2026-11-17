import type { LinksFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import { useEffect } from "react";
import styles from "./app.css?url";
import wapsellStyles from "./styles/wapsell.css?url";

export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
  },
  { rel: "stylesheet", href: styles },
  { rel: "stylesheet", href: wapsellStyles },
  // Installable app (PWA): manifest and icons.
  { rel: "manifest", href: "/manifest.webmanifest" },
  { rel: "icon", type: "image/png", sizes: "192x192", href: "/icons/icon-192.png" },
  { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
];

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
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#faf9f5" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Wapsell" />
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
