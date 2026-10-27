import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8600';

export async function GET(req: NextRequest) {
  try {
    const jwt = req.headers.get('authorization')?.replace('Bearer ', '');
    const limit = req.nextUrl.searchParams.get('limit') || '10';
    const metric = req.nextUrl.searchParams.get('metric') || 'revenue';

    if (!jwt) {
      return NextResponse.json(
        { error: 'Unauthorized: No JWT provided' },
        { status: 401 }
      );
    }

    // Validate inputs
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return NextResponse.json(
        { error: 'Invalid limit. Must be between 1 and 100' },
        { status: 400 }
      );
    }

    if (!['revenue', 'quantity'].includes(metric)) {
      return NextResponse.json(
        { error: 'Invalid metric. Must be revenue or quantity' },
        { status: 400 }
      );
    }

    const res = await fetch(
      `${API_BASE_URL}/admin/dashboard/top-products?limit=${limitNum}&metric=${metric}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      console.error(`Failed to fetch top products: ${res.status} ${res.statusText}`);
      return NextResponse.json(
        { error: 'Failed to fetch top products from backend' },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Top products API error:', error);
    return NextResponse.json(
      { error: 'Server error fetching top products' },
      { status: 500 }
    );
  }
}
