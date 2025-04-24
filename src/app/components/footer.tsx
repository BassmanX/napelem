import React from 'react';
import styles from 'app/styles/footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p>E-jon Kft.</p>
        <p>Cím: 1234 Nem Város, Igen utca 123</p>
        <p>Telefon: +36 1 123 4567</p>
        <p>E-mail: info@ejon.hu</p>
      </div>
    </footer>
  );
}