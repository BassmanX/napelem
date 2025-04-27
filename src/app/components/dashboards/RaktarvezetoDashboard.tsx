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

const RaktarvezetoDashboard = () => {
  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState(false);
  // Új state az árkezelő modalhoz
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isReceiveStockModalOpen, setIsReceiveStockModalOpen] = useState(false);


  const handleCloseAddComponentModal = () => setIsAddComponentModalOpen(false);
  // Új függvény az árkezelő modal bezárásához
  const handleClosePriceModal = () => setIsPriceModalOpen(false);
  const handleCloseReceiveStockModal = () => setIsReceiveStockModalOpen(false);

  return (
    <div className={styles.dashboardContainer}>
      <h2>Raktárvezetői Feladatok</h2>
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

    </div>
  );
};

export default RaktarvezetoDashboard;