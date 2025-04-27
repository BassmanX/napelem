// src/app/actions/projectActions.ts
'use server';

import { PrismaClient, Status, Prisma } from '@prisma/client';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation'; // Vagy csak sikeres üzenetet küldünk vissza

const prisma = new PrismaClient();

// Zod séma az új projekt formhoz
const NewProjectSchema = z.object({
  customerName: z.string().min(1, "Megrendelő nevének megadása kötelező."),
  location: z.string().min(1, "Helyszín megadása kölelező."),
  description: z.string().optional(), // Leírás lehet opcionális
});

const EstimateSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  // Opcionálisak és null-t is elfogadunk, de ha van érték, pozitív legyen
  estimatedTime: z.preprocess(
        // Üres stringet null-ra alakítjuk, hogy a Zod optional/nullable kezelje
        (val) => (val === "" ? null : val),
        z.coerce.number().int().positive().optional().nullable()
    ),
  workFee: z.preprocess(
        (val) => (val === "" ? null : val),
        z.coerce.number().positive().optional().nullable()
    )
    .transform(val => (val === null || val === undefined ? null : new Prisma.Decimal(val))), // Csak akkor alakítjuk Decimal-ra, ha nem null
});

export type EstimateFormState = {
    message: string;
    success?: boolean;
    errors?: {
        estimatedTime?: string[];
        workFee?: string[];
        general?: string[];
    };
} | undefined;


// State típus a formhoz
export type NewProjectFormState = {
    message: string;
    success?: boolean;
    errors?: {
        customerName?: string[];
        location?: string[];
        description?: string[];
    };
} | undefined;

// Server Action az új projekt létrehozásához
export async function createProject(prevState: NewProjectFormState, formData: FormData): Promise<NewProjectFormState> {
    // --- Jogosultság Ellenőrzés (Szakember vagy felettes?) ---
    console.warn("Figyelem: Jogosultságellenőrzés kihagyva a createProject action-ben!");
    // Implementáld a Szakember szerepkör ellenőrzését session alapján!
    // -----------------------------------------------------

    // 1. Validálás
    const validatedFields = NewProjectSchema.safeParse({
        customerName: formData.get('customerName'),
        location: formData.get('location'),
        description: formData.get('description'),
    });

    if (!validatedFields.success) {
        return {
            message: 'Hiba: Érvénytelen adatok.',
            success: false,
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }

    // 2. Adatbázis művelet
    try {
        await prisma.project.create({
            data: {
                customerName: validatedFields.data.customerName,
                location: validatedFields.data.location,
                description: validatedFields.data.description || '', // Üres string, ha nincs megadva
                status: Status.new, // Kezdeti státusz: 'new'
                // estimatedTime és workFee kezdetben null/üres
            },
        });
    } catch (error) {
        console.error("Adatbázis hiba projekt létrehozásakor:", error);
        return { message: 'Adatbázis hiba: Nem sikerült létrehozni a projektet.', success: false };
    }

    // 3. Sikeres létrehozás után
    revalidatePath('/szakember/projektek'); // Invalidáljuk a projektlista oldalt (ha van)
    // Visszajelzés vagy átirányítás
    return { message: 'Projekt sikeresen létrehozva!', success: true };
    // Vagy: redirect('/szakember/dashboard'); // Ha vissza akarjuk irányítani
}

// --- ÚJ: Séma és State az alkatrész hozzárendeléshez ---
const AssignComponentItemSchema = z.object({
  componentId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().positive({ message: "A mennyiség pozitív egész szám kell legyen." }),
});

const AssignComponentsSchema = z.object({
  projectId: z.coerce.number().int().positive(),
  components: z.array(AssignComponentItemSchema).min(1, "Legalább egy alkatrészt hozzá kell rendelni."),
});

export type AssignComponentsFormState = {
    message: string;
    success?: boolean;
    errors?: {
        projectId?: string[];
        components?: string[]; // Hiba az egész listára
        general?: string[];
        // Lehetne indexelt hiba is a listaelemekhez, de az bonyolultabb
    };
} | undefined;


// --- ÚJ: Server Action Alkatrészek Hozzárendeléséhez ---
export async function assignComponentsToProject(prevState: AssignComponentsFormState, formData: FormData): Promise<AssignComponentsFormState> {
    console.log("assignComponentsToProject action elindult");
     // --- Jogosultság Ellenőrzés (Szakember) ---
     console.warn("Figyelem: Jogosultságellenőrzés kihagyva az assignComponentsToProject action-ben!");
     // Implementáld!
     // -----------------------------------------

    // Nyers adatok kiolvasása (a komponens lista JSON stringként jön)
    const rawData = {
        projectId: formData.get('projectId'),
        componentsString: formData.get('components'), // JSON string várható
    };

    let componentsArray: { componentId: number; quantity: number }[];
    try {
        // Próbáljuk meg a JSON stringet tömbbé alakítani
        if (typeof rawData.componentsString !== 'string') throw new Error();
        componentsArray = JSON.parse(rawData.componentsString);
        // Egyszerű validáció, hogy tömb és az elemeknek van id/quantity mezője
        if (!Array.isArray(componentsArray) || componentsArray.some(c => typeof c.componentId !== 'number' || typeof c.quantity !== 'number')) {
             throw new Error();
        }
    } catch (e) {
         return { message: "Hiba: Érvénytelen komponens lista formátum.", success: false };
    }


    // 1. Validálás Zod sémával
     const validatedFields = AssignComponentsSchema.safeParse({
         projectId: rawData.projectId,
         components: componentsArray,
     });

     if (!validatedFields.success) {
         console.error("Hozzárendelés validálási hiba:", validatedFields.error.flatten().fieldErrors);
         return {
             message: 'Hiba: Érvénytelen adatok.',
             success: false,
             // A Zod hibákat komplexebb lenne visszaküldeni a dinamikus listához,
             // most csak általános hibát küldünk.
             errors: { general: ["Validálási hiba a komponens listában."] }
         };
     }

     const { projectId, components } = validatedFields.data;

     // 2. Adatbázis műveletek tranzakcióban
     try {
        await prisma.$transaction(async (tx) => {
            // a) Upsert minden komponens hozzárendelést
            for (const item of components) {
                await tx.projectComponent.upsert({
                    where: {
                        projectId_componentId: { // Azonosító a kapcsoló táblában
                           projectId: projectId,
                           componentId: item.componentId,
                        }
                    },
                    update: { // Ha már létezik, frissítjük a mennyiséget
                        quantity: item.quantity,
                        reserved: true, // Legyen foglalt
                    },
                    create: { // Ha nem létezik, létrehozzuk
                        projectId: projectId,
                        componentId: item.componentId,
                        quantity: item.quantity,
                        reserved: true, // Legyen foglalt
                    },
                });
            }

             // b) Projekt státuszának frissítése 'draft'-ra, ha 'new' volt
             await tx.project.updateMany({
                where: {
                    id: projectId,
                    status: Status.new, // Csak akkor frissíts, ha 'new' volt
                },
                data: {
                    status: Status.draft,
                }
             });
        });

         console.log(`Alkatrészek hozzárendelve a ${projectId} projekthez.`);
     } catch (error) {
         console.error(`Adatbázis hiba hozzárendeléskor (Projekt ID: ${projectId}):`, error);
         return { message: 'Adatbázis hiba: Nem sikerült hozzárendelni az alkatrészeket.', success: false };
     }

     // 3. Sikeres művelet után
     revalidatePath(`/szakember/projektek/${projectId}`); // Adott projekt oldalának invalidálása (ha van)
     revalidatePath('/szakember/dashboard'); // Dashboard lista invalidálása

     return { message: 'Alkatrészek sikeresen hozzárendelve!', success: true };
}

// --- ÚJ: Server Action Becslés Rögzítéséhez ---
export async function addProjectEstimate(prevState: EstimateFormState, formData: FormData): Promise<EstimateFormState> {
    console.log("addProjectEstimate action elindult");
     // --- Jogosultság Ellenőrzés (Szakember) ---
     console.warn("Figyelem: Jogosultságellenőrzés kihagyva az addProjectEstimate action-ben!");
     // Implementáld!
     // -----------------------------------------

     // 1. Validálás
     const validatedFields = EstimateSchema.safeParse({
        projectId: formData.get('projectId'),
        estimatedTime: formData.get('estimatedTime'),
        workFee: formData.get('workFee'),
     });

      if (!validatedFields.success) {
          console.error("Becslés validálási hiba:", validatedFields.error.flatten().fieldErrors);
          return {
              message: 'Hiba: Érvénytelen adatok.',
              success: false,
              errors: validatedFields.error.flatten().fieldErrors,
          };
      }

      const { projectId, estimatedTime, workFee } = validatedFields.data;

      // 2. Adatbázis frissítés
      try {
          await prisma.project.update({
            where: { id: projectId },
            data: {
                estimatedTime: estimatedTime, // Lehet null is
                workFee: workFee,           // Lehet null is
                // Itt NEM változtatjuk a státuszt általában
            }
          });
          console.log(`Becslés rögzítve a ${projectId} projekthez.`);
      } catch (error) {
           console.error(`Adatbázis hiba becslés rögzítésekor (Projekt ID: ${projectId}):`, error);
           return { message: 'Adatbázis hiba: Nem sikerült rögzíteni a becslést.', success: false };
      }

     // 3. Sikeres művelet után
     revalidatePath(`/szakember/projektek/${projectId}`); // Projekt részletek invalidálása
     revalidatePath('/szakember/dashboard'); // Dashboard lista invalidálása

     return { message: 'Becslés sikeresen rögzítve!', success: true };
}