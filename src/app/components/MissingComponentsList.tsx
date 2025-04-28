// src/app/components/MissingComponentsList.tsx
'use client';

import React, { useState, useEffect } from 'react';
// Importáljuk a típust az API route-ból
import type { MissingComponentData } from '@/app/api/components-missing/route';
import styles from '@/app/styles/MissingComponentsList.module.css'; // Hozz létre CSS modult

export function MissingComponentsList() {
  const [missingComponents, setMissingComponents] = useState<MissingComponentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMissingComponents() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/components-missing'); // Az új API végpont
        if (!response.ok) {
           let errorMsg = `Hiba (${response.status})`;
           try { const data = await response.json(); errorMsg = data.message || errorMsg; } catch(e){}
           throw new Error(errorMsg);
        }
        const data: MissingComponentData[] = await response.json();
        setMissingComponents(data);
      } catch (err: any) {
        console.error("Hiányzó komponensek lekérdezési hiba:", err);
        setError(err.message || 'Ismeretlen hiba.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchMissingComponents();
  }, []);

  if (isLoading) {
    return <p>Hiányzó alkatrészek listájának betöltése...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Hiba a lista betöltésekor: {error}</p>;
  }

   if (missingComponents.length === 0) {
       return <p>Jelenleg nincs hiányzó alkatrész.</p>;
   }

  return (
    <div className={styles.tableContainer}>
      <p className={styles.infoText}>Az alábbi alkatrészekből nincs elegendő elérhető készlet a foglalások figyelembevételével.</p>
      <table className={styles.missingTable}>
        <thead>
          <tr>
            <th className={styles.tableHeader}>Név</th>
            <th className={styles.tableHeader}>Teljes Készlet</th>
            <th className={styles.tableHeader}>Foglalt</th>
            <th className={styles.tableHeader}>Elérhető</th>
          </tr>
        </thead>
        <tbody>
          {missingComponents.map((comp) => (
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