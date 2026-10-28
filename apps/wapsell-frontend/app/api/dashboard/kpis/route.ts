import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8600';

export async function GET(req: NextRequest) {
  try {
    const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
    const period = req.nextUrl.searchParams.get('period') || '30d';

    if (!jwt) {
      return NextResponse.json({ error: 'Unauthorized: No JWT provided' }, { status: 401 });
    }

    // Validate period
    if (!['7d', '30d', '90d'].includes(period)) {
      return NextResponse.json(
        { error: 'Invalid period. Must be 7d, 30d, or 90d' },
        { status: 400 },
      );
    }

    const res = await fetch(`${API_BASE_URL}/admin/dashboard/kpis?period=${period}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`Failed to fetch KPIs: ${res.status} ${res.statusText}`);
      return NextResponse.json(
        { error: 'Failed to fetch KPIs from backend' },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('KPIs API error:', error);
    return NextResponse.json({ error: 'Server error fetching KPIs' }, { status: 500 });
  }
}
