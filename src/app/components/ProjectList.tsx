// src/app/components/ProjectList.tsx
'use client';

import React from 'react';
import type { ProjectListData } from '@/app/api/projects/route'; // Típus importálása
import { Status } from '@prisma/client'; // Status enum importálása
import styles from '@/app/styles/ProjectList.module.css'; // Hozz létre CSS modult

interface ProjectListProps {
    projects: ProjectListData[];
    // ÚJ: Callback függvény a modal nyitásához
    onOpenAssignModal: (projectId: number) => void;
    onOpenEstimateModal: (projectId: number) => void; // Későbbi A.5 funkcióhoz
    onOpenViewComponentsModal: (projectId: number) => void;
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

export function ProjectList({ projects, onOpenAssignModal, onOpenEstimateModal, onOpenViewComponentsModal }: ProjectListProps) {

    if (!projects || projects.length === 0) {
        return <p>Nincsenek megjeleníthető projektek.</p>;
    }

    // Későbbi funkciókhoz (A.4, A.5) szükséges lehet state vagy függvények itt

    const handleAssignComponents = (projectId: number) => {
        // TODO: Modális ablak nyitása alkatrész hozzárendeléshez (A.4)
        console.log(`Alkatrészek hozzárendelése ehhez: ${projectId}`);
        alert(`TODO: Modal nyitása az alkatrészek hozzárendeléséhez (ID: ${projectId})`);
    };

     const handleAddEstimate = (projectId: number) => {
        // TODO: Modális ablak nyitása becslés hozzáadásához (A.5)
        console.log(`Becslés hozzáadása ehhez: ${projectId}`);
         alert(`TODO: Modal nyitása a becslések rögzítéséhez (ID: ${projectId})`);
    };


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
                                      {/* Ide jöhet még pl. "Részletek" gomb */}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}