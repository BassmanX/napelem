// src/app/components/MissingReservedComponentsList.tsx
'use client';

import React, { useState, useEffect } from 'react';
// A típust importálhatjuk az új API route-ból is
import type { MissingComponentData } from '@/app/api/components-missing-reserved/route';
// Használhatjuk ugyanazt a CSS modult, mint a másik listához
import styles from '@/app/styles/MissingComponentsList.module.css';

export function MissingReservedComponentsList() {
  const [components, setComponents] = useState<MissingComponentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMissingReserved() {
      setIsLoading(true);
      setError(null);
      try {
        // Az ÚJ API végpontot hívjuk!
        const response = await fetch('/api/components-missing-reserved');
        if (!response.ok) {
           let errorMsg = `Hiba (${response.status})`;
           try { const data = await response.json(); errorMsg = data.message || errorMsg; } catch(e){}
           throw new Error(errorMsg);
        }
        const data: MissingComponentData[] = await response.json();
        setComponents(data);
      } catch (err: any) {
        setError(err.message || 'Ismeretlen hiba.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchMissingReserved();
  }, []);

  if (isLoading) {
    return <p>Lista betöltése...</p>;
  }
  if (error) {
    return <p style={{ color: 'red' }}>Hiba: {error}</p>;
  }
  if (components.length === 0) {
      // Másik üzenet, ha nincs ilyen elem
       return <p>Jelenleg nincs olyan hiányzó alkatrész, amelyre előfoglalás is lenne.</p>;
   }

  // A táblázat ugyanaz, mint a MissingComponentsList-ben
  return (
    <div className={styles.tableContainer}>
      <p className={styles.infoText}>Az alábbi hiányzó alkatrészekre már van leadott foglalás projektekhez.</p>
      <table className={styles.missingTable}>
         <thead>{/* ... Ugyanaz a fejléc ... */}</thead>
         <tbody>
           {components.map((comp) => (
             <tr key={comp.id} className={styles.tableRow}>
               <td className={styles.tableCell}>{comp.name}</td>
               <td className={styles.tableCell}>{comp.totalStock} db</td>
               <td className={styles.tableCell}>{comp.reservedStock} db</td>
               <td className={`${styles.tableCell} ${styles.unavailable}`}>
                 {comp.availableStock} db
               </td>
             </tr>
           ))}
         </tbody>
      </table>
    </div>
  );
}