// src/app/api/components/missing/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authOptions'; // Igazítsd az útvonalat!

const prisma = new PrismaClient();

// Típus az API válaszhoz
export type MissingComponentData = {
    id: number;
    name: string;
    totalStock: number;
    reservedStock: number;
    availableStock: number; // Ez lesz <= 0
};

export async function GET(request: Request) {
  // --- Session és Jogosultság Ellenőrzés (Raktárvezető) ---
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'raktarvezeto') {
     return NextResponse.json({ message: 'Hozzáférés megtagadva.' }, { status: 403 });
  }
  // -----------------------------------------

  try {
    // 1. Összes komponens ID és név
    const allComponents = await prisma.component.findMany({
        select: { id: true, name: true },
    });
    if (allComponents.length === 0) return NextResponse.json([]); // Nincs mit ellenőrizni

    // 2. Összesített készletek
    const inventorySums = await prisma.inventoryItem.groupBy({
        by: ['componentId'],
        _sum: { quantity: true },
        where: { componentId: { in: allComponents.map(c => c.id) } } // Optimalizálás: csak releváns ID-kra
    });
    const totalStockMap = new Map(inventorySums.map(item => [item.componentId, item._sum.quantity ?? 0]));

    // 3. Összesített foglalt mennyiségek
    const reservedSums = await prisma.projectComponent.groupBy({
        by: ['componentId'],
        _sum: { quantity: true },
         where: { componentId: { in: allComponents.map(c => c.id) } } // Optimalizálás
        // where: { reserved: true, componentId: { in: allComponents.map(c => c.id) } } // Ha lenne 'reserved' flag
    });
    const reservedStockMap = new Map(reservedSums.map(item => [item.componentId, item._sum.quantity ?? 0]));

    // 4. Szűrés a hiányzó alkatrészekre
    const missingComponents: MissingComponentData[] = [];
    for (const comp of allComponents) {
        const totalStock = totalStockMap.get(comp.id) ?? 0;
        const reservedStock = reservedStockMap.get(comp.id) ?? 0;
        const availableStock = totalStock - reservedStock;

        if (availableStock <= 0) {
            missingComponents.push({
                id: comp.id,
                name: comp.name,
                totalStock: totalStock,
                reservedStock: reservedStock,
                availableStock: availableStock, // Lehet negatív is!
            });
        }
    }

    // Rendezés pl. név szerint
    missingComponents.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(missingComponents);

  } catch (error) {
    console.error("Hiba a hiányzó alkatrészek API lekérdezésekor:", error);
    return NextResponse.json({ message: 'Szerverhiba történt a hiányzó alkatrészek lekérdezése közben.' }, { status: 500 });
  }
}