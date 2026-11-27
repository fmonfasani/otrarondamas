/**
 * Login por rol (Owner, 2026-11-26) — where each person goes after signing in.
 * Pure, so it is tested without a browser.
 */

/** Where a customer goes after choosing «Comprar» (only their home or a store, nothing else). */
export const buyerHome = (value: string | null | undefined) =>
  value && /^\/(cuenta|tienda|explorar|buscar|favoritos)(\/|\?|$)/.test(value) ? value : '/explorar';

/**
 * After the work key: to a store or the customer home as a customer when that is where the person
 * was going; to the place they asked for; to the panel or the stores if that was their last
 * choice; otherwise «¿Cómo querés entrar?».
 */
export function workDestination(redirectTo: string | null, cookieHeader: string | null): string {
  if (redirectTo && /^\/(cuenta|tienda|explorar|buscar|favoritos)(\/|\?|$)/.test(redirectTo)) {
    return `/entrar?como=cliente&volver=${encodeURIComponent(redirectTo)}`;
  }
  if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) return redirectTo;
  const last = /(?:^|;\s*)wapsell_entrada=(cliente|negocio)/.exec(cookieHeader ?? '')?.[1];
  if (last === 'negocio') return '/panel';
  if (last === 'cliente') return '/entrar?como=cliente';
  return '/entrar';
}
