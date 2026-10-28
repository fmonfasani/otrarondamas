import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const jwt = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!jwt) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = params;

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8600'}/carrito/${id}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to remove item from cart' },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Carrito delete API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
