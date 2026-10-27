import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { empresaId } = await request.json();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8600';

    const response = await fetch(`${apiUrl}/auth/switch-empresa/${empresaId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      token: data.accessToken,
      empresas: data.empresas || [],
      empresaId: data.empresaId,
    });
  } catch (error: any) {
    console.error('Switch empresa proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Switch empresa failed' },
      { status: 500 }
    );
  }
}
