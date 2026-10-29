import type { LinksFunction, LoaderFunction } from "@remix-run/node";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useParams,
} from "@remix-run/react";
import { json } from "@remix-run/node";
// @ts-ignore
import styles from "./app.css?url";

interface RootLoaderData {
  locale: string;
}

export const loader: LoaderFunction = async ({ request }) => {
  // Extract locale from URL or accept-language header
  const url = new URL(request.url);
  const pathname = url.pathname;

  let locale = 'es';
  if (pathname.startsWith('/en')) {
    locale = 'en';
  } else if (pathname.startsWith('/es')) {
    locale = 'es';
  } else {
    // Check Accept-Language header
    const acceptLanguage = request.headers.get('Accept-Language') || '';
    if (acceptLanguage.includes('en')) {
      locale = 'en';
    }
  }

  return json({ locale });
};

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: styles },
];

export default function App() {
  const { locale } = useLoaderData<RootLoaderData>();
  const params = useParams();
  const currentLocale = (params.lang || locale) as 'es' | 'en';

  return (
    <html lang={currentLocale} dir="ltr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2563eb" />
        <Meta />
        <Links />
      </head>
      <body>
        {/* Root Provider Setup */}
        <div id="root">
          <Outlet />
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

/**
 * Error Boundary Component
 */
export function ErrorBoundary() {
  const params = useParams();
  const lang = (params.lang || 'es') as 'es' | 'en';

  const translations = {
    es: {
      error_title: 'Oops! Algo salió mal',
      error_message: 'Parece que hay un error. Por favor, intenta de nuevo.',
      go_home: 'Volver al Inicio',
    },
    en: {
      error_title: 'Oops! Something went wrong',
      error_message: 'It looks like there\'s an error. Please try again.',
      go_home: 'Go Home',
    },
  };

  const t = translations[lang] || translations.es;

  return (
    <html lang={lang}>
      <head>
        <title>Error - Wapsell</title>
        <Links />
        <Meta />
      </head>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center max-w-md">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {t.error_title}
            </h1>
            <p className="text-gray-600 mb-8">
              {t.error_message}
            </p>
            <a
              href={`/${lang}`}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition inline-block"
            >
              {t.go_home}
            </a>
          </div>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
