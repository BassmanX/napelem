// src/app/components/NewProjectForm.tsx
'use client';

import React, { useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createProject, type NewProjectFormState } from '@/app/actions/projectActions'; // Új action importálása
import styles from '@/app/styles/ReceiveStockForm.module.css'; // Használj közös vagy saját CSS modult

// Submit gomb
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={styles.submitButton} aria-disabled={pending}>
      {pending ? 'Létrehozás...' : 'Projekt Létrehozása'}
    </button>
  );
}

interface NewProjectFormProps {
    onFormSubmitSuccess?: () => void; // Callback a modal bezárásához
}

export function NewProjectForm({ onFormSubmitSuccess }: NewProjectFormProps) {
  const initialState: NewProjectFormState = undefined;
  const [state, formAction] = useActionState(createProject, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Sikeres beküldés utáni teendők (form ürítés, modal bezárás)
  useEffect(() => {
     if (state?.success) {
       formRef.current?.reset();
       if (onFormSubmitSuccess) {
         onFormSubmitSuccess();
         // Opcionális: Sikeres üzenet megjelenítése (pl. toast notification)
         alert('Projekt sikeresen létrehozva!'); // Egyszerű alert példaként
       }
     }
   }, [state, onFormSubmitSuccess]);

  return (
    <form ref={formRef} action={formAction} className={styles.form}>
       {/* Hibaüzenet */}
       {state?.message && !state.success && (
         <p className={styles.errorMessage} aria-live="polite">{state.message}</p>
       )}

      {/* Megrendelő Neve */}
      <div className={styles.inputGroup}>
        <label htmlFor="customerName" className={styles.label}>Megrendelő Neve:</label>
        <input type="text" id="customerName" name="customerName" required className={styles.input} aria-describedby="customerName-error"/>
        <div id="customerName-error">{state?.errors?.customerName?.map(e => <p key={e} className={styles.fieldError}>{e}</p>)}</div>
      </div>

       {/* Helyszín */}
       <div className={styles.inputGroup}>
           <label htmlFor="location" className={styles.label}>Helyszín (Cím):</label>
           <input type="text" id="location" name="location" placeholder="1234 Lekváros Példa utca 1." required className={styles.input} aria-describedby="location-error"/>
           <div id="location-error">{state?.errors?.location?.map(e => <p key={e} className={styles.fieldError}>{e}</p>)}</div>
       </div>

       {/* Leírás */}
       <div className={styles.inputGroup}>
            <label htmlFor="description" className={styles.label}>Leírás (Opcionális):</label>
            <textarea id="description" name="description" rows={3} className={styles.textarea} aria-describedby="description-error"></textarea>
            <div id="description-error">{state?.errors?.description?.map(e => <p key={e} className={styles.fieldError}>{e}</p>)}</div>
       </div>

      <SubmitButton />
    </form>
  );
}
