import React from 'react';
import styles from 'app/styles/header.module.css';
import Image from "next/image";

import Logo from '@/app/public/images/header.png'

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerImageContainer}>
        <Image src={Logo} alt="Logo" className={styles.headerImage} height={200} />
      </div>
      <div className={styles.container}>
        <nav id="navbar">
          <a href="/" className={styles.navLink}>Kezdőlap</a>
          <a href="/login" className={styles.navLink}>Bejelentkezés</a>
          <a href="/dashboard" className={styles.navLink}>Műszerfal</a>
          <a href="/inventory" className={styles.navLink}>Raktárkészlet</a>
          <a href="/technicians" className={styles.navLink}>Telepítések</a>
        </nav>
      </div>
    </header>
  );
}