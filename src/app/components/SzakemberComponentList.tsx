// src/app/components/SzakemberComponentList.tsx
'use client';

import React, { useState, useEffect } from 'react';
// Importáljuk a típust az API route-ból (vagy közös types fájlból)
import type { ComponentStatusData } from '@/app/api/componentsStatus/route';
import styles from '@/app/styles/SzakemberComponentList.module.css'; // Hozz létre CSS modult

export function SzakemberComponentList() {
  const [components, setComponents] = useState<ComponentStatusData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchComponentStatus() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/componentsStatus'); // Az új API végpont
        if (!response.ok) {
           let errorMsg = `Hiba (${response.status})`;
           try { const data = await response.json(); errorMsg = data.message || errorMsg; } catch(e){}
           throw new Error(errorMsg);
        }
        const data: ComponentStatusData[] = await response.json();
        setComponents(data);
      } catch (err: any) {
        console.error("Komponens státusz lekérdezési hiba:", err);
        setError(err.message || 'Ismeretlen hiba.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchComponentStatus();
  }, []);

  if (isLoading) {
    return <p>Alkatrészlista betöltése...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Hiba a lista betöltésekor: {error}</p>;
  }

   if (components.length === 0) {
       return <p>Nincsenek alkatrészek a rendszerben.</p>;
   }

  return (
    <div className={styles.tableContainer}>
      <table className={styles.componentTable}>
        <thead>
          <tr>
            <th className={styles.tableHeader}>Név</th>
            <th className={styles.tableHeader}>Ár (Ft)</th>
            <th className={styles.tableHeader}>Teljes Készlet</th>
            <th className={styles.tableHeader}>Foglalt</th>
            <th className={styles.tableHeader}>Elérhető</th>
            <th className={styles.tableHeader}>Max/Rekesz</th>
            {/* Lehetne itt egy "Hozzáadás Projekthez" gomb is később (A.4)? */}
          </tr>
        </thead>
        <tbody>
          {components.map((comp) => (
            <tr key={comp.id} className={styles.tableRow}>
              <td className={styles.tableCell}>{comp.name}</td>
              <td className={styles.tableCell}>{comp.price}</td>
              <td className={styles.tableCell}>{comp.totalStock} db</td>
              <td className={styles.tableCell}>{comp.reservedStock} db</td>
              {/* Elérhető készletet kiemelhetjük */}
              <td className={`${styles.tableCell} ${comp.availableStock <= 0 ? styles.unavailable : styles.available}`}>
                {comp.availableStock} db
              </td>
               <td className={styles.tableCell}>{comp.maxQuantityPerRack} db</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}