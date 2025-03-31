import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';


const prisma = new PrismaClient();

export async function POST(request) {
  const { username, password } = await request.json();

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (user && await bcrypt.compare(password, user.password)) {
      return NextResponse.json({ message: 'Sikeres bejelentkezés!' });
    } else {
      return NextResponse.json({ error: user.password }, { status: 401 });
    }
  } catch (error) {
    console.error('Hiba a bejelentkezés során:', error);
    return NextResponse.json({ error: 'Hiba a bejelentkezés során!' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}