// src/app/components/Modal.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import styles from '@/app/styles/Modal.module.css'; // Létrehozandó CSS modul

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string; // Opcionális cím a modalnak
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children, title }) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Bezárás Esc billentyűre
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Bezárás háttérre kattintva
  const handleOverlayClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (modalRef.current && event.target === modalRef.current) {
       onClose();
    }
  };


  if (!isOpen) {
    return null; // Ha nincs nyitva, nem renderelünk semmit
  }

  return (
    <div
       className={styles.modalOverlay}
       onClick={handleOverlayClick} // Bezárás háttérre kattintva
       ref={modalRef} // Ref az overlay div-re
       role="dialog"
       aria-modal="true"
       aria-labelledby="modal-title" // Ha van cím
    >
      <div className={styles.modalContent}>
        {/* Bezárás Gomb (X) */}
        <button onClick={onClose} className={styles.closeButton} aria-label="Bezárás">
          &times; {/* HTML entity for X */}
        </button>

        {/* Opcionális Cím */}
        {title && <h2 id="modal-title" className={styles.modalTitle}>{title}</h2>}

        {/* A Modal Tartalma (pl. a form) */}
        {children}
      </div>
    </div>
  );
};

export default Modal;