// src/app/components/RaktarosProjectList.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectListData } from '@/app/api/projects/route'; // Használj közös típust!
import { Status } from '@prisma/client';
import styles from '@/app/styles/ProjectList.module.css'; // Újrahasználhatjuk a stílusokat
// Új action importálása
import { startPickingProject } from '@/app/actions/projectActions'; // Vagy ahova tetted

// Ugyanaz a props interfész, de a callbackek nem kellenek
interface RaktarosProjectListProps {
    projects: ProjectListData[];
    onProjectSelected: (projectId: number) => void; // ÚJ PROP
}

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

export function RaktarosProjectList({ projects, onProjectSelected }: RaktarosProjectListProps) {
    const router = useRouter();

    if (!projects || projects.length === 0) {
        return <p>Nincsenek kivételezésre váró ('Scheduled') projektek.</p>;
    }

    // Handler a kivételezés indításához
    const handleStartPicking = async (projectId: number) => {
        if (window.confirm(`Biztosan el akarja kezdeni a(z) ${projectId} ID-jű projekt kivételezését? A státusz 'InProgress'-re vált.`)) {
            try {
                const result = await startPickingProject(projectId);
                // alert(result?.message || "..."); // Alert helyett
                if (result?.success) {
                    console.log(`Projekt ${projectId} kivátelezésre kiválasztva.`);
                    onProjectSelected(projectId); // Meghívjuk a szülő függvényét az ID-val
                    // router.refresh(); // Erre már nincs szükség, mert a szülő vált nézetet
                } else {
                     alert(result?.message || "Hiba történt."); // Hiba esetén alert
                }
            } catch (error) {
                console.error("Hiba a startPickingProject hívása közben:", error);
                alert("Hiba történt a kivételezés indítása közben.");
            }
        }
    };

    return (
        <div className={styles.tableContainer}>
            <table className={styles.projectTable}>
                <thead>
                    <tr>
                        <th className={styles.tableHeader}>ID</th>
                        <th className={styles.tableHeader}>Megrendelő</th>
                        <th className={styles.tableHeader}>Helyszín</th>
                        <th className={styles.tableHeader}>Leírás</th>
                        <th className={styles.tableHeader}>Művelet</th>
                    </tr>
                </thead>
                <tbody>
                    {projects.map((project) => {
                        // A Raktárosnak csak a 'Scheduled' státuszúakat kellene látnia, de a biztonság kedvéért ellenőrizzük
                        if (project.status !== Status.scheduled) return null;

                        return (
                            <tr key={project.id} className={styles.tableRow}>
                                <td className={styles.tableCell}>{project.id}</td>
                                <td className={styles.tableCell}>{project.customerName}</td>
                                <td className={styles.tableCell}>{project.location}</td>
                                <td className={styles.tableCell} title={project.description}>
                                    {project.description.length > 50 ? `${project.description.substring(0, 50)}...` : project.description}
                                </td>
                                <td className={styles.tableCell}>
                                     <button
                                         onClick={() => handleStartPicking(project.id)}
                                         className={`${styles.actionButton} ${styles.pickingButton}`} // Új class
                                         title="Projekt kivételezésének indítása"
                                     >
                                         Kivételezés Indítása
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