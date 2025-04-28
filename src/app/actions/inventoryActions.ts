// src/app/actions/inventoryActions.ts
'use server';

import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
// ... Session importok ...

const prisma = new PrismaClient();

// Típus a bemeneti adathoz (melyik komponensből mennyit kell)
type PickedItemInput = {
    componentId: number;
    quantity: number;
};

// State típus
export type CompletePickingState = {
    message: string;
    success: boolean;
    error?: string; // Részletesebb hiba
} | undefined;

// Server Action a kivételezés befejezéséhez
export async function completePicking(
    projectId: number,
    // A komponens listát kapjuk, amit ki kellett venni
    itemsToPick: PickedItemInput[]
): Promise<CompletePickingState> {
    console.log(`completePicking action elindult (Projekt ID: ${projectId})`);

    // --- Jogosultság Ellenőrzés (Raktáros) ---
    console.warn("Figyelem: Jogosultságellenőrzés kihagyva a completePicking action-ben!");
    // Implementáld!
    // --------------------------------------

    if (!projectId || !itemsToPick || itemsToPick.length === 0) {
        return { success: false, message: "Hiányzó projekt ID vagy kivételezendő tételek." };
    }

    // Komponens ID-k listája a későbbi adatb törléshez
    const componentIdsInPick = itemsToPick.map(item => item.componentId);

    try {
        await prisma.$transaction(async (tx) => {
            console.log(`Tranzakció indítva a ${projectId} kivételezéséhez.`);

            // Végigmegyünk minden kivételezendő alkatrészen
            for (const item of itemsToPick) {
                let quantityToDecrement = item.quantity; // Ennyit kell még összesen kivenni ebből az alkatrészből
                const componentId = item.componentId;

                console.log(`Feldolgozás: Komponens ID ${componentId}, Szükséges: ${quantityToDecrement} db`);

                // Lekérdezzük azokat a rekeszeket, ahol van ebből az alkatrészből,
                // rendezve (pl. hogy logikus sorrendben próbáljuk kivenni)
                const locations = await tx.inventoryItem.findMany({
                    where: {
                        componentId: componentId,
                        quantity: { gt: 0 } // Csak ahol van készlet
                    },
                    select: {
                        rackId: true,
                        quantity: true
                    },
                    orderBy: { rackId: 'asc' } // Vagy más rendezés
                });

                if (locations.length === 0 && quantityToDecrement > 0) {
                     throw new Error(`Nincs elérhető készlet a(z) ${componentId} ID-jű komponenshez.`);
                }

                console.log(`  Talált lokációk (${componentId}):`, locations);

                // Végigmegyünk a lokációkon és csökkentjük a készletet
                for (const loc of locations) {
                    if (quantityToDecrement <= 0) break; // Már megvan a szükséges mennyiség

                    const canTakeFromHere = Math.min(loc.quantity, quantityToDecrement); // Ennyit tudunk kivenni innen

                    console.log(`  Rekesz ID ${loc.rackId}: Van ${loc.quantity} db, kiveszünk ${canTakeFromHere} db-ot.`);

                    // Készlet csökkentése ebben a rekeszben
                    await tx.inventoryItem.update({
                        where: {
                            componentId_rackId: {
                                componentId: componentId,
                                rackId: loc.rackId
                            }
                        },
                        data: {
                            quantity: {
                                decrement: canTakeFromHere
                            }
                        }
                    });

                    quantityToDecrement -= canTakeFromHere; // Csökkentjük a még szükséges mennyiséget
                }

                // Ellenőrzés a ciklus végén: Sikerült-e mindent kivenni?
                if (quantityToDecrement > 0) {
                    // Ez akkor fordulhat elő, ha a lekérdezés és a kivétel között elfogyott a készlet (versenyhelyzet)
                    // vagy ha az API lekérdezés (C.2) és ez a logika nincs összhangban.
                    console.error(`Készlethiba a(z) ${componentId} komponensnél! Hiányzik még ${quantityToDecrement} db.`);
                    throw new Error(`Nem sikerült elegendő mennyiséget (${item.quantity} db) kivenni a(z) ${componentId} ID-jű komponensből.`);
                }
                 console.log(`  Komponens ${componentId} kivételezése kész.`);
            } // for (item of itemsToPick) vége

            // ---> 2. NULLA VAGY KEVESEBB MENNYISÉGŰ SOROK TÖRLÉSE <---
            console.log(`Nulla/negatív mennyiségű InventoryItem rekordok törlése a pickelt komponensekhez...`);
            const deletedItemsResult = await tx.inventoryItem.deleteMany({
                where: {
                    // Csak azokat töröljük, amik ebben a pickelésben érintettek voltak
                    componentId: { in: componentIdsInPick },
                    // ÉS a mennyiségük 0 vagy kevesebb lett
                    quantity: { lte: 0 } // lte = Less Than or Equal to
                }
            });
            console.log(`  ${deletedItemsResult.count} db 0 mennyiségű InventoryItem rekord törölve.`);
            
            // ---------------------------------------------------------
            // Ha minden alkatrész készletének csökkentése sikeres volt,
            // töröljük a foglalásokat (ProjectComponent rekordokat) ehhez a projekthez.
            console.log(`Foglalások törlése a ${projectId} projekthez...`);
            const deleteResult = await tx.projectComponent.deleteMany({
                where: { projectId: projectId }
            });
            console.log(`  ${deleteResult.count} foglalás törölve.`);

        }); // Tranzakció vége

        console.log(`Projekt (ID: ${projectId}) kivételezése sikeresen befejezve.`);

    } catch (error: any) {
        console.error(`Adatbázis hiba kivételezés befejezésekor (Projekt ID: ${projectId}):`, error);
        return { message: error.message || 'Adatbázis hiba: Nem sikerült befejezni a kivételezést.', success: false, error: error.message };
    }

    // Sikeres művelet után cache invalidálása
    revalidatePath('/raktaros/dashboard'); // Raktáros nézet
    revalidatePath(`/api/projects/${projectId}/picking-list`); // Az adott projekt listája
    revalidatePath('/api/components/missing'); // Hiányzó komponensek listája változhatott
    revalidatePath('/api/components/missing-reserved');
    revalidatePath('/api/components/status');


    return { message: 'Kivételezés sikeresen befejezve, készlet frissítve, foglalások törölve!', success: true };
}

// Módosított Zod séma: row, column, level kell, nem rackId
const ReceiveStockSchema = z.object({
  componentId: z.coerce.number().int().positive(),
  // rackId helyett:
  row: z.coerce.number().int().positive(),
  column: z.coerce.number().int().positive(),
  level: z.coerce.number().int().positive(),
  // ---
  quantity: z.coerce.number().int().positive({ message: "A mennyiség csak pozitív egész szám lehet." }),
});

// State típus maradhat, de az errors kulcsai változhatnak
export type ReceiveStockFormState = {
    message: string;
    success?: boolean;
    errors?: {
        componentId?: string[];
        row?: string[]; // Hozzáadva
        column?: string[]; // Hozzáadva
        level?: string[]; // Hozzáadva
        quantity?: string[];
        general?: string[];
    };
} | undefined;

// Módosított Server Action
export async function receiveStock(prevState: ReceiveStockFormState, formData: FormData): Promise<ReceiveStockFormState> {
    // --- Jogosultság Ellenőrzés ---
    console.warn("Figyelem: Jogosultságellenőrzés kihagyva a receiveStock action-ben!");
    // Implementáld!
    // ---------------------------

    // 1. Validálás (módosított sémával)
    const validatedFields = ReceiveStockSchema.safeParse({
        componentId: formData.get('componentId'),
        row: formData.get('row'),
        column: formData.get('column'),
        level: formData.get('level'),
        quantity: formData.get('quantity'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Hiba: Érvénytelen adatok.',
            success: false,
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    const { componentId, row, column, level, quantity: receivedQuantity } = validatedFields.data;

    try {
        // 2. Rekesz ID keresése a row, column, level alapján
        const rack = await prisma.rack.findFirst({
            where: {
                row: row,
                column: column,
                level: level,
            },
            select: { id: true } // Csak az ID kell
        });

        if (!rack) {
            // Nem található ilyen rekesz az adatbázisban
             return {
                 message: `Hiba: Nem található rekesz a ${row}. sor, ${column}. oszlop, ${level}. szint kombinációval.`,
                 success: false,
                 errors: { general: ["A megadott rekesz nem létezik."] }
             };
        }
        const rackId = rack.id; // Megvan a szükséges rackId

        // 3. Komponens limitjének lekérdezése
        const component = await prisma.component.findUnique({
            where: { id: componentId },
            select: { maxQuantityPerRack: true, name: true }
        });

        if (!component) {
             return { message: `Hiba: A(z) ${componentId} ID-jű komponens nem található.`, success: false };
        }
        const maxQuantityPerRack = component.maxQuantityPerRack;

        // 4. Adatbázis művelet tranzakcióban (kapacitásellenőrzés és upsert)
        const result = await prisma.$transaction(async (tx) => {
            const existingItem = await tx.inventoryItem.findUnique({
                where: { componentId_rackId: { componentId, rackId } }, // A MEGTALÁLT rackId-val!
                select: { quantity: true }
            });
            const currentQuantity = existingItem?.quantity ?? 0;
            const newTotalQuantity = currentQuantity + receivedQuantity;

            if (newTotalQuantity > maxQuantityPerRack) {
                throw new Error(`A(z) "${component.name}" (${newTotalQuantity} db) meghaladná a rekesz (${row}-${column}-${level}) max. kapacitását (${maxQuantityPerRack} db). Jelenleg ${currentQuantity} db van ott.`);
            }

            await tx.inventoryItem.upsert({
                where: { componentId_rackId: { componentId, rackId } }, // A MEGTALÁLT rackId-val!
                update: { quantity: newTotalQuantity },
                create: { componentId, rackId, quantity: receivedQuantity }, // A MEGTALÁLT rackId-val!
            });
            return { success: true };
        });

        // 5. Sikeres válasz
        if (result.success) {
            revalidatePath('/raktarvezeto/keszlet');
            revalidatePath('/raktarvezeto/rekeszek');
            return { message: 'Bevételezés sikeres!', success: true };
        }
         return { message: 'Ismeretlen hiba a tranzakció során.', success: false };

    } catch (error: any) {
        console.error("Hiba a bevételezés során:", error);
        if (error.message.includes("meghaladná a rekesz")) {
             return { message: error.message, success: false, errors: { general: [error.message] } };
        }
        return { message: 'Adatbázis hiba: A bevételezés nem sikerült.', success: false };
    }
}