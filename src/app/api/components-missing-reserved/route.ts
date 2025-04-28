// src/app/api/components/missing-reserved/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authOptions'; // Igazítsd az útvonalat!

const prisma = new PrismaClient();

// Ugyanaz a válasz típus, mint a B.3-nál
export type MissingComponentData = {
    id: number;
    name: string;
    totalStock: number;
    reservedStock: number;
    availableStock: number;
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
    if (allComponents.length === 0) return NextResponse.json([]);

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

    // 4. Szűrés a hiányzó ÉS foglalt alkatrészekre
    const missingReservedComponents: MissingComponentData[] = [];
    for (const comp of allComponents) {
        const totalStock = totalStockMap.get(comp.id) ?? 0;
        const reservedStock = reservedStockMap.get(comp.id) ?? 0;
        const availableStock = totalStock - reservedStock;

        // ---> A SZŰRÉSI FELTÉTEL ITT VÁLTOZIK <---
        if (availableStock <= 0 && reservedStock > 0) { // Hiányzik ÉS van rá foglalás
            missingReservedComponents.push({
                id: comp.id,
                name: comp.name,
                totalStock: totalStock,
                reservedStock: reservedStock,
                availableStock: availableStock,
            });
        }
        // ------------------------------------
    }

    missingReservedComponents.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(missingReservedComponents);

  } catch (error) {
    console.error("Hiba a hiányzó&foglalt API lekérdezésekor:", error);
    return NextResponse.json({ message: 'Szerverhiba történt a lekérdezés közben.' }, { status: 500 });
  }
}