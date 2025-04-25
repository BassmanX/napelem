// src/app/components/ReceiveStockForm.tsx
'use client';

import React, { useState, useEffect, useRef, useMemo, useActionState } from 'react'; // useMemo hozzáadva
import { useFormStatus } from 'react-dom';
// Itt most a módosított inventoryActions-t importáljuk
import { receiveStock, type ReceiveStockFormState } from '@/app/actions/inventoryActions';
import styles from '@/app/styles/ReceiveStockForm.module.css';

// Típusok
type ComponentOption = { id: number; name: string; };
type RackData = { id: number; row: number; column: number; level: number; };
type SelectOption = { value: number; label: string; };

// Submit gomb
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
      <button type="submit" disabled={pending} className={styles.submitButton} aria-disabled={pending}>
        {pending ? 'Bevételezés...' : 'Bevételezés Mentése'}
      </button>
    );
  }
  

interface ReceiveStockFormProps {
    onFormSubmitSuccess?: () => void;
}

export function ReceiveStockForm({ onFormSubmitSuccess }: ReceiveStockFormProps) {
  const initialState: ReceiveStockFormState = undefined;
  const [state, formAction] = useActionState(receiveStock, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // State a legördülőkhöz és kiválasztott értékekhez
  const [components, setComponents] = useState<ComponentOption[]>([]);
  const [allRacks, setAllRacks] = useState<RackData[]>([]); // Összes rekesz adata
  const [selectedRow, setSelectedRow] = useState<string>(''); // Stringként kezeljük a select value miatt
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');

  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState<string | null>(null);

  // Adatok lekérdezése mountoláskor
  useEffect(() => {
    async function loadDropdownData() {
      // ... (fetch logika ugyanaz, de a rack választ most teljes adatként tároljuk) ...
       setIsLoadingDropdowns(true);
       setDropdownError(null);
       try {
         const [compResponse, rackResponse] = await Promise.all([
           fetch('/api/components?fields=id,name'),
           fetch('/api/racks') // Lekérdezzük az összes rekeszt
         ]);
         if (!compResponse.ok || !rackResponse.ok) throw new Error('...');
         const compData = await compResponse.json();
         const rackData = await rackResponse.json(); // Itt vannak a RackData objektumok
         setComponents(compData.map((c: any) => ({ id: c.id, name: c.name })));
         setAllRacks(rackData); // Eltároljuk az összes rekeszt
       } catch (err: any) { setDropdownError(err.message); }
        finally { setIsLoadingDropdowns(false); }
    }
    loadDropdownData();
  }, []);

  // Sikeres action utáni teendők
   useEffect(() => { /* ... (változatlan) ... */ }, [state, onFormSubmitSuccess]);


  // --- Dinamikus opciók generálása a legördülőkhöz ---

  // Egyedi sorok kinyerése
  const rowOptions = useMemo(() => {
    const uniqueRows = [...new Set(allRacks.map(r => r.row))].sort((a, b) => a - b);
    return uniqueRows.map(row => ({ value: row, label: `Sor: ${row}` }));
  }, [allRacks]);

  // Egyedi oszlopok a kiválasztott sorhoz
  const columnOptions = useMemo(() => {
    if (!selectedRow) return [];
    const rowNum = parseInt(selectedRow, 10);
    const uniqueCols = [...new Set(
        allRacks
            .filter(r => r.row === rowNum)
            .map(r => r.column)
        )].sort((a, b) => a - b);
    return uniqueCols.map(col => ({ value: col, label: `Oszlop: ${col}` }));
  }, [allRacks, selectedRow]);

  // Egyedi szintek a kiválasztott sorhoz és oszlophoz
  const levelOptions = useMemo(() => {
    if (!selectedRow || !selectedColumn) return [];
    const rowNum = parseInt(selectedRow, 10);
    const colNum = parseInt(selectedColumn, 10);
    const uniqueLevels = [...new Set(
        allRacks
            .filter(r => r.row === rowNum && r.column === colNum)
            .map(r => r.level)
        )].sort((a, b) => a - b);
    return uniqueLevels.map(level => ({ value: level, label: `Szint: ${level}` }));
  }, [allRacks, selectedRow, selectedColumn]);

  // --- Kezelők a select-ek változására ---
  const handleRowChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedRow(e.target.value);
      setSelectedColumn(''); // Reseteljük az oszlop és szint választást
      setSelectedLevel('');
  };
   const handleColumnChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
       setSelectedColumn(e.target.value);
       setSelectedLevel(''); // Reseteljük a szint választást
   };
   const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedLevel(e.target.value);
   };

  // --- Renderelés ---
  if (isLoadingDropdowns) return <p>Adatok betöltése...</p>;
  if (dropdownError) return <p style={{ color: 'red' }}>Hiba: {dropdownError}</p>;

  return (
    <form ref={formRef} action={formAction} className={styles.form}>
       {state?.message && !state.success && ( <p className={styles.errorMessage}>...</p> )}

      {/* Alkatrész Kiválasztása */}
      <div className={styles.inputGroup}>
          <label htmlFor="componentId" className={styles.label}>Alkatrész:</label>
          <select id="componentId" name="componentId" required className={styles.select}>
              <option value="">Válasszon...</option>
              {components.map(comp => (<option key={comp.id} value={comp.id}>{comp.name}</option>))}
          </select>
          {/* Hiba */}
          {state?.errors?.componentId?.map(e => <p key={e} className={styles.fieldError}>{e}</p>)}
      </div>

      {/* --- ÚJ RÉSZ a Rekesz Kiválasztók Csoportosítására --- */}
      <div className={styles.inputGroup}> {/* Külső csoport, ha kell a label */}
         <label className={styles.label}>Rekesz Kiválasztása:</label>
         <div className={styles.rackSelectionGroup}> {/* Új konténer a 3 selectnek */}

             {/* Sor */}
             <div className={styles.rackSelectItem}>
                 {/* <label htmlFor="row" className={styles.label}>Sor:</label>  A label lehet fentebb vagy itt kisebb */}
                 <select id="row" name="row" required className={styles.select} value={selectedRow} onChange={handleRowChange} aria-label="Sor">
                      <option value="">Sor...</option>
                      {rowOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                 </select>
                 {/* Hiba */}
                 <div id="row-error" aria-live="polite" aria-atomic="true">
                     {state?.errors?.row?.map(e => <p key={e} className={styles.fieldError}>{e}</p>)}
                 </div>
             </div>

             {/* Oszlop */}
             <div className={styles.rackSelectItem}>
                  {/* <label htmlFor="column" className={styles.label}>Oszlop:</label> */}
                  <select id="column" name="column" required className={styles.select} value={selectedColumn} onChange={handleColumnChange} disabled={!selectedRow} aria-label="Oszlop">
                       <option value="">Oszlop...</option>
                       {columnOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                  </select>
                  {/* Hiba */}
                  <div id="column-error" aria-live="polite" aria-atomic="true">
                     {state?.errors?.column?.map(e => <p key={e} className={styles.fieldError}>{e}</p>)}
                  </div>
             </div>

             {/* Szint */}
             <div className={styles.rackSelectItem}>
                  {/* <label htmlFor="level" className={styles.label}>Szint:</label> */}
                  <select id="level" name="level" required className={styles.select} value={selectedLevel} onChange={handleLevelChange} disabled={!selectedColumn} aria-label="Szint">
                       <option value="">Szint...</option>
                       {levelOptions.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
                  </select>
                  {/* Hiba */}
                  <div id="level-error" aria-live="polite" aria-atomic="true">
                      {state?.errors?.level?.map(e => <p key={e} className={styles.fieldError}>{e}</p>)}
                  </div>
             </div>
         </div>
         {/* Ide kerülhetne egy általános rekeszválasztási hiba, ha van */}
      </div>


       {/* Mennyiség Megadása */}
       <div className={styles.inputGroup}>
           <label htmlFor="quantity" className={styles.label}>Bevételezett Mennyiség:</label>
           <input type="number" id="quantity" name="quantity" required min="1" step="1" className={styles.input} aria-describedby="quantity-error"/>
           <div id="quantity-error">{state?.errors?.quantity?.map(e => <p key={e} className={styles.fieldError}>{e}</p>)}</div>
       </div>

        {/* Általános hiba (pl. kapacitás) */}
       {state?.errors?.general && (
           <p className={styles.errorMessage}>{state.errors.general.join(', ')}</p>
       )}

      <SubmitButton />
    </form>
  );
}