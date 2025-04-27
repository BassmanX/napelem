// src/app/components/ProjectComponentViewer.tsx
'use client';

import React, { useState, useEffect } from 'react';
// Importáljuk a típust az API route-ból (vagy közös types fájlból)
import type { AssignedComponentData } from '@/app/api/projects/[projectId]/components/route';
import styles from '@/app/styles/ProjectComponentViewer.module.css'; // Hozz létre CSS modult

interface ProjectComponentViewerProps {
    projectId: number;
}

export function ProjectComponentViewer({ projectId }: ProjectComponentViewerProps) {
  const [components, setComponents] = useState<AssignedComponentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ne fusson le, ha a projectId érvénytelen (pl. 0 vagy null)
    if (!projectId) {
        setIsLoading(false);
        setError("Nincs kiválasztva projekt.");
        return;
    };

    async function fetchAssignedComponents() {
      setIsLoading(true);
      setError(null);
      try {
        // Dinamikusan építjük fel az URL-t a projectId-val
        const response = await fetch(`/api/projects/${projectId}/components`);
        if (!response.ok) {
           let errorMsg = `Hiba (${response.status})`;
           try { const data = await response.json(); errorMsg = data.message || errorMsg; } catch(e){}
           throw new Error(errorMsg);
        }
        const data: AssignedComponentData[] = await response.json();
        setComponents(data);
      } catch (err: any) {
        console.error(`Projekt (${projectId}) komponens lekérdezési hiba:`, err);
        setError(err.message || 'Ismeretlen hiba.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchAssignedComponents();
  // Akkor fusson le újra, ha a projectId megváltozik
  }, [projectId]);

  if (isLoading) {
    return <p>Hozzárendelt alkatrészek betöltése...</p>;
  }

  if (error) {
    return <p style={{ color: 'red' }}>Hiba: {error}</p>;
  }

   if (components.length === 0) {
       return <p>Ehhez a projekthez még nincsenek alkatrészek hozzárendelve.</p>;
   }

  return (
    <div className={styles.listContainer}>
      {/* Lehetne táblázat is, most egyszerű lista */}
      <ul className={styles.componentList}>
        <li className={styles.listHeader}>
            <span>Alkatrész Neve</span>
            <span>Mennyiség</span>
        </li>
        {components.map((comp) => (
          <li key={comp.componentId} className={styles.listItem}>
            <span>{comp.componentName}</span>
            <span>{comp.quantity} db</span>
          </li>
        ))}
      </ul>
    </div>
  );
}