import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8600'}/familias`,
      {
        headers: { Authorization: `Bearer ${jwt}` },
      },
    );

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch familias' }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Familias API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
