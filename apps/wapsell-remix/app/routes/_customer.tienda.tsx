import { redirect } from '@remix-run/node';

/**
 * `/tienda` without a Business. Each Business's store lives at `/tienda/:slug`; the old
 * single-store page («Otra Ronda Más | Tu tienda online», which read the API's
 * TIENDA_EMPRESA_ID routes) is gone (Owner, 2026-11-25): whoever lands here goes to the
 * Wapsell home page. No list of stores is shown.
 */
export const loader = () => redirect('/');
