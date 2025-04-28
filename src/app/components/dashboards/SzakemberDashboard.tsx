// src/app/components/dashboards/SzakemberDashboard.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link'; 
import styles from '@/app/styles/RaktarvezetoDashboard.module.css'; // Hozz létre egy CSS modult ehhez is
import Modal from '@/app/components/Modal';
import { NewProjectForm } from '@/app/components/NewProjectForm'; // Új form importálása
import type { Status } from '@prisma/client';
import { ProjectList } from '@/app/components/ProjectList';
import { SzakemberComponentList } from '@/app/components/SzakemberComponentList';
import { AssignComponentsForm } from '@/app/components/AssignComponentsForm';
import { ProjectDetailsViewer } from '@/app/components/ProjectDetailsViewer';
import { EstimateForm } from '@/app/components/EstimateForm';
import { CostCalculationViewer } from '@/app/components/CostCalculationViewer';
import { calculateProjectCost, type CalculationResultState } from '@/app/actions/projectActions';
import { useRouter } from 'next/navigation'

// Props interfész kiegészítése (már tartalmazza a modal nyitókat)
interface SzakemberDashboardProps {
  projects: ProjectListData[];
  // onOpenAssignModal: (projectId: number) => void; // Ezek már benne vannak a ProjectList props-ban
  // onOpenEstimateModal: (projectId: number) => void;
  // onOpenViewComponentsModal: (projectId: number) => void; // Ezt is át kell adni a ProjectList-nek
}

export type ProjectListData = {
  id: number;
  customerName: string;
  location: string;
  status: Status;
  description: string;
};


const SzakemberDashboard = ({ projects: initialProjectsData }: /* ... */ any) => {
  const router = useRouter();
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isComponentListModalOpen, setIsComponentListModalOpen] = useState(false);
  const handleCloseNewProjectModal = () => {
    setIsNewProjectModalOpen(false);
    router.refresh();
  };
  const handleCloseComponentListModal = () => setIsComponentListModalOpen(false);
  const [projects, setProjects] = useState<ProjectListData[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedProjectIdForAssign, setSelectedProjectIdForAssign] = useState<number | null>(null);
  const [isViewComponentsModalOpen, setIsViewComponentsModalOpen] = useState(false);
  const [selectedProjectIdForView, setSelectedProjectIdForView] = useState<number | null>(null);
  const [isEstimateModalOpen, setIsEstimateModalOpen] = useState(false);
  const [selectedProjectIdForEstimate, setSelectedProjectIdForEstimate] = useState<number | null>(null);

  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [selectedProjectIdForCalc, setSelectedProjectIdForCalc] = useState<number | null>(null);
  const [calculationResult, setCalculationResult] = useState<CalculationResultState>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  
  const handleOpenAssignModal = (projectId: number) => {
    setSelectedProjectIdForAssign(projectId);
    setIsAssignModalOpen(true);
  };
  const handleCloseAssignModal = () => {
    setIsAssignModalOpen(false);
    setSelectedProjectIdForAssign(null); // Reseteljük az ID-t bezáráskor
  };

  const handleOpenViewComponentsModal = (projectId: number) => {
    setSelectedProjectIdForView(projectId);
    setIsViewComponentsModalOpen(true);
  };
  const handleCloseViewComponentsModal = () => {
    setIsViewComponentsModalOpen(false);
    setSelectedProjectIdForView(null);
  };

  // Új handlerek a becslés modalhoz
  const handleOpenEstimateModal = (projectId: number) => {
      setSelectedProjectIdForEstimate(projectId);
      setIsEstimateModalOpen(true);
  };
  const handleCloseEstimateModal = () => {
      setIsEstimateModalOpen(false);
      setSelectedProjectIdForEstimate(null);
  };

  // --- A fetchProjects függvény definíciója ---
  // Használjunk useCallback-et, hogy ne definiálódjon újra feleslegesen
  const fetchProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    setProjectError(null);
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) { /* ... Hiba ... */ throw new Error('...'); }
      const data: ProjectListData[] = await response.json();
      setProjects(data);
    } catch (err: any) { /* ... Hiba ... */ }
    finally { setIsLoadingProjects(false); }
  }, []); // Üres függőség, mert a fetch maga nem függ külső változótól

  // --- Első lekérdezés mountoláskor ---
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]); // fetchProjects most már a dependency


  // --- Kalkuláció indítása ÉS UTÁNA ÚJRAHÍVÁS ---
  const handleOpenCalcModal = useCallback(async (projectId: number) => {
      setSelectedProjectIdForCalc(projectId);
      setIsCalcModalOpen(true);
      setIsCalculating(true);
      setCalculationResult(null);
      let result: CalculationResultState = null; // Változó az eredménynek
      try {
          result = await calculateProjectCost(projectId);
          setCalculationResult(result);

          // ---> ITT AZ ÚJ RÉSZ: Sikeres kalkuláció után frissítjük a listát <---
          if (result?.success) {
              console.log("Kalkuláció sikeres, projektlista újratöltése...");
              await fetchProjects(); // Meghívjuk újra a lekérdező függvényt
          }
          // --------------------------------------------------------------------

      } catch (error) {
          console.error("Hiba a calculateProjectCost hívása közben:", error);
          setCalculationResult({ success: false, message: "Kliens oldali hiba a kalkuláció indításakor." });
      } finally {
          setIsCalculating(false);
      }
  }, [fetchProjects]); // Most már függ a fetchProjects-től is!

const handleCloseCalcModal = () => {
    setIsCalcModalOpen(false);
    setSelectedProjectIdForCalc(null);
    setCalculationResult(null); // Eredmény törlése bezáráskor
};




    // --- Adatlekérdezés useEffect-ben ---
  useEffect(() => {
    async function fetchProjects() {
      setIsLoadingProjects(true);
      setProjectError(null);
      try {
        const response = await fetch('/api/projects'); // Hívjuk az API végpontot
        if (!response.ok) {
          let errorMsg = `Hiba a projektek lekérdezésekor (${response.status})`;
           try { const data = await response.json(); errorMsg = data.message || errorMsg; } catch(e){}
          throw new Error(errorMsg);
        }
        const data: ProjectListData[] = await response.json();
        setProjects(data);
      } catch (err: any) {
        console.error("Projekt lekérdezési hiba:", err);
        setProjectError(err.message || 'Ismeretlen hiba történt.');
      } finally {
        setIsLoadingProjects(false);
      }
    }
    fetchProjects(); // Lekérdezés indítása
  }, []); // Üres függőségi lista: csak mountoláskor fut le
  // --

  return (
    // Használjuk a CSS modul class neveit
    <div className={styles.dashboardContainer}>
      <h2>Szakember Műszerfal</h2>
      <p className={styles.description}>Projektmenedzsment és adatrögzítés.</p>

      <div className={styles.gridContainer}>
        {/* A.1: Új Projekt Létrehozása */}
        <div className={styles.card}> {/* <-- .card class */}
          <h3 className={styles.cardTitle}>Új Projekt Indítása</h3> {/* <-- .cardTitle class */}
          <p className={styles.cardDescription}>Új napelem projekt rögzítése a rendszerben megrendelői adatokkal és helyszínnel.</p> {/* <-- .cardDescription class */}
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className={styles.cardLink} // <-- .cardLink class
          >
            Új Projekt
          </button>
        </div>
        {/* A.3: Alkatrészek Listázása Kártya/Gomb */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Alkatrész Készlet</h3>
          <p className={styles.cardDescription}>Elérhető alkatrészek, árak és raktárkészlet ellenőrzése.</p>
          <button
            onClick={() => setIsComponentListModalOpen(true)}
            className={styles.cardLink}
          >
            Készlet Megtekintése
          </button>
        </div>

         {/* ... Ide jöhetnek majd később kártyák az A.4, A.5 gyors eléréséhez ... */}

      </div>

      {/* Projekt Lista - Átadjuk az új handlert is */}
      <div className={styles.projectListSection} /*...*/ >
        <h3>Aktuális Projektek</h3>
        <ProjectList
            projects={projects}
            onOpenAssignModal={handleOpenAssignModal}
            onOpenEstimateModal={handleOpenEstimateModal} // Itt adjuk át
            onOpenViewComponentsModal={handleOpenViewComponentsModal}
            onOpenCalcModal={handleOpenCalcModal}
        />
      </div>

      {/* Új Projekt Modal */}
      <Modal
        isOpen={isNewProjectModalOpen}
        onClose={handleCloseNewProjectModal}
        title="Új Projekt Létrehozása"
      >
        <NewProjectForm onFormSubmitSuccess={handleCloseNewProjectModal} />
      </Modal>

      {/* ÚJ: Alkatrész Lista Modal */}
      <Modal
        isOpen={isComponentListModalOpen}
        onClose={handleCloseComponentListModal}
        title="Alkatrészek és Elérhetőség">
        <SzakemberComponentList />
      </Modal>
      {/* ÚJ: Alkatrész Hozzárendelés Modal */}
      {selectedProjectIdForAssign !== null && ( // Csak akkor rendereljük, ha van ID
           <Modal
             isOpen={isAssignModalOpen}
             onClose={handleCloseAssignModal}
             title={`Alkatrészek Hozzárendelése (Projekt ID: ${selectedProjectIdForAssign})`}
           >
             <AssignComponentsForm
                 projectId={selectedProjectIdForAssign}
                 onFormSubmitSuccess={handleCloseAssignModal}
             />
           </Modal>
      )}

            {/* ÚJ: Hozzárendelt Alkatrészek Megtekintése Modal */}
            {selectedProjectIdForView !== null && (
           <Modal
             isOpen={isViewComponentsModalOpen}
             onClose={handleCloseViewComponentsModal}
             title={`Hozzárendelt Alkatrészek (Projekt ID: ${selectedProjectIdForView})`}
           >
             <ProjectDetailsViewer projectId={selectedProjectIdForView} />
           </Modal>
      )}

       {/* ÚJ: Becslés Modal */}
       {selectedProjectIdForEstimate !== null && (
           <Modal
             isOpen={isEstimateModalOpen}
             onClose={handleCloseEstimateModal}
             title={`Becslés Rögzítése (Projekt ID: ${selectedProjectIdForEstimate})`}
           >
             <EstimateForm
                 projectId={selectedProjectIdForEstimate}
                 onFormSubmitSuccess={handleCloseEstimateModal}
             />
           </Modal>
      )}

        {/* ÚJ: Árkalkuláció Modal */}
        {selectedProjectIdForCalc !== null && (
           <Modal
             isOpen={isCalcModalOpen}
             onClose={handleCloseCalcModal}
             title={`Árkalkuláció (Projekt ID: ${selectedProjectIdForCalc})`}
           >
             <CostCalculationViewer
                 isLoading={isCalculating}
                 result={calculationResult}
             />
           </Modal>
      )} 


    </div>
  );
};

export default SzakemberDashboard;