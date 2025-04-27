// src/app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, Status } from '@prisma/client'; // Status enum is kellhet a típushoz
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authOptions'; // Igazítsd az útvonalat!

const prisma = new PrismaClient();

// Típus az API válaszhoz (ugyanaz, mint amit a kliensen használunk)
export type ProjectListData = {
    id: number;
    customerName: string;
    location: string;
    status: Status;
    description: string;
};

export async function GET(request: Request) {
  // --- Session és Jogosultság Ellenőrzés ---
  const session = await getServerSession(authOptions);
  // Csak szakember vagy raktárvezető láthatja a projekteket? Finomítsd a logikát!
  if (!session || (session.user?.role !== 'szakember' && session.user?.role !== 'raktarvezeto')) {
     return NextResponse.json({ message: 'Hozzáférés megtagadva.' }, { status: 403 });
  }
  // -----------------------------------------

  try {
    const projects = await prisma.project.findMany({
      orderBy: { id: 'desc' },
      select: {
        id: true,
        customerName: true,
        location: true,
        status: true,
        description: true,
      }
    });
    // Itt már nem kell stringgé alakítani a Decimalt, mert nincs a selectben
    return NextResponse.json(projects); // Direktben visszaadjuk
  } catch (error) {
    console.error("Hiba a projektek API lekérdezésekor:", error);
    return NextResponse.json({ message: 'Szerverhiba történt a projektek lekérdezése közben.' }, { status: 500 });
  }
}