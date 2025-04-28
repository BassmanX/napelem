// src/app/components/dashboards/RaktarosDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import styles from '@/app/styles/RaktarosDashboard.module.css'; // Hozz létre CSS-t
import { RaktarosProjectList } from '@/app/components/RaktarosProjectList'; // Új lista import
import { PickingListComponent } from '@/app/components/PickingListComponent'; // Új komponens
import type { ProjectListData } from '@/app/api/projects/route'; // Közös típus

const RaktarosDashboard = () => {
  const [projects, setProjects] = useState<ProjectListData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePickingProjectId, setActivePickingProjectId] = useState<number | null>(null);

  useEffect(() => {
    if (activePickingProjectId === null) {
    async function fetchScheduledProjects() {
      setIsLoading(true); setError(null);
      try {
        // API hívása a 'scheduled' szűrővel
        const response = await fetch('/api/projects?status=scheduled');
        if (!response.ok) { /* ... Hiba ... */ throw new Error('...'); }
        const data: ProjectListData[] = await response.json();
        setProjects(data);
      } catch (err: any) { setError(err.message); }
      finally { setIsLoading(false); }
    }
    fetchScheduledProjects();
    }
  }, [activePickingProjectId]);

  // Függvény, amit a RaktarosProjectList hív meg kiválasztáskor
  const handleProjectSelectedForPicking = (projectId: number) => {
      setActivePickingProjectId(projectId);
  };

  // Függvény, amit a PickingListComponent hív meg, ha végzett
  const handlePickingComplete = () => {
      setActivePickingProjectId(null); // Visszaváltunk a listára
      // Itt lehetne újra fetchelni, de az useEffect [activePickingProjectId] miatt újra lefut
  };

  return (
    <div className={styles.dashboardContainer}>
      <h2>Raktáros Műszerfal</h2>
      <p className={styles.description}>
         {activePickingProjectId === null
             ? "Projektek előkészítése kivételezéshez."
             : `Projekt (ID: ${activePickingProjectId}) kivételezése folyamatban.`}
      </p>

      <div className={styles.contentArea}> {/* Tartalom területe */}
        {isLoading && <p>Betöltés...</p>}
        {error && <p style={{ color: 'red' }}>Hiba: {error}</p>}
        {!isLoading && !error && (
            // Feltételes renderelés
            activePickingProjectId === null ? (
                // Ha nincs aktív projekt, a listát mutatjuk
                <>
                    <h3>Kivételezésre Váró Projektek ('Scheduled')</h3>
                    <RaktarosProjectList
                        projects={projects}
                        onProjectSelected={handleProjectSelectedForPicking} // Átadjuk a handlert
                    />
                </>
            ) : (
                // Ha van aktív projekt, a kivételezési listát mutatjuk
                <PickingListComponent
                    projectId={activePickingProjectId}
                    onPickingComplete={handlePickingComplete} // Átadjuk a handlert
                />
            )
        )}
      </div>
    </div>
  );
};

export default RaktarosDashboard;