// Header.tsx (vagy ahol a Header komponens van)

import React, { useState, useEffect, useRef } from 'react'; // useState, useEffect, useRef hozzáadva
import { useSession, signOut } from 'next-auth/react'; // useSession és signOut importálása
import Link from 'next/link'; // Használj Link komponenst a navigációhoz
import Image from "next/image";
import styles from 'app/styles/header.module.css'; // Győződj meg róla, hogy az elérési út helyes
import Logo from '@/app/public/images/header.png'; // Győződj meg róla, hogy az elérési út helyes

export default function Header() {
  const { data: session, status } = useSession(); // Session adatok lekérése
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State a dropdown nyitottságához
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref a dropdown "kívülre kattintás" figyeléséhez

  // Effekt a "kívülre kattintás" figyelésére a dropdown bezárásához
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // Ha a ref megvan ÉS a kattintás a ref-en kívül történt
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false); // Zárd be a dropdown-t
      }
    }
    // Listener hozzáadása, ha a dropdown nyitva van
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      // Listener eltávolítása, ha zárva van
      document.removeEventListener("mousedown", handleClickOutside);
    }
    // Cleanup function: Listener eltávolítása, ha a komponens unmountolódik
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]); // Csak akkor fusson le újra, ha isDropdownOpen változik


  const handleSignOut = () => {
    signOut({ callbackUrl: '/' }); // Kijelentkezés és átirányítás a főoldalra
  };

  // Felhasználó nevének vagy emailjének megjelenítése
  // Előnyben részesítjük a nevet, ha van, egyébként az emailt
  const displayName = session?.user?.username ?? session?.user?.email;
  const displayRole = session?.user?.role;

  return (
    <header className={styles.header}>
      <div className={styles.headerImageContainer}>
        <Link href="/"> {/* Link a főoldalra a logón */}
            <Image src={Logo} alt="Logo" className={styles.headerImage} height={200} priority />
        </Link>
      </div>
      <div className={styles.container}>
        <nav id="navbar" className={styles.navContainer}> {/* Adj hozzá egy konténer class-t ha kell */}

          {/* Műszerfal link mindig látszik (vagy csak bejelentkezve?) - Te döntésed */}
          {/* Ha csak bejelentkezve kell: {status === 'authenticated' && (...)} */}
          <Link href="/pages/dashboard" className={styles.navLink}>
            Műszerfal
          </Link>

          {/* Dinamikus rész: Bejelentkezés link VAGY Felhasználó menü */}
          {status === 'loading' && (
            <span className={styles.navLink}>Betöltés...</span> // Töltési állapot jelzése
          )}

          {status === 'unauthenticated' && (
            <Link href="/" className={styles.navLink}> {/* Vagy a te login oldaladra: /login */}
              Bejelentkezés
            </Link>
          )}

          {status === 'authenticated' && session?.user && (
            <div className={styles.userMenuContainer} ref={dropdownRef}> {/* Dropdown konténer + Ref */}
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={styles.userNameButton} // Ezt a gombot kell majd stílusozni
              >
                <span>{displayName || 'Profil'}</span> {/* Név külön span-ben a jobb stílusozhatóságért */}
                <span className={styles.dropdownArrow}>˅</span> {/* Lefelé mutató nyíl */}
              </button>

              {/* Maga a legördülő menü, ami feltételesen jelenik meg */}
              {isDropdownOpen && (
                <div className={styles.dropdownMenu}>
                  <ul>
                    <li className={styles.dropdownRole}>
                      Szerepkör: {displayRole}
                    </li>
                    <hr />
                    <li>
                      <button onClick={handleSignOut} className={styles.dropdownLink}>
                        Kijelentkezés
                      </button>
                    </li>
                    {/* Ide jöhetnek további menüpontok, pl. Profil szerkesztése */}
                  </ul>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}