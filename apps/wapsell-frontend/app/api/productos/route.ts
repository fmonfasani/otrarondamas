import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
  const search = req.nextUrl.searchParams.get('search') || '';
  const familiaId = req.nextUrl.searchParams.get('familiaId') || '';
  const empresaId = req.nextUrl.searchParams.get('empresaId') || '';

  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8600'}/productos`);
    if (search) url.searchParams.append('search', search);
    if (familiaId) url.searchParams.append('familiaId', familiaId);
    if (empresaId) url.searchParams.append('empresaId', empresaId);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch productos' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Productos API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
