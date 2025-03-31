import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authOptions';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Nincs bejelentkezve' }, { status: 401 });
  }

  return NextResponse.json({
    username: session.user.username,
    role: session.user.role,
  });
}