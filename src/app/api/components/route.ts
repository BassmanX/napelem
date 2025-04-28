// src/app/api/components/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
// Importáld az authOptions-t a session megszerzéséhez és jogosultságellenőrzéshez
import { authOptions } from '@/app/lib/authOptions'; // Igazítsd az útvonalat!

const prisma = new PrismaClient();

export async function GET(request: Request) {
  // --- Session és Jogosultság Ellenőrzés ---
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'raktarvezeto') {
     // Ha nincs session vagy nem raktárvezető, megtagadjuk a hozzáférést
     return NextResponse.json({ message: 'Hozzáférés megtagadva.' }, { status: 403 });
  }
  // -----------------------------------------

  try {
    const components = await prisma.component.findMany({
      orderBy: { name: 'asc' },
      select: { // Csak a szükséges mezőket kérjük le
        id: true,
        name: true,
        price: true,
        maxQuantityPerRack: true,
      }
    });

    // A Decimal típusokat stringgé kell konvertálni a JSON szerializálhatósághoz
    const componentsWithStringPrice = components.map(comp => ({
        ...comp,
        price: comp.price.toString(),
    }));


    return NextResponse.json(componentsWithStringPrice);
  } catch (error) {
    console.error("Hiba az alkatrészek API lekérdezésekor:", error);
    return NextResponse.json({ message: 'Szerverhiba történt az alkatrészek lekérdezése közben.' }, { status: 500 });
  }
  
}