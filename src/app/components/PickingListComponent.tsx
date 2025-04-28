// src/app/components/PickingListComponent.tsx
'use client';

import React, { useState, useEffect, useMemo, useActionState } from 'react';
// Importáljuk a típust az API route-ból (ellenőrizd az útvonalat)
import type { PickingListItem } from '@/app/api/projects/[projectId]/picking-list/route';
// Importáljuk a CSS modult (ellenőrizd az útvonalat)
import styles from '@/app/styles/PickingList.module.css';
import { completePicking, type CompletePickingState } from '@/app/actions/inventoryActions'; // Új action!
import { useFormStatus } from 'react-dom';
import { useRouter } from 'next/navigation';


interface PickingListProps {
    projectId: number;
    onPickingComplete: () => void; // Callback, ha végzett a kivételezéssel
}

// Submit gomb a befejezéshez
function CompleteButton({ disabled, onClick, isCompleting }: { disabled: boolean, onClick: () => void, isCompleting: boolean }) {
    // const { pending } = useFormStatus(); // Server Action formhoz kellene, onClick-hez nem
    return (
      <button
        type="button" // Legyen type="button"
        disabled={disabled || isCompleting}
        className={styles.completeButton}
        onClick={onClick}
        aria-disabled={disabled || isCompleting}
      >
        {isCompleting ? 'Folyamatban...' : 'Kivételezés Befejezése'}
      </button>
    );
  }
// Típus a rendezett feladatokhoz
type PickingTask = {
    rackId: number;
    row: number;
    column: number;
    level: number;
    itemsToPick: { // Alkatrészek, amiket EBBEN a rekeszben kell felvenni
        componentId: number;
        componentName: string;
        // quantityToPick: number; // Ezt átnevezzük/lecseréljük
        quantityAvailableInRack: number; // Mennyi van ebben a rekeszben?
        totalRequiredForProject: number; // Mennyi kell összesen a projekthez ebből?
    }[];
};

export function PickingListComponent({ projectId, onPickingComplete }: PickingListProps) {
  // === State definíciók ===
  const [originalPickingList, setOriginalPickingList] = useState<PickingListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // CSAK EZ a state kell a pipákhoz (string Set a kompozit kulcsoknak)
  const [pickedItems, setPickedItems] = useState<Set<string>>(new Set());
  // const [pickedComponentIds, setPickedComponentIds] = useState<Set<number>>(new Set()); // <-- EZT TÖRÖLD!
  const [completionState, setCompletionState] = useState<CompletePickingState>(undefined);
  const [isCompleting, setIsCompleting] = useState(false);
  const router = useRouter();
  // =====================

  useEffect(() => {
    // Egyszerűsített ID ellenőrzés
    if (!projectId || projectId <= 0) {
        setError("Érvénytelen projekt ID a kivételezési lista lekérdezéséhez.");
        setIsLoading(false);
        setOriginalPickingList([]); // Ürítjük a listát hiba esetén
        return;
    }

    let isMounted = true; // Segít elkerülni a state frissítést unmount után
    async function fetchPickingList() {
      // Csak akkor állítjuk be újra, ha még nem töltött (vagy projectId változott)
      if(!isLoading) setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/projects/${projectId}/picking-list`);
        if (!isMounted) return; // Ne folytassuk, ha közben unmountolt
        if (!response.ok){
             let errorMsg = `Hiba (${response.status})`;
             try { const data = await response.json(); errorMsg = data.message || errorMsg; } catch(e){}
             throw new Error(errorMsg);
        }
        const data: PickingListItem[] = await response.json();
        if (isMounted) setOriginalPickingList(data);
      } catch (err: any) {
         if (isMounted) setError(err.message || 'Ismeretlen hiba történt a lista lekérdezésekor.');
      } finally {
         if (isMounted) setIsLoading(false);
      }
    }
    fetchPickingList();

    // Cleanup function az unmount esetére
    return () => { isMounted = false; };
  }, [projectId]); // Csak projectId változásra fusson le újra

  // --- Adatok átalakítása rendezett listává (useMemo is a return-ök ELŐTT!) ---
  const sortedPickingTasks = useMemo((): PickingTask[] => {
    if (!originalPickingList) return [];

    const tasksByRack = new Map<number, PickingTask>();

    originalPickingList.forEach(item => {
      // Végigmegyünk az alkatrész elérhető helyein
      for (const loc of item.locations) {
            // Megnézzük, van-e már feladat ehhez a rekeszhez
            let task = tasksByRack.get(loc.rackId);
            if (!task) {
                // Ha nincs, létrehozzuk
                task = {
                    rackId: loc.rackId,
                    row: loc.row,
                    column: loc.column,
                    level: loc.level,
                    itemsToPick: []
                };
                tasksByRack.set(loc.rackId, task);
            }

            // Hozzáadjuk az alkatrészt a rekesz feladataihoz
            // Most már a HELYES mennyiséget (ami a rekeszben van) adjuk hozzá!
            // és a teljes szükségeset is kontextusnak.
            task.itemsToPick.push({
                componentId: item.componentId,
                componentName: item.componentName,
                quantityAvailableInRack: loc.quantityInRack, // Mennyi van ebben a rekeszben
                totalRequiredForProject: item.requiredQuantity // Mennyi kell összesen a projekthez
            });
      } // for loc vége
    }); // forEach item vége

    const tasksArray = Array.from(tasksByRack.values());
    // ---> IDE JÖN A RENDEZÉSI LOGIKA <---
    tasksArray.sort((a, b) => {
        // Elsődleges rendezés: Sor szerint növekvő
        if (a.row !== b.row) {
            return a.row - b.row;
        }
        // Másodlagos rendezés: Oszlop szerint növekvő (ha a sor azonos)
        if (a.column !== b.column) {
            return a.column - b.column;
        }
        // Harmadlagos rendezés: Szint szerint növekvő (ha a sor és oszlop azonos)
        return a.level - b.level;
    });
    // ------------------------------------

    return tasksArray;
  }, [originalPickingList]); // Függőség: originalPickingList
  // --------------------------------------------
  // === HOOK HÍVÁSOK VÉGE ===

  // Checkbox Kezelő (helyes, a 'pickedItems' state-et használja)
  const handleCheckboxChange = (rackId: number, componentId: number, isChecked: boolean) => {
    const key = `${rackId}-${componentId}`;
    setPickedItems(prev => {
      const newSet = new Set(prev);
      if (isChecked) { newSet.add(key); } else { newSet.delete(key); }
      return newSet;
    });
  };

  // --- JAVÍTOTT 'allItemsPicked' logika ---
    const totalPickingTasks = useMemo(() => {
       let count = 0;
       // Végigmegyünk a rendezett REKESZ feladatokon
       sortedPickingTasks.forEach(task => {
           // És megszámoljuk az ÖSSZES alkatrész feladatot ezeken BELÜL
           count += task.itemsToPick.length;
       });
       return count;
   }, [sortedPickingTasks]);

   // Összehasonlítjuk a kipipáltak számával (a kompozit kulcsos Set méretével)
   const allItemsPicked = pickedItems.size === totalPickingTasks && totalPickingTasks > 0;
   // ---------------------------------------

  // --- Befejezés Handler ---
  const handleCompletePicking = async () => {
      setIsCompleting(true);
      setCompletionState(undefined); // Reset state
      // Összegyűjtjük azokat az elemeket, amiket ki kellett venni (az eredeti listából)
       const itemsToProcess = originalPickingList.map(item => ({
            componentId: item.componentId,
            quantity: item.requiredQuantity,
       }));


       try {
          const result = await completePicking(projectId, itemsToProcess); // Action hívása
          setCompletionState(result);
          if (result?.success) {
             alert(result.message); // Vagy jobb visszajelzés
             onPickingComplete(); // Visszalépünk a dashboardra
          } else {
              // A hiba már a completionState-ben van, amit kiírunk
              console.error("Kivételezés befejezése sikertelen:", result?.message);
          }
       } catch (err: any) {
            console.error("Hiba a completePicking hívása közben:", err);
            setCompletionState({ success: false, message: "Kliens oldali hiba a művelet végrehajtása közben.", error: err.message });
       } finally {
            setIsCompleting(false);
       }
  };
  // ------------------------

  // === FELTÉTELES RETURN UTASÍTÁSOK (MOST MÁR BIZTONSÁGOS) ===
  if (isLoading) {
      return <p>Kivételezési lista betöltése...</p>;
  }
  if (error) {
      return <p style={{ color: 'red' }}>Hiba a lista betöltésekor: {error}</p>;
  }
  // Ha nincs hiba és nem tölt, de a feldolgozott lista üres (mert pl. nem volt mit kivenni)
  if (sortedPickingTasks.length === 0) {
       // Különbséget teszünk: volt eredeti adat, de nem lett belőle task, vagy eleve nem volt adat?
       if (originalPickingList.length > 0){
            return <p>A szükséges alkatrészekhez nem található megfelelő raktári lokáció.</p>;
       } else {
           return <p>Ehhez a projekthez nincsenek összekészítendő alkatrészek.</p>;
       }
   }
  // =======================================


  // === FŐ JSX RETURN ===
  return (
    <div className={styles.container}>
      <h3>Optimalizált Kivételezési Útvonal (Projekt ID: {projectId})</h3>
      <ol className={styles.routeList}>
        {sortedPickingTasks.map((task, index) => (
          <li key={task.rackId} className={styles.routeStep}>
            <div className={styles.stepNumber}>{index + 1}.</div>
            <div className={styles.stepContent}>
              <div className={styles.rackInfo}>
                 Menj ide: <strong>Sor {task.row} / Oszlop {task.column} / Szint {task.level}</strong> (Rekesz ID: {task.rackId})
              </div>
              <ul className={styles.itemsInRackList}>
                {/* Fejléc a listához */}

                {/* Tényleges elemek */}
                {task.itemsToPick.map(item => {
                    const pickItemKey = `${task.rackId}-${item.componentId}`;
                    const checkboxId = `pick-${projectId}-${task.rackId}-${item.componentId}`;
                    return (
                        <li key={pickItemKey} className={styles.itemToPick}>
                            <input
                                type="checkbox"
                                id={checkboxId}
                                checked={pickedItems.has(pickItemKey)}
                                onChange={(e) => {
                                    handleCheckboxChange(task.rackId, item.componentId, e.target.checked);
                                }}
                                className={styles.pickCheckbox}
                            />
                            <label htmlFor={checkboxId} className={styles.pickComponentName}>
                                {item.componentName}
                            </label>
                            <span className={styles.pickQuantity}>
                                {item.totalRequiredForProject} db
                            </span>
                        </li>
                    );
                    })}
              </ul>
            </div>
          </li>
        ))}
      </ol>
       {/* Befejezés Gomb */}
       {/* Csak akkor aktív, ha minden ki van pipálva ÉS nem fut már a mentés */}
       <button
           onClick={handleCompletePicking}
           className={styles.completeButton}
           disabled={!allItemsPicked || isCompleting}
       >
           {isCompleting ? 'Folyamatban...' : 'Kivételezés Befejezése'}
       </button>

       {/* Vissza gomb (lehet, hogy ez felesleges, ha a befejezés visszadob) */}
       {/* <button onClick={onPickingComplete} className={styles.backButton}>Vissza a Listához</button> */}
    </div>
  );
}