// src/app/components/ComponentPriceList.tsx
'use client';

import React, { useActionState, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { updateComponentPrice, type UpdatePriceFormState } from '@/app/actions/componentActions';
import styles from '@/app/styles/ComponentPriceList.module.css';

// --- TÍPUS DEFINÍCIÓJA ITT! ---
export type ComponentWithPriceString = {
  id: number;
  name: string;
  price: string; // Az ár stringként jön az API-tól
  maxQuantityPerRack: number;
};
// -----------------------------
// --- UpdateButton definíciója ITT, a fájl szintjén ---
function UpdateButton({ componentId }: { componentId: number }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.saveButton} aria-disabled={pending}>
      {pending ? 'Mentés...' : 'Mentés'}
    </button>
  );
}
// ----------------------------------------------------

// --- ComponentRow definíciója ---
function ComponentRow({ component }: { component: ComponentWithPriceString }) {
  // ... (ComponentRow többi kódja változatlan, használhatja az <UpdateButton />-t) ...
    const initialState: UpdatePriceFormState = undefined;
    const [state, formAction] = useActionState(updateComponentPrice, initialState);
    const [currentPrice, setCurrentPrice] = useState(component.price);

    const handlePriceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
       setCurrentPrice(event.target.value);
    };
    const messageStyle = state?.success ? styles.successMessage : styles.errorMessage;

    return (
      <tr className={styles.tableRow}>
        <td className={styles.tableCell}>{component.name}</td>
        <td className={styles.tableCell}>
          <form action={formAction} className={styles.priceForm}>
            {/* ... (inputok) ... */}
            <input type="hidden" name="componentId" value={component.id} />
            <input
              type="number" name="price" value={currentPrice}
              onChange={handlePriceChange} step="0.01" min="0" required
              className={styles.priceInput} aria-describedby={`price-error-${component.id}`}
            />
            {/* Az UpdateButton itt használva */}
            <UpdateButton componentId={component.id} />
            {/* ... (hibaüzenetek) ... */}
             {state?.componentId === component.id && state?.message && (
               <span className={`${messageStyle} ${styles.inlineMessage}`} aria-live="polite">
                   {state.message}
                    {state.errors?.price && state.errors.price.map((error: string) => (
                        <span key={error} className={styles.fieldError}> ({error})</span>
                    ))}
               </span>
             )}
              <div id={`price-error-${component.id}`} aria-live="polite" aria-atomic="true">
                   {state?.componentId === component.id && state?.errors?.price && state.errors.price.map((error: string) => (
                    <p key={error} className={styles.fieldErrorInline}>{error}</p>
                ))}
              </div>
          </form>
        </td>
        <td className={styles.tableCell}>{component.maxQuantityPerRack}</td>
      </tr>
    );
}
// ------------------------------


// --- Fő lista komponens (ComponentPriceList) ---
export function ComponentPriceList() {
    // ... (useEffect az adatlekérdezéshez, state-ek, táblázat renderelése) ...
     const [components, setComponents] = useState<ComponentWithPriceString[]>([]);
     const [isLoading, setIsLoading] = useState(true);
     const [error, setError] = useState<string | null>(null);

     useEffect(() => {
       async function fetchComponents() {
         // ... (fetch logika) ...
          setIsLoading(true);
           setError(null);
           try {
             const response = await fetch('/api/components');
             if (!response.ok) {
               let errorMsg = `Hiba történt (${response.status})`;
               try {
                   const errorData = await response.json();
                   errorMsg = errorData.message || errorMsg;
               } catch (e) { /* Nem baj, ha nem JSON */ }
               throw new Error(errorMsg);
             }
             const data: ComponentWithPriceString[] = await response.json();
             setComponents(data);
           } catch (err: any) {
             console.error("Hiba a komponensek lekérdezésekor:", err);
             setError(err.message || 'Ismeretlen hiba történt a lekérdezés során.');
           } finally {
             setIsLoading(false);
           }
       }
       fetchComponents();
     }, []);

     if (isLoading) return <p>Alkatrészlista betöltése...</p>;
     if (error) return <p style={{ color: 'red' }}>Hiba a lista betöltésekor: {error}</p>;
     if (components.length === 0) return <p>Nincsenek alkatrészek a rendszerben.</p>;

     return (
         <div className={styles.tableContainer}>
           <table className={styles.priceTable}>
             <thead>
               <tr>
                 <th className={styles.tableHeader}>Név</th>
                 <th className={styles.tableHeader}>Ár (Ft) és Mentés</th>
                  <th className={styles.tableHeader}>Max/Rekesz</th>
               </tr>
             </thead>
             <tbody>
               {components.map((component) => (
                 <ComponentRow key={component.id} component={component} />
               ))}
             </tbody>
           </table>
         </div>
       );
}
// ----------------------------------------