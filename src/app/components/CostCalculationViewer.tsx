// src/app/components/CostCalculationViewer.tsx
'use client';

import React from 'react';
import type { CalculationResultState } from '@/app/actions/projectActions'; // Importáljuk a state típust
import styles from '@/app/styles/CostCalculationViewer.module.css'; // Hozz létre CSS-t!

interface CostCalculationViewerProps {
    isLoading: boolean;
    result: CalculationResultState; // A Server Action visszatérési értéke (lehet null is)
}

export function CostCalculationViewer({ isLoading, result }: CostCalculationViewerProps) {

    if (isLoading) {
        return <div className={styles.loading}>Árkalkuláció folyamatban...</div>;
    }

    if (!result) {
        // Ez akkor lehet, ha még el sem indult a számítás, vagy hiba történt az indításkor
        return <div className={styles.info}>Kalkuláció indítása...</div>;
    }

    if (!result.success) {
        return (
            <div className={styles.errorContainer}>
                <h4>Árkalkuláció Sikertelen</h4>
                <p>{result.message || "Ismeretlen hiba."}</p>
                {result.missingComponents && result.missingComponents.length > 0 && (
                    <div>
                        <p>Hiányzó alkatrészek:</p>
                        <ul className={styles.missingList}>
                            {result.missingComponents.map(item => (
                                <li key={item.name}>
                                    {item.name} (Szükséges: {item.required}, Elérhető: {item.available})
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    }

    // Sikeres eset
    return (
        <div className={styles.successContainer}>
             <h4>Árkalkuláció Eredménye</h4>
             {result.message && <p className={styles.successMessage}>{result.message}</p>}
             <div className={styles.costTable}>
                <div><span>Alkatrészek Költsége:</span> <span>{result.componentCost ?? 'N/A'} Ft</span></div>
                <div><span>Munkadíj:</span> <span>{result.workFee ?? 'N/A'} Ft</span></div>
                <div className={styles.totalRow}><span>Összesen:</span> <span>{result.totalCost ?? 'N/A'} Ft</span></div>
             </div>
             {result.newStatus && <p>A projekt új státusza: <strong>{result.newStatus.toUpperCase()}</strong></p>}
        </div>
    );
}