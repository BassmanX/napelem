// src/app/api/projects/[projectId]/components/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authOptions'; // Igazítsd az útvonalat!
import { NextRequest } from 'next/server';

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
  
  export async function GET(request: NextRequest, context: { params: Promise<{ projectId: string }> }) {
    const { projectId } = await context.params;
    const projectIdNum = parseInt(projectId, 10);
  
    if (isNaN(projectIdNum)) {
      return NextResponse.json({ message: 'Érvénytelen projekt ID.' }, { status: 400 });
    }

  try {
    const projectComponents = await prisma.projectComponent.findMany({
        where: {
          projectId: projectIdNum,
        },
        select: {
          component: {
            select: {
              id: true,
              name: true,
            },
          },
          quantity: true,
          reserved: true,
        },
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