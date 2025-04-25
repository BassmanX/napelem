// src/app/api/racks/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authOptions'; // Igazítsd az útvonalat!

const prisma = new PrismaClient();

export async function GET(request: Request) {
  // --- Session és Jogosultság Ellenőrzés (Raktárvezető vagy Raktáros is láthatja?) ---
  const session = await getServerSession(authOptions);
  // Itt döntsd el, ki kérdezheti le a rekeszeket (lehet Raktáros is?)
  if (!session || (session.user?.role !== 'raktarvezeto' && session.user?.role !== 'raktaros')) {
     return NextResponse.json({ message: 'Hozzáférés megtagadva.' }, { status: 403 });
  }
  // -----------------------------------------

  try {
    const racks = await prisma.rack.findMany({
      orderBy: [ // Rendezés sor, oszlop, szint szerint
        { row: 'asc' },
        { column: 'asc' },
        { level: 'asc' },
      ],
      select: { // Csak az ID és az azonosításhoz szükséges mezők kellenek a dropdownhoz
        id: true,
        row: true,
        column: true,
        level: true,
        // maxCapacity? Opcionálisan ki lehet írni a dropdownban
      }
    });
    return NextResponse.json(racks);
  } catch (error) {
    console.error("Hiba a rekeszek API lekérdezésekor:", error);
    return NextResponse.json({ message: 'Szerverhiba történt a rekeszek lekérdezése közben.' }, { status: 500 });
  }
}