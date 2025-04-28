// src/app/api/components/status/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authOptions'; // Igazítsd az útvonalat!

const prisma = new PrismaClient();

// Típus az API válaszhoz
export type ComponentStatusData = {
    id: number;
    name: string;
    price: string; // Ár stringként
    maxQuantityPerRack: number;
    totalStock: number; // Teljes raktárkészlet
    reservedStock: number; // Projektekhez rendelt (foglalt)
    availableStock: number; // Elérhető = total - reserved
};

export async function GET(request: Request) {
  // --- Session és Jogosultság Ellenőrzés (Szakember vagy Raktárvezető?) ---
  const session = await getServerSession(authOptions);
   // Ki láthatja ezt a listát?
  if (!session || (session.user?.role !== 'szakember' && session.user?.role !== 'raktarvezeto')) {
     return NextResponse.json({ message: 'Hozzáférés megtagadva.' }, { status: 403 });
  }
  // -----------------------------------------

  try {
    // 1. Lekérdezzük az összes komponenst az alap adatokkal
    const components = await prisma.component.findMany({
        select: {
            id: true,
            name: true,
            price: true,
            maxQuantityPerRack: true,
        },
        orderBy: { name: 'asc' }
    });

    // 2. Lekérdezzük az összesített készleteket komponensenként
    const inventorySums = await prisma.inventoryItem.groupBy({
        by: ['componentId'],
        _sum: {
            quantity: true,
        },
    });
    // Átalakítás Map-be a könnyebb kereséshez: { componentId: totalQuantity }
    const totalStockMap = new Map(inventorySums.map(item => [item.componentId, item._sum.quantity ?? 0]));

    // 3. Lekérdezzük az összesített foglalt mennyiségeket komponensenként
    // FIGYELEM: Itt a logika attól függ, mit tekintünk "foglaltnak".
    // Most feltételezzük, hogy minden ProjectComponent rekord foglaltnak számít.
    // Ha van 'reserved' mező, akkor where: { reserved: true } kell.
    // Ha a projekt státusza számít, akkor a Project táblát is be kell vonni (bonyolultabb query).
    const reservedSums = await prisma.projectComponent.groupBy({
        by: ['componentId'],
        // where: { reserved: true }, // Ha van ilyen mező és használni akarod
        _sum: {
            quantity: true,
        }
    });
     // Átalakítás Map-be: { componentId: reservedQuantity }
    const reservedStockMap = new Map(reservedSums.map(item => [item.componentId, item._sum.quantity ?? 0]));


    // 4. Kombináljuk az adatokat
    const results: ComponentStatusData[] = components.map(comp => {
        const totalStock = totalStockMap.get(comp.id) ?? 0;
        const reservedStock = reservedStockMap.get(comp.id) ?? 0;
        const availableStock = totalStock - reservedStock;

        return {
            id: comp.id,
            name: comp.name,
            price: comp.price.toString(), // Átalakítás stringgé
            maxQuantityPerRack: comp.maxQuantityPerRack,
            totalStock: totalStock,
            reservedStock: reservedStock,
            availableStock: availableStock < 0 ? 0 : availableStock, // Negatív ne legyen
        };
    });

    return NextResponse.json(results);

  } catch (error) {
    console.error("Hiba az alkatrész státusz API lekérdezésekor:", error);
    return NextResponse.json({ message: 'Szerverhiba történt az alkatrészek állapotának lekérdezése közben.' }, { status: 500 });
  }
}