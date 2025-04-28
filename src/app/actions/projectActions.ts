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

// --- ÚJ: State típus a projekt lezárásához (egyszerűbb) ---
export type CloseProjectState = {
    message: string;
    success: boolean;
} | undefined;

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

// --- ÚJ: State típus az árkalkulációhoz ---
export type CalculationResultState = {
    success: boolean;
    message?: string;
    componentCost?: string; // Stringként adjuk vissza a formázás miatt
    workFee?: string;       // Stringként adjuk vissza
    totalCost?: string;     // Stringként adjuk vissza
    newStatus?: Status;
    missingComponents?: { name: string; required: number; available: number }[];
} | null; // Lehet null kezdetben

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

    // Itt már a validatedFields.data tartalmazza a helyes adatokat
    const { customerName, location, description } = validatedFields.data;

    // 2. Adatbázis művelet
    try {
        // Projekt létrehozása
        const newProject = await prisma.project.create({
            data: {
                customerName: customerName,           // Validált adat
                location: location,                 // Validált adat
                description: description || '',       // Validált adat (vagy üres string)
                status: Status.new,                 // Kezdeti státusz beállítása
                // estimatedTime és workFee itt még null vagy undefined lesz alapból
            },
        });

        // --- NAPLÓZÁS ---
        // Közvetlenül a sikeres létrehozás után hozzáadjuk az első log bejegyzést
        await prisma.projectLog.create({
            data: {
                projectId: newProject.id, // A frissen létrehozott projekt ID-ja
                status: Status.new,     // A 'new' státusz logolása
                // A timestamp alapértelmezetten létrejön (default(now()))
            }
        });
        // ---------------

        console.log(`Projekt sikeresen létrehozva (ID: ${newProject.id}) és logolva.`);

    } catch (error) {
        console.error("Adatbázis hiba projekt létrehozásakor vagy logolásakor:", error);
        return { message: 'Adatbázis hiba: Nem sikerült létrehozni a projektet.', success: false };
    }

    // 3. Sikeres létrehozás és logolás utáni teendők
    revalidatePath('/szakember/dashboard'); // Dashboard invalidálása
    // revalidatePath('/szakember/projektek'); // Ha van külön projekt lista oldal

    return { message: 'Projekt sikeresen létrehozva!', success: true };
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
        // Változó a státuszváltozás nyomon követésére
        let statusChangedToDraft = false;

        await prisma.$transaction(async (tx) => {
            // a) Upsert minden komponens hozzárendelést
            for (const item of components) {
                await tx.projectComponent.upsert({
                    where: { projectId_componentId: { projectId: projectId, componentId: item.componentId } },
                    update: { quantity: item.quantity, reserved: true },
                    create: { projectId: projectId, componentId: item.componentId, quantity: item.quantity, reserved: true },
                });
            }

             // b) Projekt státuszának frissítése 'draft'-ra, ha 'new' volt
             const updateResult = await tx.project.updateMany({ // Változóba tesszük az eredményt
                where: {
                    id: projectId,
                    status: Status.new, // Csak akkor frissítünk, ha 'new' volt
                },
                data: {
                    status: Status.draft, // Átállítjuk 'draft'-ra
                }
             });

             // Ellenőrizzük, hogy történt-e tényleges státuszváltás
             if (updateResult.count > 0) {
                 statusChangedToDraft = true; // Jelezzük, hogy váltottunk 'draft'-ra
             }

             // ---> c) Log bejegyzés létrehozása, HA a státusz 'draft'-ra változott <---
             if (statusChangedToDraft) {
                  await tx.projectLog.create({
                      data: {
                          projectId: projectId,
                          status: Status.draft, // Az ÚJ státuszt logoljuk
                      }
                  });
                  console.log(`Projekt (ID: ${projectId}) státusza 'draft'-ra váltott és logolva.`);
             }
             // ------------------------------------------------------------------

        }); // Tranzakció vége

         console.log(`Alkatrészek hozzárendelve/frissítve a ${projectId} projekthez.`);

     } catch (error) {
         console.error(`Adatbázis hiba hozzárendeléskor (Projekt ID: ${projectId}):`, error);
         return { message: 'Adatbázis hiba: Nem sikerült hozzárendelni az alkatrészeket.', success: false };
     }

     // Sikeres művelet után cache invalidálás és visszatérés
     revalidatePath(`/szakember/projektek/${projectId}`);
     revalidatePath('/szakember/dashboard');
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

// --- ÚJ: Server Action az Árkalkulációhoz ---
export async function calculateProjectCost(projectId: number): Promise<CalculationResultState> {
    console.log(`calculateProjectCost action elindult (Projekt ID: ${projectId})`);
     // --- Jogosultság Ellenőrzés (Szakember) ---
     console.warn("Figyelem: Jogosultságellenőrzés kihagyva a calculateProjectCost action-ben!");
     // Implementáld!
     // -----------------------------------------

    if (!projectId) {
        return { success: false, message: "Érvénytelen projekt ID." };
    }

    try {
        // 1. Projekt adatok és hozzárendelt komponensek lekérdezése
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
                status: true,
                workFee: true,
                projectComponents: {
                    select: {
                        quantity: true,
                        component: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                            }
                        }
                    }
                }
            }
        });

        if (!project) {
            return { success: false, message: "Projekt nem található." };
        }
        // Előfeltételek ellenőrzése
        if (!project.workFee) {
             return { success: false, message: "A munkadíj még nincs rögzítve ehhez a projekthez." };
        }
        if (project.status !== Status.draft && project.status !== Status.wait) { // Lehet, hogy 'wait'-ből is lehet?
              return { success: false, message: `A projekt státusza (${project.status}) nem teszi lehetővé az árkalkulációt.` };
         }
        if (!project.projectComponents || project.projectComponents.length === 0) {
            return { success: false, message: "Nincsenek alkatrészek hozzárendelve a projekthez." };
        }

        // 2. Alkatrész elérhetőség ellenőrzése és költség számítása
        let totalComponentCost = new Prisma.Decimal(0);
        const missingComponents: { name: string; required: number; available: number }[] = [];

        // Optimalizált lekérdezés az összes szükséges készlethez és foglaláshoz
        const componentIds = project.projectComponents.map(pc => pc.component.id);
        const inventorySums = await prisma.inventoryItem.groupBy({
            by: ['componentId'], where: { componentId: { in: componentIds } }, _sum: { quantity: true },
       });
       const totalStockMap = new Map(inventorySums.map(item => [item.componentId, item._sum.quantity ?? 0]));

       // Lekérdezzük az ÖSSZESÍTETT AKTÍV FOGLALÁSOKAT komponensenként
       // Itt van az a groupBy, amit MÓDOSÍTOTTÁL, hogy csak a releváns státuszú
       // projektek foglalásait adja össze (pl. Scheduled, InProgress)
       const reservedSums = await prisma.projectComponent.groupBy({
           by: ['componentId'],
           _sum: { quantity: true },
           where: {
               componentId: { in: componentIds },
               // A FELTÉTELEZETTEN ÁLTALAD HOZZÁADOTT SZŰRÉS:
               project: {
                   status: {
                       // Csak ezeket vesszük figyelembe, mint aktív foglalás
                       in: [Status.scheduled, Status.inprogress]
                   }
                   // Opcionális: ki akarod hagyni ebből a jelenlegi projektet?
                   // projectId: { not: projectId }
               }
               // Vagy ha a 'reserved' flaget használod: reserved: true
           }
       });
       // Létrehozzuk a Map-et az aktív foglalásokról:
       const activeReservedStockMap = new Map(reservedSums.map(item => [item.componentId, item._sum.quantity ?? 0]));


       // ---> CIKLUS A HELYES LOGIKÁVAL <---
       for (const pc of project.projectComponents) {
           const componentId = pc.component.id;
           const componentName = pc.component.name;
           const componentPrice = pc.component.price;
           const requiredQuantityForThisProject = pc.quantity; // Mennyi kell ehhez a projekthez

           const totalStock = totalStockMap.get(componentId) ?? 0; // Teljes fizikai készlet
           // Aktívan foglalt mennyiség MÁS (vagy releváns státuszú) projektek által
           const activelyReservedStock = activeReservedStockMap.get(componentId) ?? 0;

           // Az ehhez a projekthez ténylegesen rendelkezésre álló készlet
           // (Teljes készlet mínusz az aktív foglalások)
           const effectivelyAvailable = totalStock - activelyReservedStock;

           // Ellenőrzés: Az effektíven elérhető készlet elég-e ehhez a projekthez?
           if (effectivelyAvailable < requiredQuantityForThisProject) {
               missingComponents.push({
                   name: componentName,
                   required: requiredQuantityForThisProject,
                   // Itt azt írjuk ki, amennyi ténylegesen van a többi foglalás levonása után
                   available: effectivelyAvailable < 0 ? 0 : effectivelyAvailable
               });
           }

           // Költség számítása (változatlan)
           totalComponentCost = totalComponentCost.add(componentPrice.times(requiredQuantityForThisProject));
       }
       // ---> CIKLUS VÉGE <---
       
        // 3. Eredmény összeállítása vagy státusz frissítése
        if (missingComponents.length > 0) {
            // ---> HIÁNYZÓ ALKATRÉSZEK ESETÉN ('Wait' státusz) <---
            console.log(`Hiányzó alkatrészek a ${projectId} projekthez.`);

            // Csak akkor kell státuszt váltani és logolni, ha még nem 'Wait'
            if (project.status !== Status.wait) {
                console.log(`[Calc Cost - Missing] Státusz nem 'wait' (${project.status}), váltás és logolás szükséges.`); // <-- Log hozzáadva
                try {
                    // Tranzakció a státuszváltáshoz és logoláshoz
                    await prisma.$transaction(async (tx) => {
                        console.log(`[Calc Cost - Missing] Tranzakció indítva 'wait' státuszhoz...`); // <-- Log hozzáadva
                        // Státusz frissítése 'Wait'-re
                         await tx.project.update({
                            where: { id: projectId },
                            data: { status: Status.wait }
                         });
                         console.log(`[Calc Cost - Missing] Státusz frissítve 'wait'-re. Log létrehozása...`); // <-- Log hozzáadva
                         // Log bejegyzés létrehozása
                         await tx.projectLog.create({
                             data: {
                                 projectId: projectId,
                                 status: Status.wait, // A 'Wait' státuszt logoljuk
                             }
                         });
                         console.log(`[Calc Cost - Missing] Log létrehozva. Tranzakció vége.`); // <-- Log hozzáadva
                    });
                    console.log(`Projekt (ID: ${projectId}) státusza 'wait'-re váltott és logolva.`);
                    revalidatePath('/szakember/dashboard');
                } catch (transactionError) {
                     console.error(`[Calc Cost - Missing] HIBA a 'wait' státusz tranzakcióban (Projekt ID: ${projectId}):`, transactionError);
                     // Hiba esetén is visszaadjuk a hiányzó komponensek infót, de jelezhetnénk a tranzakciós hibát is
                     return {
                         success: false,
                         message: "Nem minden alkatrész érhető el, és hiba történt a státusz frissítése közben.", // Pontosabb hibaüzenet
                         missingComponents: missingComponents,
                     };
                }
            } else {
                // ---> Logoljuk, ha már 'Wait' volt <---
                 console.log(`[Calc Cost - Missing] Státusz már 'wait', nincs szükség váltásra/logolásra.`);
            } // if (project.status !== Status.wait) vége

            // Visszatérünk a hiányzó komponensekkel (fontos, hogy a tranzakciós hiba után is ide jusson, ha nem returnöltünk ott)
            return {
                success: false,
                message: "Nem minden alkatrész érhető el a szükséges mennyiségben.",
                missingComponents: missingComponents,
            };
            // ------------------------------------


        } else {
            // Ha minden elérhető -> Kalkuláció + Státusz 'scheduled'-re
            const totalCost = totalComponentCost.add(project.workFee); // Összes költség
            try {
                // Tranzakció a státusz 'scheduled'-re állításához ÉS logolásához
                await prisma.$transaction(async (tx) => {
                    console.log(`[Calc Cost - OK] Tranzakció indítva. Státusz frissítése...`);

                    // ---> EZ A KONKRÉT KÓD, RÖVIDÍTÉS NÉLKÜL <---
                    await tx.project.update({
                        where: { id: projectId }, // A projekt azonosítója alapján
                        data: { status: Status.scheduled } // Beállítjuk a státuszt 'Scheduled'-re
                    });
                    // ---------------------------------------

                    console.log(`[Calc Cost - OK] Státusz frissítve 'scheduled'-re. Log bejegyzés létrehozása...`);
                    await tx.projectLog.create({
                         data: {
                             projectId: projectId,
                             status: Status.scheduled, // A 'Scheduled' státuszt logoljuk
                         }
                    });
                    console.log(`[Calc Cost - OK] Log bejegyzés létrehozva. Tranzakció vége.`);
                });

                console.log(`Projekt (ID: ${projectId}) státusza 'scheduled'-re váltott és logolva.`);
                revalidatePath('/szakember/dashboard');

                // Sikeres visszatérés
                return {
                    success: true,
                    message: "Árkalkuláció sikeres, a projekt ütemezve!",
                    componentCost: totalComponentCost.toFixed(2),
                    workFee: project.workFee.toFixed(2),
                    totalCost: totalCost.toFixed(2),
                    newStatus: Status.scheduled,
                };
           } catch (transactionError) { // Hiba a tranzakción belül
                console.error(`[Calc Cost - OK] HIBA a 'scheduled' státusz tranzakcióban (Projekt ID: ${projectId}):`, transactionError);
                return { success: false, message: 'Hiba történt a projekt státuszának frissítése vagy logolása közben.' };
           }
        }

    } catch (error: any) {
        console.error(`Hiba az árkalkuláció során (Projekt ID: ${projectId}):`, error);
        return { success: false, message: 'Adatbázis hiba: Az árkalkuláció nem sikerült.' };
    }
}

// --- ÚJ: Server Action Projekt Lezárásához ---
export async function closeProject(
    projectId: number,
    finalStatus: "completed" | "failed" // Csak ezt a kettőt fogadjuk el
): Promise<CloseProjectState> {
    console.log(`closeProject action elindult (Projekt ID: ${projectId}, Státusz: ${finalStatus})`);

    // --- Jogosultság Ellenőrzés (Szakember) ---
    console.warn("Figyelem: Jogosultságellenőrzés kihagyva a closeProject action-ben!");
    // Implementáld!
    // -----------------------------------------

    // Ellenőrizzük, hogy érvényes státuszra akarunk-e zárni
    if (finalStatus !== Status.completed && finalStatus !== Status.failed) {
        return { success: false, message: "Érvénytelen cél státusz a lezáráshoz." };
    }

    // Adatbázis műveletek tranzakcióban
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Projekt státuszának frissítése
            const updatedProject = await tx.project.update({
                where: { id: projectId /*, status: Status.inprogress */ },
                data: { status: finalStatus },
            });

            // Ha nem sikerült a frissítés (pl. nem létezett a projekt vagy nem a várt státuszban volt)
            if (!updatedProject) {
                 throw new Error("A projekt nem található vagy nem zárható le ebből a státuszból.");
            }

            // 2. Log bejegyzés létrehozása
            await tx.projectLog.create({
                data: {
                    projectId: projectId,
                    status: finalStatus,
                    // timestamp alapértelmezetten now()
                }
            });
        });

        console.log(`Projekt (ID: ${projectId}) sikeresen lezárva ${finalStatus} státusszal.`);

    } catch (error: any) {
        console.error(`Adatbázis hiba projekt lezárásakor (ID: ${projectId}):`, error);
        // Visszaadjuk a konkrét hibaüzenetet, ha az a tranzakcióból jött
        return { message: error.message || 'Adatbázis hiba: Nem sikerült lezárni a projektet.', success: false };
    }

    // Sikeres művelet után cache invalidálása
    revalidatePath('/szakember/dashboard'); // Dashboard lista invalidálása
    revalidatePath(`/szakember/projektek/${projectId}`); // Projekt részletek invalidálása (ha van)


    return { message: `Projekt sikeresen lezárva (${finalStatus}) státusszal!`, success: true };
}

// --- ÚJ: State típus a kivételezés indításához ---
export type StartPickingState = {
    message: string;
    success: boolean;
} | undefined;

// --- ÚJ: Server Action a Kivételezés Indításához ---
export async function startPickingProject(projectId: number): Promise<StartPickingState> {
    console.log(`startPickingProject action elindult (Projekt ID: ${projectId})`);

    // --- Jogosultság Ellenőrzés (Raktáros) ---
    console.warn("Figyelem: Jogosultságellenőrzés kihagyva a startPickingProject action-ben!");
    // Implementáld a Raktáros szerepkör ellenőrzését!
    // const session = await getServerSession(authOptions);
    // if (session?.user?.role !== 'raktaros') {
    //    return { success: false, message: 'Hozzáférés megtagadva.' };
    // }
    // --------------------------------------

    if (!projectId || typeof projectId !== 'number' || projectId <= 0) {
        return { success: false, message: "Érvénytelen projekt ID." };
    }

    // Adatbázis műveletek tranzakcióban
    try {
        const result = await prisma.$transaction(async (tx) => {
             // 1. Projekt státuszának frissítése 'InProgress'-re
             const updatedProject = await tx.project.updateMany({
                 where: {
                     id: projectId,
                     status: Status.scheduled, // Csak akkor frissítünk, ha 'Scheduled' volt!
                 },
                 data: {
                     status: Status.inprogress,
                 },
             });

             // Ellenőrizzük, hogy történt-e frissítés (azaz a projekt létezett és 'scheduled' volt)
             if (updatedProject.count === 0) {
                 // Megkeressük a projektet, hogy kiderüljön, miért nem sikerült
                 const project = await tx.project.findUnique({ where: { id: projectId }, select: { status: true } });
                 if (!project) throw new Error("Projekt nem található.");
                 if (project.status !== Status.scheduled) throw new Error(`A projekt státusza nem 'Scheduled', hanem '${project.status}'.`);
                 // Ha ide jut, valami más hiba történt
                 throw new Error("Ismeretlen hiba a projekt státuszának frissítésekor.");
             }

             // 2. Log bejegyzés létrehozása
             await tx.projectLog.create({
                 data: {
                     projectId: projectId,
                     status: Status.inprogress, // Az új státusz
                 }
             });

             return { success: true }; // Tranzakció sikeres
        });

        // Ha a tranzakció sikeres volt
        if (result.success) {
            console.log(`Projekt (ID: ${projectId}) státusza 'InProgress'-re állítva.`);
            revalidatePath('/szakember/dashboard'); // Szakember nézetet is frissítjük
            revalidatePath('/raktaros/dashboard'); // Raktáros nézetet is (ha külön van)
             revalidatePath('/pages/dashboard'); // A fő dashboard oldalt is
            return { message: 'Projekt kivételezésre átállítva!', success: true };
        }
         // Elvileg nem juthat ide
         return { message: 'Ismeretlen hiba a tranzakció során.', success: false };

    } catch (error: any) {
        console.error(`Adatbázis hiba kivételezés indításakor (Projekt ID: ${projectId}):`, error);
        return { message: error.message || 'Adatbázis hiba: Nem sikerült a projekt státuszát módosítani.', success: false };
    }
}
