// src/app/api/projects/[projectId]/picking-list/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authOptions'; // Igazítsd

const prisma = new PrismaClient();

// Típus a komponens helyének leírására
type ComponentLocation = {
    rackId: number;
    row: number;
    column: number;
    level: number;
    quantityInRack: number; // Mennyi van ebben a konkrét rekeszben
};

// Típus az API válasz egy eleméhez
export type PickingListItem = {
    componentId: number;
    componentName: string;
    requiredQuantity: number; // Mennyi kell a projekthez
    locations: ComponentLocation[]; // Hol található meg és mennyi
};

interface RouteParams {
    params: { projectId: string };
}

export async function GET(request: NextRequest) {
  // --- Session és Jogosultság Ellenőrzés (Raktáros) ---
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'raktaros') {
     return NextResponse.json({ message: 'Hozzáférés megtagadva.' }, { status: 403 });
  }
  // --- Projekt ID Kinyerése az URL-ből ---
  const pathname = request.nextUrl.pathname; // Pl.: /api/projects/123/picking-list
  const segments = pathname.split('/'); // ['','api','projects','123','picking-list']
  const projectIdIndex = segments.findIndex(seg => seg === 'projects') + 1;
  let projectIdString: string | undefined = undefined;

  // Ellenőrizzük, hogy a struktúra megfelelő-e és van-e ID
  // Most a 'picking-list' szegmenst keressük az ID után
  if (projectIdIndex > 0 && projectIdIndex < segments.length && segments[projectIdIndex + 1] === 'picking-list') {
      projectIdString = segments[projectIdIndex];
  }

  if (!projectIdString) {
       console.error("Nem sikerült kiolvasni a projectId-t a pathname-ből:", pathname);
       return NextResponse.json({ message: 'Nem sikerült kiolvasni a projekt ID-t az URL-ből.' }, { status: 400 });
  }

  const projectIdNum = parseInt(projectIdString, 10);

  if (isNaN(projectIdNum)) {
      return NextResponse.json({ message: 'Érvénytelen projekt ID az URL-ben.' }, { status: 400 });
  }

  try {
    // 1. Lekérdezzük a projekthez szükséges komponenseket és mennyiségeket
    const requiredComponents = await prisma.projectComponent.findMany({
        where: { projectId: projectIdNum },
        select: {
            quantity: true, // requiredQuantity
            component: {
                select: { id: true, name: true }
            }
        }
    });

    if (requiredComponents.length === 0) {
        return NextResponse.json([]); // Nincs mit kivételezni
    }

    // Összegyűjtjük a komponens ID-kat a további lekérdezéshez
    const componentIds = requiredComponents.map(pc => pc.component.id);

    // 2. Lekérdezzük ezen komponensek helyeit és mennyiségeit a raktárban
    const inventoryItems = await prisma.inventoryItem.findMany({
        where: {
            componentId: { in: componentIds },
            quantity: { gt: 0 } // Csak olyan rekeszek érdekelnek, ahol van is az adott alkatrészből
        },
        select: {
            componentId: true,
            quantity: true, // quantityInRack
            rack: { // Kapcsolódó rekesz adatai
                select: {
                    id: true,
                    row: true,
                    column: true,
                    level: true,
                }
            }
        },
        orderBy: [ // Rendezés a logikus bejáráshoz (C.3-hoz is hasznos)
            { rack: { row: 'asc'} },
            { rack: { column: 'asc' } },
            { rack: { level: 'asc' } },
        ]
    });

    // 3. Összefésüljük az adatokat a válaszhoz
    const pickingList: PickingListItem[] = requiredComponents.map(reqComp => {
        // Megkeressük az aktuális komponenshez tartozó összes raktári helyet
        const locations: ComponentLocation[] = inventoryItems
            .filter(item => item.componentId === reqComp.component.id)
            .map(item => ({
                rackId: item.rack.id,
                row: item.rack.row,
                column: item.rack.column,
                level: item.rack.level,
                quantityInRack: item.quantity,
            }));

        return {
            componentId: reqComp.component.id,
            componentName: reqComp.component.name,
            requiredQuantity: reqComp.quantity,
            locations: locations,
        };
    });

    return NextResponse.json(pickingList);

  } catch (error) {
    console.error(`Hiba a(z) ${projectIdNum} projekt kivételezési listájának API lekérdezésekor:`, error);
    return NextResponse.json({ message: 'Szerverhiba történt a kivételezési lista lekérdezése közben.' }, { status: 500 });
  }
}