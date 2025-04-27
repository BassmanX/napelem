// src/app/api/projects/[projectId]/components/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authOptions'; // Igazítsd az útvonalat!

const prisma = new PrismaClient();

// Típus az API válaszhoz
export type AssignedComponentData = {
    componentId: number;
    componentName: string;
    quantity: number;
    // Esetleg reserved status, ha van a ProjectComponent modellen
};

// Dinamikus útvonal paraméterének típusa
interface RouteParams {
    params: { projectId: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  // --- Session és Jogosultság Ellenőrzés ---
  const session = await getServerSession(authOptions);
  // Ki láthatja? Szakember, Raktárvezető? Esetleg Raktáros (C.2)?
  if (!session || !['szakember', 'raktarvezeto', 'raktaros'].includes(session.user?.role ?? '')) {
     return NextResponse.json({ message: 'Hozzáférés megtagadva.' }, { status: 403 });
  }
  // -----------------------------------------

  const projectId = parseInt(params.projectId, 10);

  if (isNaN(projectId)) {
      return NextResponse.json({ message: 'Érvénytelen projekt ID.' }, { status: 400 });
  }

  try {
    const projectComponents = await prisma.projectComponent.findMany({
        where: {
            projectId: projectId,
        },
        select: {
            quantity: true,
            component: { // Kapcsolódó komponens adatainak betöltése
                select: {
                    id: true,
                    name: true,
                }
            }
            // reserved: true, // Ha van ilyen mező és kell
        },
        orderBy: {
            component: { name: 'asc' } // Komponens név szerint rendezve
        }
    });

    // Adatok átalakítása a kívánt formátumra
    const results: AssignedComponentData[] = projectComponents.map(pc => ({
        componentId: pc.component.id,
        componentName: pc.component.name,
        quantity: pc.quantity,
        // reserved: pc.reserved // Ha van
    }));

    return NextResponse.json(results);

  } catch (error) {
    console.error(`Hiba a(z) ${projectId} projekt komponenseinek API lekérdezésekor:`, error);
    return NextResponse.json({ message: 'Szerverhiba történt a komponensek lekérdezése közben.' }, { status: 500 });
  }
}