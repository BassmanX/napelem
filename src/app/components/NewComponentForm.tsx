// src/app/components/NewComponentForm.tsx
'use client';

import React, { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
// Győződj meg róla, hogy az elérési út helyes!
import { createComponent, type FormState } from '@/app/actions/componentActions';
// Importáljuk a CSS Modult
import styles from '@/app/styles/NewComponentForm.module.css';

// Külön komponens a Submit gombnak
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      // Használjuk a CSS modul class nevét
      className={styles.submitButton}
      aria-disabled={pending}
    >
      {pending ? 'Mentés...' : 'Alkatrész Mentése'}
    </button>
  );
}

// Props típus kiegészítése
interface NewComponentFormProps {
    onFormSubmitSuccess?: () => void; // Callback sikeres küldés után
}

export function NewComponentForm({ onFormSubmitSuccess }: NewComponentFormProps) {
    const initialState: FormState = undefined;

    // Explicit típusok hozzáadása: <FormState, FormData>
    const [state, formAction] = useActionState<FormState, FormData>(createComponent, initialState);
  
    const formRef = useRef<HTMLFormElement>(null);

   // useEffect a sikeres state figyelésére
   useEffect(() => {
     if (state && !state.errors && state.message && !state.message.toLowerCase().includes('hiba')) {
       formRef.current?.reset();
       if (onFormSubmitSuccess) {
         onFormSubmitSuccess();
       }
     }
   }, [state, onFormSubmitSuccess]);


  return (
    // Használjuk a CSS modul class neveit
    <form ref={formRef} action={formAction} className={styles.form}>

      {/* Általános hibaüzenet */}
      {state?.message && state.errors && (
         <p className={styles.errorMessage} aria-live="polite">{state.message}</p>
      )}

      <div className={styles.inputGroup}>
        <label htmlFor="name" className={styles.label}>Alkatrész Neve:</label>
        <input
          type="text"
          id="name"
          name="name"
          required
          className={styles.input}
          aria-describedby="name-error"
        />
         <div id="name-error" aria-live="polite" aria-atomic="true">
            {state?.errors?.name && state.errors.name.map((error: string) => (
                <p key={error} className={styles.fieldError}>{error}</p>
            ))}
         </div>
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="price" className={styles.label}>Ár (Ft):</label>
        <input
          type="number"
          id="price"
          name="price"
          required
          step="1"
          min="0"
          className={styles.input}
          aria-describedby="price-error"
        />
        <div id="price-error" aria-live="polite" aria-atomic="true">
             {state?.errors?.price && state.errors.price.map((error: string) => (
                 <p key={error} className={styles.fieldError}>{error}</p>
             ))}
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label htmlFor="maxQuantityPerRack" className={styles.label}>Max. Mennyiség / Rekesz:</label>
        <input
          type="number"
          id="maxQuantityPerRack"
          name="maxQuantityPerRack"
          required
          min="1"
          step="1"
          className={styles.input}
          aria-describedby="maxQuantity-error"
        />
         <div id="maxQuantity-error" aria-live="polite" aria-atomic="true">
             {state?.errors?.maxQuantityPerRack && state.errors.maxQuantityPerRack.map((error: string) => (
                 <p key={error} className={styles.fieldError}>{error}</p>
             ))}
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}