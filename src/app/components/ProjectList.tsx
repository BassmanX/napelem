// src/app/components/ProjectList.tsx
'use client';

import React from 'react';
import type { ProjectListData } from '@/app/api/projects/route'; // Típus importálása
import { Status } from '@prisma/client'; // Status enum importálása
import styles from '@/app/styles/ProjectList.module.css'; // Hozz létre CSS modult
import { closeProject } from '@/app/actions/projectActions'; 
import { useRouter } from 'next/navigation';

interface ProjectListProps {
    projects: ProjectListData[];
    // ÚJ: Callback függvény a modal nyitásához
    onOpenAssignModal: (projectId: number) => void;
    onOpenEstimateModal: (projectId: number) => void; // Későbbi A.5 funkcióhoz
    onOpenViewComponentsModal: (projectId: number) => void;
    onOpenCalcModal: (projectId: number) => void;
}

// Segédfüggvény a státuszok magyarításához/színezéséhez
function getStatusDisplay(status: Status): { text: string; color: string } {
    switch (status) {
        case Status.new: return { text: 'Új', color: '#6c757d' }; // gray
        case Status.draft: return { text: 'Piszkozat', color: '#ffc107' }; // yellow
        case Status.wait: return { text: 'Várakozás (Alkatrész)', color: '#fd7e14' }; // orange
        case Status.scheduled: return { text: 'Ütemezve', color: '#0d6efd' }; // blue
        case Status.inprogress: return { text: 'Folyamatban', color: '#0dcaf0' }; // cyan
        case Status.completed: return { text: 'Befejezve', color: '#198754' }; // green
        case Status.failed: return { text: 'Sikertelen', color: '#dc3545' }; // red
        default: return { text: status, color: '#6c757d' };
    }
}

export function ProjectList({ projects, onOpenAssignModal, onOpenEstimateModal, onOpenViewComponentsModal, onOpenCalcModal }: ProjectListProps) {
    const router = useRouter();

    if (!projects || projects.length === 0) {
        return <p>Nincsenek megjeleníthető projektek.</p>;
    }

    // --- Handler a projekt lezárásához ---
    const handleCloseProject = async (projectId: number, finalStatus: "completed" | "failed") => {
        const statusText = finalStatus === Status.completed ? "sikeresként" : "sikertelenként";
        // Megerősítő kérdés
        if (window.confirm(`Biztosan le akarja zárni a(z) ${projectId} ID-jű projektet ${statusText}?`)) {
            console.log(`Lezárás indítása: ID=${projectId}, Státusz=${finalStatus}`);
            try {
                const result = await closeProject(projectId, finalStatus); // Server Action hívása
                alert(result?.message || "Ismeretlen válasz a szervertől."); // Egyszerű visszajelzés
                if (result?.success) {
                    router.refresh(); // Lista frissítése sikeres zárás után
                }
            } catch (error) {
                 console.error("Hiba a closeProject action hívása közben:", error);
                 alert("Hiba történt a projekt lezárása közben.");
            }
        }
    };
    // ------------------------------------

    return (
        <div className={styles.tableContainer}>
            <table className={styles.projectTable}>
                <thead>
                    <tr>
                        <th className={styles.tableHeader}>ID</th>
                        <th className={styles.tableHeader}>Megrendelő</th>
                        <th className={styles.tableHeader}>Helyszín</th>
                        <th className={styles.tableHeader}>Státusz</th>
                        <th className={styles.tableHeader}>Leírás</th>
                        <th className={styles.tableHeader}>Műveletek</th>
                    </tr>
                </thead>
                <tbody>
                    {projects.map((project) => {
                        const statusInfo = getStatusDisplay(project.status);
                        // Meghatározzuk, hogy lehet-e szerkeszteni a komponenseket
                        const canAssignComponents = project.status === Status.new || project.status === Status.draft;
                        // Meghatározzuk, lehet-e becslést adni
                        const canAddEstimate = project.status === Status.draft; // Pl. csak piszkozatnál
                        const canCalculate = (project.status === Status.draft || project.status === Status.wait); // Feltétel a kalkulációhoz
                        const canBeClosed = project.status === Status.inprogress; // Pl. csak folyamatban lévőt

                        return (
                            <tr key={project.id} className={styles.tableRow}>
                                <td className={styles.tableCell}>{project.id}</td>
                                <td className={styles.tableCell}>{project.customerName}</td>
                                <td className={styles.tableCell}>{project.location}</td>
                                <td className={styles.tableCell}>
                                    <span
                                        className={styles.statusBadge}
                                        style={{ backgroundColor: statusInfo.color }}
                                    >
                                        {statusInfo.text}
                                    </span>
                                </td>
                                <td className={styles.tableCell} title={project.description}>
                                    {/* Rövidített leírás, teljes a title-ben */}
                                    {project.description.length > 50
                                        ? `${project.description.substring(0, 50)}...`
                                        : project.description}
                                </td>
                                <td className={styles.tableCell}>
                                    {/* Gombok az A.4 és A.5 funkciókhoz */}
                                     <button
                                         // Meghívjuk a propként kapott függvényt a projekt ID-val
                                         onClick={() => onOpenAssignModal(project.id)}
                                         className={`${styles.actionButton} ${styles.assignButton}`}
                                         title="Alkatrészek hozzárendelése"
                                         disabled={!canAssignComponents} // Letiltjuk, ha nem lehet
                                     >
                                         Alkatrészek
                                     </button>
                                    {/* ÚJ GOMB */}
                                     <button
                                         // Meghívjuk az ÚJ, propként kapott függvényt
                                         onClick={() => onOpenViewComponentsModal(project.id)} // Ezt a függvényt kell átadni!
                                         className={`${styles.actionButton} ${styles.viewButton}`} // Adj neki stílust
                                         title="Hozzárendelt alkatrészek megtekintése"
                                     >
                                         Megtekintés {/* Vagy egy szem ikon */}
                                     </button>
                                     <button
                                         onClick={() => onOpenEstimateModal(project.id)} // Ezt a propot hívja
                                         className={`${styles.actionButton} ${styles.estimateButton}`}
                                         title="Becslés rögzítése"
                                         disabled={project.status !== Status.draft} // Csak draft státusznál engedélyezett
                                     >
                                         Becslés
                                     </button>
                                     <button
                                         onClick={() => onOpenCalcModal(project.id)}
                                         className={`${styles.actionButton} ${styles.calculateButton}`} // Új CSS class kell!
                                         title="Árkalkuláció indítása"
                                         disabled={!canCalculate} // Letiltás feltétel alapján
                                     >
                                         Kalkuláció {/* Vagy ikon */}
                                     </button>
                                     {/* ÚJ: Lezáró Gombok */}
                                     <button
                                          onClick={() => handleCloseProject(project.id, Status.completed)}
                                          className={`${styles.actionButton} ${styles.completeButton}`} // Új CSS class
                                          title="Projekt sikeres befejezése"
                                          disabled={!canBeClosed} // Csak akkor aktív, ha zárható
                                     >
                                          Befejezés ✓
                                     </button>
                                     <button
                                          onClick={() => handleCloseProject(project.id, Status.failed)}
                                          className={`${styles.actionButton} ${styles.failButton}`} // Új CSS class
                                          title="Projekt sikertelen lezárása"
                                          disabled={!canBeClosed} // Csak akkor aktív, ha zárható
                                      >
                                          Lezárás ✕
                                     </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}