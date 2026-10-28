import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8600'}/pedidos`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to create order' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Checkout API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
