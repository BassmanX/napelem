// src/app/components/ComponentPriceList.tsx
'use client';

import React, { useActionState, useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { updateComponentDetails, type UpdateComponentFormState } from '@/app/actions/componentActions';
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
    const initialState: UpdateComponentFormState = undefined;
    const [state, formAction] = useActionState<UpdateComponentFormState, FormData>(updateComponentDetails, initialState);
    const [currentPrice, setCurrentPrice] = useState(component.price);
    const [currentMaxQty, setCurrentMaxQty] = useState(component.maxQuantityPerRack.toString()); // Kezeljük stringként az inputban

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => setCurrentPrice(e.target.value);
    const handleMaxQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => setCurrentMaxQty(e.target.value);
    
    const messageStyle = state?.success ? styles.successMessage : styles.errorMessage;

    return (
      <tr className={styles.tableRow}>
        {/* Név Cella */}
        <td className={styles.tableCell}>{component.name}</td>
  
        {/* Ár és Max/Rekesz Cella (formmal) */}
        <td className={styles.tableCell}>
          <form action={formAction} className={styles.editForm}> {/* Új class a formnak? */}
            <input type="hidden" name="componentId" value={component.id} />
  
            {/* Ár Input */}
            <div className={styles.inputWrapper}>
                <label htmlFor={`price-${component.id}`} className={styles.inputLabel}>Ár:</label>
                <input
                  id={`price-${component.id}`}
                  type="number" name="price" value={currentPrice}
                  onChange={handlePriceChange} step="0.01" min="0" required
                  className={styles.editInput} // Közös input stílus
                  aria-describedby={`price-error-${component.id}`}
                />
                 <div id={`price-error-${component.id}`} className={styles.fieldErrorContainer}>
                   {state?.componentId === component.id && state?.errors?.price?.map(e => <p key={e} className={styles.fieldErrorInline}>{e}</p>)}
                 </div>
            </div>
  
            {/* Max/Rekesz Input */}
            <div className={styles.inputWrapper}>
                <label htmlFor={`maxqty-${component.id}`} className={styles.inputLabel}>Max/Rekesz:</label>
                <input
                  id={`maxqty-${component.id}`}
                  type="number" name="maxQuantityPerRack" value={currentMaxQty}
                  onChange={handleMaxQtyChange} min="1" step="1" required
                  className={styles.editInput} // Közös input stílus
                  aria-describedby={`maxqty-error-${component.id}`}
                />
                <div id={`maxqty-error-${component.id}`} className={styles.fieldErrorContainer}>
                  {state?.componentId === component.id && state?.errors?.maxQuantityPerRack?.map(e => <p key={e} className={styles.fieldErrorInline}>{e}</p>)}
                </div>
            </div>
  
            {/* Mentés Gomb */}
            <div className={styles.buttonWrapper}>
               <UpdateButton componentId={component.id} />
            </div>
  
  
            {/* Általános Visszajelzés ehhez a sorhoz */}
            {state?.componentId === component.id && state?.message && (
              <span className={`${messageStyle} ${styles.inlineMessage}`} aria-live="polite">
                  {state.message}
              </span>
            )}
  
          </form>
        </td>
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
              <th className={styles.tableHeader}>Szerkesztés (Ár Ft, Max/Rekesz db)</th>
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