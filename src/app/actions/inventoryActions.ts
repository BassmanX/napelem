// src/app/actions/inventoryActions.ts
'use server';

import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
// ... Session importok ...

const prisma = new PrismaClient();

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