// src/app/api/projects/[projectId]/details/route.ts
import { NextResponse, NextRequest } from 'next/server';
import { PrismaClient, Status, ProjectLog } from '@prisma/client'; // Kell a ProjectLog is
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/authOptions';

const prisma = new PrismaClient();

// Típus a hozzárendelt komponensekhez
export type AssignedComponentData = {
    componentId: number;
    componentName: string;
    quantity: number;
};

// Típus a státuszlog bejegyzéshez (örökölhet a Prisma típust)
type StatusHistoryEntry = Pick<ProjectLog, 'status' | 'timestamp'>;

// Típus a teljes API válaszhoz
export type ProjectDetailsData = {
    assignedComponents: AssignedComponentData[];
    statusHistory: StatusHistoryEntry[];
};

interface RouteParams {
    params: { projectId: string };
}

export async function GET(request: NextRequest) { // Csak a request paramétert vesszük át

    // Session ellenőrzés (változatlan)
    const session = await getServerSession(authOptions);
    if (!session || !['szakember', 'raktarvezeto', 'raktaros'].includes(session.user?.role ?? '')) {
       return NextResponse.json({ message: 'Hozzáférés megtagadva.' }, { status: 403 });
    }
  
    // Projekt ID kinyerése az URL-ből
    const pathname = request.nextUrl.pathname; // Pl.: /api/projects/123/details
    const segments = pathname.split('/'); // ['','api','projects','123','details']
  
    // Keressük meg a 'projects' utáni és a 'details' előtti szegmenst
    const projectIdIndex = segments.findIndex(seg => seg === 'projects') + 1;
    let projectIdString: string | undefined = undefined;
  
    // Ellenőrizzük, hogy a struktúra megfelelő-e és van-e ID
    if (projectIdIndex > 0 && projectIdIndex < segments.length && segments[projectIdIndex + 1] === 'details') {
        projectIdString = segments[projectIdIndex];
    }
  
    if (!projectIdString) {
         console.error("Nem sikerült kiolvasni a projectId-t a pathname-ből:", pathname);
         return NextResponse.json({ message: 'Nem sikerült kiolvasni a projekt ID-t az URL-ből.' }, { status: 400 });
    }
  
    // projectIdString konvertálása számmá
    const projectIdNum = parseInt(projectIdString, 10);
  
    if (isNaN(projectIdNum)) {
        return NextResponse.json({ message: 'Érvénytelen projekt ID az URL-ben.' }, { status: 400 });
    }

  try {
    // Párhuzamos lekérdezés a komponensekre és a logokra
    const [projectComponents, statusHistory] = await Promise.all([
        // Hozzárendelt komponensek lekérdezése
        prisma.projectComponent.findMany({
            where: { projectId: projectIdNum },
            select: {
                quantity: true,
                component: { select: { id: true, name: true } }
            },
            orderBy: { component: { name: 'asc' } }
        }),
        // Státuszlogok lekérdezése
        prisma.projectLog.findMany({
            where: { projectId: projectIdNum },
            select: { // Csak a státusz és időbélyeg kell
                status: true,
                timestamp: true,
            },
            orderBy: { timestamp: 'asc' } // Időrendben
        })
    ]);

    // Komponens adatok átalakítása
    const assignedComponents: AssignedComponentData[] = projectComponents.map(pc => ({
        componentId: pc.component.id,
        componentName: pc.component.name,
        quantity: pc.quantity,
    }));

    // A válasz objektum összeállítása
    const results: ProjectDetailsData = {
        assignedComponents,
        statusHistory // A logokat nem kell átalakítani, ha a select jó
    };

    return NextResponse.json(results);

  } catch (error) { console.error("Hiba a calculateProjectCost hívása közben:", error); }
}