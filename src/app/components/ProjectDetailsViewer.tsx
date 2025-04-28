// src/app/components/ProjectDetailsViewer.tsx
'use client';

import React, { useState, useEffect } from 'react';
// Importáljuk az API válasz típusát és a Status enumot
// Győződj meg róla, hogy az API útvonal helyes!
import type { ProjectDetailsData, AssignedComponentData } from '@/app/api/projects/[projectId]/details/route';
import { Status } from '@prisma/client';
// Importáljuk a CSS modult (győződj meg róla, hogy létezik és az útvonal helyes)
import styles from '@/app/styles/ProjectComponentViewer.module.css';

// Props interfész a komponenshez
interface ProjectDetailsViewerProps {
    projectId: number;
}

// Segédfüggvény a státuszok magyar nevének lekéréséhez
function getStatusText(status: Status): string {
  switch (status) {
    case Status.new: return 'Új';
    case Status.draft: return 'Piszkozat';
    case Status.wait: return 'Várakozás (Alkatrész)';
    case Status.scheduled: return 'Ütemezve';
    case Status.inprogress: return 'Folyamatban';
    case Status.completed: return 'Befejezve';
    case Status.failed: return 'Sikertelen';
    default:
      // Ha ide jut, az váratlan. Adjunk vissza egy egyszerű stringet.
      // Vagy akár az eredeti enum stringet, ha a TS engedi (de a 'never' miatt nem biztos): return status;
      console.warn(`Ismeretlen státusz érték: ${status}`); // Opcionális figyelmeztetés a konzolra
      return 'Ismeretlen'; // Vagy return status; ha a TS engedi és ez jobb fallback
  }
}


export function ProjectDetailsViewer({ projectId }: ProjectDetailsViewerProps) {
  // State a komponenseknek ÉS a logoknak
  const [details, setDetails] = useState<ProjectDetailsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Adatlekérdezés useEffect-ben
  useEffect(() => {
    // Ha nincs érvényes projectId, ne csináljunk semmit
    if (!projectId || projectId <= 0) {
        setError("Érvénytelen projekt ID.");
        setIsLoading(false);
        setDetails(null);
        return;
    };

    let isMounted = true; // Komponens unmountolásának figyelése
    async function fetchDetails() {
      setIsLoading(true);
      setError(null);
      setDetails(null); // Előző adat törlése új lekérdezés előtt
      try {
        // Az API végpont hívása a projekt ID-val
        const response = await fetch(`/api/projects/${projectId}/details`);
        if (!isMounted) return; // Ne folytassuk, ha közben unmountolt

        if (!response.ok) {
           let errorMsg = `Hiba a projekt részletek lekérdezésekor (${response.status})`;
           try {
               const errorData = await response.json();
               errorMsg = errorData.message || errorMsg;
           } catch(e){
               // Nem baj, ha a válasz nem JSON
           }
           throw new Error(errorMsg);
        }
        const data: ProjectDetailsData = await response.json();
        if (isMounted) {
            setDetails(data);
        }
      } catch (err: any) {
        console.error(`Projekt (${projectId}) részletek lekérdezési hiba:`, err);
        if (isMounted) {
            setError(err.message || 'Ismeretlen hiba történt a részletek lekérdezése közben.');
        }
      } finally {
        if (isMounted) {
            setIsLoading(false);
        }
      }
    }

    fetchDetails();

    // Cleanup funkció
    return () => {
      isMounted = false;
    };
  }, [projectId]); // Újra lekérdezünk, ha a projectId megváltozik

  // Töltési állapot megjelenítése
  if (isLoading) {
    return <div className={styles.loading}>Projekt részletek betöltése...</div>;
  }

  // Hiba állapot megjelenítése
  if (error) {
    return <div className={styles.errorContainer}>Hiba: {error}</div>;
  }

  // Ha nincs adat (de nem is tölt és nincs hiba)
  if (!details) {
    return <div className={styles.info}>Nincsenek megjeleníthető adatok ehhez a projekthez.</div>;
  }

  // Sikeres adatbetöltés utáni megjelenítés
  return (
    <div className={styles.container}>

      {/* 1. Szekció: Hozzárendelt Alkatrészek */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Hozzárendelt Alkatrészek</h4>
        {details.assignedComponents.length > 0 ? (
          <ul className={styles.componentList}>
            <li className={styles.listHeader}>
                <span>Alkatrész Neve</span>
                <span style={{textAlign: 'right'}}>Mennyiség</span> {/* Jobbra igazítás */}
            </li>
            {details.assignedComponents.map(comp => (
              <li key={comp.componentId} className={styles.listItem}>
                <span>{comp.componentName}</span>
                <span style={{textAlign: 'right'}}>{comp.quantity} db</span> {/* Jobbra igazítás */}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.noData}>Nincsenek alkatrészek hozzárendelve ehhez a projekthez.</p>
        )}
      </div>

      {/* 2. Szekció: Státusz Történet */}
      <div className={styles.section}>
         <h4 className={styles.sectionTitle}>Projekt Státusz Történet</h4>
         {details.statusHistory.length > 0 ? (
            <ul className={styles.historyList}>
                 <li className={styles.listHeader}>
                    <span>Státusz</span>
                    <span style={{textAlign: 'right'}}>Időpont</span> {/* Jobbra igazítás */}
                </li>
                {/* Megfordítjuk a tömböt, hogy a legújabb legyen legfelül */}
                {[...details.statusHistory].reverse().map((log, index) => (
                    <li key={index} className={styles.listItem}>
                         <span>{getStatusText(log.status)}</span>
                         <span style={{textAlign: 'right'}}>
                             {/* Dátum formázása olvashatóbbra (Magyar formátum) */}
                             {new Date(log.timestamp).toLocaleString('hu-HU', {
                                year: 'numeric', month: '2-digit', day: '2-digit',
                                hour: '2-digit', minute: '2-digit', second: '2-digit'
                             })}
                         </span>
                    </li>
                ))}
            </ul>
         ) : (
             <p className={styles.noData}>Nincs rögzített státuszváltozás ehhez a projekthez.</p>
         )}
      </div>
    </div>
  );
}