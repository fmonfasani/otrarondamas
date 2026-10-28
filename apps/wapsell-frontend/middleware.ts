import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Si ya tiene /es o /en, dejar pasar
  if (pathname.startsWith('/es') || 
      pathname.startsWith('/en') || 
      pathname.startsWith('/api') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname.match(/\.\w+$/)) {  // archivos estáticos
    return NextResponse.next();
  }
  
  // Si es root, redirigir a idioma preferido
  if (pathname === '/' || pathname === '') {
    const locale = request.headers.get('accept-language')?.startsWith('es') ? 'es' : 'en';
    return NextResponse.redirect(new URL(`/${locale}/`, request.url));
  }
  
  // Para otras rutas sin locale, asumir español
  return NextResponse.redirect(new URL(`/es${pathname}`, request.url));
}

export const config = {
  matcher: ['/((?!_next|api|favicon|.*\..*).*)'],
};
