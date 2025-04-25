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

// --- MEGLÉVŐ Zod Séma és Típusok ---
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

// --- ÚJ State Típus az Ár Frissítéshez ---
export type UpdatePriceFormState = {
    message: string;
    componentId?: number;
    success?: boolean;
    errors?: {
        price?: string[];
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
    redirect('/raktarvezeto/dashboard');

}


// --- ÚJ FÜGGVÉNY: updateComponentPrice ---
// FONTOS: Az 'export' kulcsszó kell elé!
export async function updateComponentPrice(prevState: UpdatePriceFormState, formData: FormData): Promise<UpdatePriceFormState> {
    console.log("updateComponentPrice action elindult");

    // --- Jogosultság Ellenőrzés (FONTOS!) ---
    // Implementáld a Raktárvezető szerepkör ellenőrzését itt is!
    // const session = await getServerSession(authOptions);
    // if (session?.user?.role !== 'raktarvezeto') {
    //    return { message: 'Hiba: Nincs jogosultsága ehhez a művelethez.', success: false };
    // }
    console.warn("Figyelem: Jogosultságellenőrzés kihagyva az updateComponentPrice action-ben!");

    // FormData feldolgozása és validálása
    const componentId = parseInt(formData.get('componentId') as string, 10);
    const validatedFields = UpdatePriceSchema.safeParse({
        id: componentId,
        price: formData.get('price'),
    });

    if (!validatedFields.success) {
        console.error("Árfrissítés validálási hiba:", validatedFields.error.flatten().fieldErrors);
        return {
            message: `Hiba: Kérjük, javítsa az árat.`, // Általános validációs hibaüzenet
            componentId: componentId, // Adjunk kontextust, melyik sornál volt a hiba
            success: false,
            errors: validatedFields.error.flatten().fieldErrors, // Részletes mezőhibák
        };
    }

    // Adatbázis frissítés
    try {
        await prisma.component.update({
            where: { id: validatedFields.data.id },
            data: {
                price: validatedFields.data.price,
            },
        });
        console.log(`Alkatrész (ID: ${componentId}) árának frissítése sikeres.`);

    } catch (error) {
        console.error(`Adatbázis hiba az ár frissítésekor (ID: ${componentId}):`, error);
        return {
            message: `Adatbázis hiba: Nem sikerült frissíteni az árat.`,
            componentId: componentId,
            success: false,
        };
    }

    // Cache invalidálása
    revalidatePath('/raktarvezeto/alkatresz/arak'); // Az árkezelő oldal cache-ének invalidálása

    // Sikeres válasz visszaküldése a formnak
    return {
        message: `Ár sikeresen frissítve!`,
        componentId: componentId,
        success: true,
     };
}
// --------------------------------------------