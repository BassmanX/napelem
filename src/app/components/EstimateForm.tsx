// src/app/components/EstimateForm.tsx
'use client';

import React, { useEffect, useRef, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addProjectEstimate, type EstimateFormState } from '@/app/actions/projectActions';
import styles from '@/app/styles/ReceiveStockForm.module.css'; // Használj közös vagy saját CSS-t

// Submit Gomb
function SubmitButton() {
  const { pending } = useFormStatus();
  return ( <button type="submit" disabled={pending} className={styles.submitButton}>{pending ? 'Mentés...' : 'Becslés Mentése'}</button> );
}

interface EstimateFormProps {
    projectId: number;
    onFormSubmitSuccess?: () => void;
}

export function EstimateForm({ projectId, onFormSubmitSuccess }: EstimateFormProps) {
  const initialState: EstimateFormState = undefined;
  const [state, formAction] = useActionState(addProjectEstimate, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // Sikeres mentés után modal bezárása
  useEffect(() => {
     if (state?.success) {
       // formRef.current?.reset(); // Reset nem feltétlen kell itt
       alert(state.message); // Vagy jobb visszajelzés
       if (onFormSubmitSuccess) {
         onFormSubmitSuccess();
       }
     }
   }, [state, onFormSubmitSuccess]);

  return (
    <form ref={formRef} action={formAction} className={styles.form}>
       {/* Projekt ID rejtett mezőben */}
      <input type="hidden" name="projectId" value={projectId} />

       {/* Hibaüzenet */}
       {state?.message && !state.success && (
         <p className={styles.errorMessage} aria-live="polite">{state.message}</p>
       )}

      {/* Becsült Idő */}
      <div className={styles.inputGroup}>
          <label htmlFor="estimatedTime" className={styles.label}>Becsült Idő (óra):</label>
          <input
            type="number" id="estimatedTime" name="estimatedTime"
            min="0" step="1" // Egész órák
            className={styles.input} aria-describedby="estimatedTime-error"
            // Ide lehetne a projekt jelenlegi értékét betölteni, ha szerkeszteni is akarunk
          />
          <div id="estimatedTime-error">{state?.errors?.estimatedTime?.map(e => <p key={e} className={styles.fieldError}>{e}</p>)}</div>
      </div>

       {/* Munkadíj */}
       <div className={styles.inputGroup}>
            <label htmlFor="workFee" className={styles.label}>Munkadíj (Ft):</label>
            <input
               type="number" id="workFee" name="workFee"
               min="0" step="1" // Lehet tizedes is
               className={styles.input} aria-describedby="workFee-error"
                // Ide lehetne a projekt jelenlegi értékét betölteni
             />
            <div id="workFee-error">{state?.errors?.workFee?.map(e => <p key={e} className={styles.fieldError}>{e}</p>)}</div>
       </div>

      <SubmitButton />
    </form>
  );
}