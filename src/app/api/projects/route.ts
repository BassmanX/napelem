// src/app/api/projects/route.ts
import { NextResponse, NextRequest } from 'next/server';
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

export async function GET(request: NextRequest) { // NextRequest használata
  // --- Session és Jogosultság Ellenőrzés ---
  const session = await getServerSession(authOptions);
  // Itt már a raktárost is hozzáadjuk, mivel ő is lekérdezhet (szűrve)
  if (!session || !['szakember', 'raktarvezeto', 'raktaros'].includes(session.user?.role ?? '')) {
     return NextResponse.json({ message: 'Hozzáférés megtagadva.' }, { status: 403 });
  }
  // -----------------------------------------

  // --- ÚJ: Státusz szűrő paraméter kiolvasása ---
   const url = new URL(request.url);
   const statusParam = url.searchParams.get('status'); // pl. ?status=scheduled
   let statusFilter: Status | undefined = undefined;
   // Validáljuk, hogy a kapott string létezik-e a Status enumban
   if (statusParam && Object.values(Status).includes(statusParam as Status)) {
       statusFilter = statusParam as Status;
   }
   // ---------------------------------------------

   try {
    const projects = await prisma.project.findMany({
      // --- ÚJ: Where feltétel kiegészítése a szűrővel ---
      where: {
          // Csak akkor szűrünk státuszra, ha a paraméter meg volt adva és érvényes
          status: statusFilter ? statusFilter : undefined,
      },
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