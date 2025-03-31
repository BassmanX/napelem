import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';


const prisma = new PrismaClient();

export async function GET() {
  try {
    const projects = await prisma.user.findMany();
    return NextResponse.json(projects);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  const { username, password } = await request.json();

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (user && await bcrypt.compare(password, user.password)) {
      return NextResponse.json({ message: 'Sikeres bejelentkezés!' });
    } else {
      return NextResponse.json({ error: 'Hibás felhasználónév vagy jelszó!' }, { status: 401 });
    }
  } catch (error) {
    console.error('Hiba a bejelentkezés során:', error);
    return NextResponse.json({ error: 'Hiba a bejelentkezés során!' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}