// src/app/components/AssignComponentsForm.tsx
'use client';

import React, { useState, useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { assignComponentsToProject, type AssignComponentsFormState } from '@/app/actions/projectActions';
import styles from '@/app/styles/AssignComponentsForm.module.css'; // Hozz létre CSS-t!
import { useRouter } from 'next/navigation';

type ComponentOption = { id: number; name: string; }; // Alkatrész opció típusa

interface AssignComponentsFormProps {
    projectId: number; // Melyik projekthez rendelünk
    onFormSubmitSuccess?: () => void; // Callback bezáráshoz
}

// --- Submit Gomb ---
function SubmitButton() {
  const { pending } = useFormStatus();
  return ( <button type="submit" disabled={pending} className={styles.submitButton}>{pending ? 'Mentés...' : 'Hozzárendelés Mentése'}</button> );
}

export function AssignComponentsForm({ projectId, onFormSubmitSuccess }: AssignComponentsFormProps) {
  const initialState: AssignComponentsFormState = undefined;
  const [state, formAction] = useActionState(assignComponentsToProject, initialState);

  const [availableComponents, setAvailableComponents] = useState<ComponentOption[]>([]); // Választható alkatrészek
  const [selectedItems, setSelectedItems] = useState<{ componentId: string; quantity: string }[]>([{ componentId: '', quantity: '1' }]); // Hozzárendelendő tételek
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Alkatrészlista lekérdezése
  useEffect(() => {
    async function loadComponents() {
      setIsLoading(true); setError(null);
      try {
        const response = await fetch('/api/components-status?fields=id,name'); // Egyszerűsített komponens lista
        if (!response.ok) throw new Error('Alkatrészek lekérdezése sikertelen.');
        const data = await response.json();
        setAvailableComponents(data);
      } catch (err: any) { setError(err.message); }
      finally { setIsLoading(false); }
    }
    loadComponents();
  }, []);

  // Sikeres action után bezárás
  useEffect(() => {
    if (state?.success) {
      alert(state.message); // Vagy jobb visszajelzés
      // ---> router.refresh() HÍVÁSA ITT <---
      console.log("AssignComponentsForm: Action sikeres, router.refresh() hívása...");
      router.refresh();
      // ----------------------------------
      if (onFormSubmitSuccess) onFormSubmitSuccess();
    }
  }, [state, onFormSubmitSuccess, router]);

  // --- Sor Kezelő Függvények ---
  const handleItemChange = (index: number, field: 'componentId' | 'quantity', value: string) => {
    const newItems = [...selectedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setSelectedItems(newItems);
  };

  const handleAddItem = () => {
    setSelectedItems([...selectedItems, { componentId: '', quantity: '1' }]);
  };

  const handleRemoveItem = (index: number) => {
    // Csak akkor engedjük törölni, ha több mint egy sor van
    if (selectedItems.length > 1) {
      const newItems = selectedItems.filter((_, i) => i !== index);
      setSelectedItems(newItems);
    }
  };
  // -------------------------

  if (isLoading) return <p>Alkatrészlista betöltése...</p>;
  if (error) return <p style={{ color: 'red' }}>Hiba: {error}</p>;

  return (
    <form action={formAction} className={styles.form}>
      {/* Projekt ID rejtett mezőben */}
      <input type="hidden" name="projectId" value={projectId} />
      {/* Komponens lista JSON stringként rejtett mezőben */}
      {/* Csak azokat küldjük, ahol van componentId és a quantity > 0 */}
      <input type="hidden" name="components" value={JSON.stringify(
          selectedItems.filter(item => item.componentId && parseInt(item.quantity, 10) > 0)
                       .map(item => ({ componentId: parseInt(item.componentId, 10), quantity: parseInt(item.quantity, 10) }))
      )} />

      <h3 className={styles.formSubtitle}>Hozzárendelendő Alkatrészek</h3>

      {/* Általános hibaüzenet */}
      {state?.message && !state.success && (<p className={styles.errorMessage}>{state.message}</p>)}

      {/* Dinamikus Sorok */}
      {selectedItems.map((item, index) => (
        <div key={index} className={styles.itemRow}>
          {/* Komponens választó */}
          <div className={styles.itemSelect}>
            <label htmlFor={`componentId-${index}`} className={styles.itemLabel}>Alkatrész:</label>
            <select
              id={`componentId-${index}`}
              value={item.componentId}
              onChange={(e) => handleItemChange(index, 'componentId', e.target.value)}
              required
              className={styles.select}
            >
              <option value="">Válasszon...</option>
              {availableComponents.map(comp => (
                <option key={comp.id} value={comp.id}>{comp.name}</option>
              ))}
            </select>
          </div>
          {/* Mennyiség */}
          <div className={styles.itemQuantity}>
             <label htmlFor={`quantity-${index}`} className={styles.itemLabel}>Mennyiség:</label>
             <input
                id={`quantity-${index}`}
                type="number"
                value={item.quantity}
                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                min="1" step="1" required
                className={styles.input}
              />
          </div>
           {/* Sor Törlése Gomb */}
           <div className={styles.itemAction}>
                <button
                    type="button"
                    onClick={() => handleRemoveItem(index)}
                    className={styles.removeButton}
                    disabled={selectedItems.length <= 1} // Nem törölhető, ha csak 1 sor van
                    title="Sor törlése"
                >
                    &times; {/* X szimbólum */}
                </button>
           </div>
        </div>
      ))}

      {/* Új Sor Hozzáadása Gomb */}
      <button type="button" onClick={handleAddItem} className={styles.addButton}>
        + Új Alkatrész Sor
      </button>

      {/* Mentés Gomb */}
      <div style={{marginTop: '20px'}}>
         <SubmitButton />
      </div>
    </form>
  );
}