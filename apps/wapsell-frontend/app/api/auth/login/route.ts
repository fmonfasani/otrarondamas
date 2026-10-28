import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8600';

    const response = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const data = await response.json();

    // Extract token and empresa data from backend response
    return NextResponse.json({
      token: data.accessToken,
      empresas: data.empresas || [],
      empresaId: data.empresaId,
      usuario: data.usuario,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Login failed';
    console.error('Login proxy error:', error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
