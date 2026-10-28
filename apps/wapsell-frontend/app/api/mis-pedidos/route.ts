import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
  const empresaId = req.nextUrl.searchParams.get('empresaId') || '';

  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const url = new URL(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8600'}/pedidos`);
    if (empresaId) url.searchParams.append('empresaId', empresaId);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch pedidos' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Mis pedidos API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
