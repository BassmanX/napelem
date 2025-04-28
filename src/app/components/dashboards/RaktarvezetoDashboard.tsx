// src/app/components/dashboards/RaktarvezetoDashboard.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import styles from '@/app/styles/RaktarvezetoDashboard.module.css';
import Modal from '@/app/components/Modal';
import { NewComponentForm } from '@/app/components/NewComponentForm';
// Importáljuk a módosított árlista komponenst
import { ComponentPriceList } from '@/app/components/ComponentPriceList';
import { ReceiveStockForm } from '@/app/components/ReceiveStockForm';
import { MissingComponentsList } from '@/app/components/MissingComponentsList';
import { MissingReservedComponentsList } from '@/app/components/MissingReservedComponentsList';

const RaktarvezetoDashboard = () => {
  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState(false);
  // Új state az árkezelő modalhoz
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isReceiveStockModalOpen, setIsReceiveStockModalOpen] = useState(false);
  const [isMissingComponentsModalOpen, setIsMissingComponentsModalOpen] = useState(false);
  const [isMissingReservedModalOpen, setIsMissingReservedModalOpen] = useState(false);


  const handleCloseAddComponentModal = () => setIsAddComponentModalOpen(false);
  // Új függvény az árkezelő modal bezárásához
  const handleClosePriceModal = () => setIsPriceModalOpen(false);
  const handleCloseReceiveStockModal = () => setIsReceiveStockModalOpen(false);
  const handleCloseMissingComponentsModal = () => setIsMissingComponentsModalOpen(false);
  const handleCloseMissingReservedModal = () => setIsMissingReservedModalOpen(false);


  return (
    <div className={styles.dashboardContainer}>
      <h2 className={styles.h2title}>Raktárvezetői Feladatok</h2>
      <p className={styles.description}>
        Kérjük, válasszon az alábbi menüpontok közül...
      </p>

      <div className={styles.gridContainer}>

        {/* B.1: Új Alkatrész Felvétele - Modal nyitó gomb */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Új Alkatrész Felvétele</h3>
          <p className={styles.cardDescription}>Új komponens hozzáadása...</p>
          <button
            onClick={() => setIsAddComponentModalOpen(true)}
            className={styles.cardLink}
          >
            Hozzáadás
          </button>
        </div>

        {/* B.2: Árak Módosítása - Modal nyitó gomb */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Alkatrész Adatainak Módosítása</h3>
          <p className={styles.cardDescription}>Meglévő alkatrészek árának, rekeszenként tárolható maximális mennyiségének frissítése...</p>
          {/* Gomb, ami az új state-et állítja */}
          <button
            onClick={() => setIsPriceModalOpen(true)}
            className={styles.cardLink}
          >
            Kezelés
          </button>
        </div>

        {/* B.5: Anyagok Bevételezése - Új Kártya */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Anyagok Bevételezése</h3>
          <p className={styles.cardDescription}>Beérkezett alkatrészek rögzítése és rekeszhez rendelése.</p>
          <button
            onClick={() => setIsReceiveStockModalOpen(true)}
            className={styles.cardLink}
          >
            Bevételezés Indítása
          </button>
        </div>

        {/* B.3: Hiányzó Alkatrészek Kártya/Gomb */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Hiányzó Alkatrészek</h3>
          <p className={styles.cardDescription}>Azon alkatrészek listája, melyekből rendelni szükséges (készlet ˂= foglalt).</p>
          <button
            onClick={() => setIsMissingComponentsModalOpen(true)}
            className={styles.cardLink} // Használj megfelelő stílust
          >
            Lista Megtekintése
          </button>
        </div>

        {/* B.4: Hiányzó & Lefoglalt Kártya/Gomb */}
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Hiányzó & Lefoglalt</h3>
          <p className={styles.cardDescription}>Azon hiányzó alkatrészek, melyekre már van aktív projekt foglalás.</p>
          <button
            onClick={() => setIsMissingReservedModalOpen(true)}
            className={styles.cardLink}
          >
            Lista Megtekintése
          </button>
        </div>

      </div>

      {/* --- Modális Ablakok --- */}

      {/* Új Alkatrész Modal */}
      <Modal
        isOpen={isAddComponentModalOpen}
        onClose={handleCloseAddComponentModal}
        title="Új Alkatrész Felvétele"
      >
        <NewComponentForm onFormSubmitSuccess={handleCloseAddComponentModal} />
      </Modal>

      {/* Árkezelő Modal */}
      <Modal
        isOpen={isPriceModalOpen}
        onClose={handleClosePriceModal}
        title="Alkatrész Adatainak Módosítása"
      >
        {/* A módosított lista komponens, ami már lekérdezi az adatokat */}
        <ComponentPriceList />
      </Modal>
      {/* Új Bevételezési Modal */}
      <Modal
         isOpen={isReceiveStockModalOpen}
         onClose={handleCloseReceiveStockModal}
         title="Anyag Bevételezése"
       >
         <ReceiveStockForm onFormSubmitSuccess={handleCloseReceiveStockModal} />
      </Modal>
      {/* ÚJ: Hiányzó Alkatrészek Modal */}
      <Modal
         isOpen={isMissingComponentsModalOpen}
         onClose={handleCloseMissingComponentsModal}
         title="Hiányzó Alkatrészek Listája"
       >
         <MissingComponentsList />
       </Modal>
      {/* ÚJ: Hiányzó & Lefoglalt Alkatrészek Modal */}
      <Modal
         isOpen={isMissingReservedModalOpen}
         onClose={handleCloseMissingReservedModal}
         title="Hiányzó és Lefoglalt Alkatrészek"
       >
         <MissingReservedComponentsList />
      </Modal>
    </div>
  );
};

export default RaktarvezetoDashboard;