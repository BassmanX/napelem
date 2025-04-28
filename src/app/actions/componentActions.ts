// src/app/actions/componentActions.ts
'use server';

// --- MEGLÉVŐ IMPORT-ok (egészítsd ki, ha kell) ---
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
// Session importok...
// import { authOptions } from '@/app/lib/authOptions';
// import { getServerSession } from 'next-auth/next';

const prisma = new PrismaClient();

// --- Átnevezett/Bővített Zod Séma ---
const UpdateComponentSchema = z.object({
  id: z.coerce.number().int().positive(),
  price: z.coerce.number().positive({ message: "Az ár csak pozitív szám lehet." })
          .transform(val => new Prisma.Decimal(val)),
  // Új mező validálása:
  maxQuantityPerRack: z.coerce.number().int().positive({ message: "A max. mennyiség pozitív egész szám kell legyen." }),
});

const ComponentSchema = z.object({
    name: z.string().min(1, { message: "A név megadása kötelező." }),
    price: z.coerce.number().positive({ message: "Az ár csak pozitív szám lehet." })
            .transform(val => new Prisma.Decimal(val)),
    maxQuantityPerRack: z.coerce.number().int().positive({ message: "A maximális mennyiség csak pozitív egész szám lehet." }),
});

export type FormState = {
    message: string;
    errors?: {
        name?: string[];
        price?: string[];
        maxQuantityPerRack?: string[];
    };
} | undefined;

// --- ÚJ Zod Séma az Ár Frissítéshez ---
const UpdatePriceSchema = z.object({
  id: z.coerce.number().int().positive(), // Alkatrész ID
  price: z.coerce.number().positive({ message: "Az ár csak pozitív szám lehet." })
          .transform(val => new Prisma.Decimal(val)), // Átalakítás Prisma Decimal-ra
});

// --- Átnevezett/Bővített State Típus ---
export type UpdateComponentFormState = {
    message: string;
    componentId?: number;
    success?: boolean;
    errors?: {
        price?: string[];
        maxQuantityPerRack?: string[]; // Hiba az új mezőhöz
    };
} | undefined;


// --- MEGLÉVŐ createComponent FÜGGVÉNY ---
export async function createComponent(prevState: FormState, formData: FormData): Promise<FormState> {
    // ... (Jogosultságellenőrzés placeholder) ...
    console.warn("Figyelem: Jogosultságellenőrzés kihagyva a createComponent action-ben!");

    // 1. Adatok validálása
    const validatedFields = ComponentSchema.safeParse({
        name: formData.get('name'),
        price: formData.get('price'),
        maxQuantityPerRack: formData.get('maxQuantityPerRack'),
    });

    // 2. Ha a validáció sikertelen
    if (!validatedFields.success) {
        console.error("Validálási hiba:", validatedFields.error.flatten().fieldErrors);
        return {
            message: 'Hiba: Kérjük, javítsa a megadott adatokat.',
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    // ----> EZ AZ ÚJ RÉSZ <----
    // Itt már tudjuk, hogy success === true.
    // Rendeljük hozzá az adatot egy új, dedikált változóhoz.
    const dataToCreate = validatedFields.data;
    // -----------------------

    // 3. Adatbázis művelet
    try {
        await prisma.component.create({
            // ----> HASZNÁLD AZ ÚJ VÁLTOZÓT ITT <----
            data: dataToCreate,
            // -------------------------------------
        });
    } catch (error) {
        // ... (Hibakezelés változatlan) ...
         console.error("Adatbázis hiba:", error);
         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
              return { message: 'Hiba: Már létezik komponens ezzel a névvel.', errors: { name: ['Ez a név már foglalt.'] } };
         }
         return { message: 'Adatbázis hiba: Nem sikerült létrehozni az alkatrészt.' };
    }

    // 4. Sikeres létrehozás utáni teendők
    // ... (revalidatePath, redirect változatlan) ...
    try {
        revalidatePath('/raktarvezeto/alkatreszek');
    } catch (error) {
        console.error("Hiba a revalidatePath során:", error);
    }
    redirect('/pages/dashboard');

}


export async function updateComponentDetails(prevState: UpdateComponentFormState, formData: FormData): Promise<UpdateComponentFormState> {
    console.log("updateComponentDetails action elindult");

    // --- Jogosultság Ellenőrzés (Raktárvezető) ---
    console.warn("Figyelem: Jogosultságellenőrzés kihagyva az updateComponentDetails action-ben!");
    // Implementáld!
    // --------------------------------------------

    const componentId = parseInt(formData.get('componentId') as string, 10);

    // Adatok validálása a bővített sémával
    const validatedFields = UpdateComponentSchema.safeParse({
        id: componentId,
        price: formData.get('price'),
        maxQuantityPerRack: formData.get('maxQuantityPerRack'), // Új mező olvasása
    });

    if (!validatedFields.success) {
        console.error("Komponens frissítés validálási hiba:", validatedFields.error.flatten().fieldErrors);
        return {
            message: `Hiba: Kérjük, javítsa az adatokat.`,
            componentId: componentId,
            success: false,
            errors: validatedFields.error.flatten().fieldErrors, // Tartalmazhatja a maxQuantity hibát is
        };
    }

    // Adatbázis frissítés (mindkét mezővel)
    try {
        await prisma.component.update({
            where: { id: validatedFields.data.id },
            data: {
                price: validatedFields.data.price,
                maxQuantityPerRack: validatedFields.data.maxQuantityPerRack, // Új mező frissítése
            },
        });
        console.log(`Alkatrész (ID: ${componentId}) adatainak frissítése sikeres.`);

    } catch (error) {
        console.error(`Adatbázis hiba frissítéskor (ID: ${componentId}):`, error);
        return {
            message: `Adatbázis hiba: Nem sikerült frissíteni az adatokat.`,
            componentId: componentId,
            success: false,
        };
    }

    // Cache invalidálása
    revalidatePath('/raktarvezeto/alkatresz/arak'); // Az árkezelő oldal (ahol a lista van)

    // Sikeres válasz
    return {
        message: `Adatok sikeresen frissítve!`,
        componentId: componentId,
        success: true,
     };
}
// --------------------------------------------