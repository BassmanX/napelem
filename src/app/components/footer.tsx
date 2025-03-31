import React from 'react';
import styles from 'app/styles/footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <p>Napelem Kft.</p>
        <p>Cím: Példa utca 123, 1234 Példa város</p>
        <p>Telefon: +36 1 123 4567</p>
        <p>E-mail: info@napelemkft.hu</p>
      </div>
    </footer>
  );
}