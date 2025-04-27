'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import styles from '@/app/styles/dashboard.module.css';
// Importáld a szerepkör-specifikus komponenseket (az elérési út eltérhet!)
import RaktarvezetoDashboard from '@/app/components/dashboards/RaktarvezetoDashboard';
import RaktarosDashboard from '@/app/components/dashboards/RaktarosDashboard';
import SzakemberDashboard from '@/app/components/dashboards/SzakemberDashboard';

export default function DashboardPage() {
  // A meglévő state-ek és useEffect megmaradnak
  const [userData, setUserData] = useState<{ username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/user'); // Fetching from your custom endpoint
        if (!response.ok) {
          // Próbálj meg több infót kiolvasni a válaszból, ha lehetséges
          let errorMsg = 'Nem sikerült lekérni a felhasználói adatokat';
          try {
              const errorData = await response.json();
              errorMsg = errorData.message || errorMsg;
          } catch(e) {
              // Ha a válasz nem JSON, maradj az alap üzenetnél
          }
          throw new Error(errorMsg);
        }
        const data = await response.json();
        // Győződj meg róla, hogy a data tartalmaz 'username' és 'role' mezőket
        if (data && data.username && data.role) {
             setUserData(data);
        } else {
             throw new Error('Hiányos felhasználói adatok érkeztek.');
        }
      } catch (err: any) {
        setError(err.message);
        setUserData(null); // Hiba esetén nullázd az adatokat
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Tartalom renderelése a state alapján ---

  // Betöltés alatt
  if (loading) {
    return <p>Műszerfal betöltése...</p>;
  }

  // Hiba történt a fetch során
  if (error) {
    // Adjunk több kontextust a hibához, ha szükséges
    return (
        <div>
             <h1>Hiba</h1>
             <p>Nem sikerült betölteni a műszerfal adatokat: {error}</p>
             <p>Lehet, hogy a szerver nem elérhető, vagy nincs bejelentkezve.</p>
             <button onClick={() => signOut({ callbackUrl: '/' })}>Kijelentkezés</button>
        </div>
     );
  }

  // Nincs felhasználói adat (fetch sikeres volt, de pl. API üres választ adott)
  // Vagy a fetch sikertelen volt, és az error state után nulláztuk
  if (!userData) {
    return (
        <div>
             <h1>Hiba</h1>
             <p>Nem állnak rendelkezésre a felhasználói adatok.</p>
             <button onClick={() => signOut({ callbackUrl: '/' })}>Kijelentkezés</button>
        </div>
     );
  }

  // --- Itt jön a szerepkör alapú komponens kiválasztása ---
  const renderDashboardContent = () => {
    switch (userData.role) {
      case 'raktarvezeto':
        return <RaktarvezetoDashboard />;
      case 'raktaros':
        return <RaktarosDashboard />;
      case 'szakember':
        return <SzakemberDashboard />;
      default:
        return (
          <div>
            <h2>Ismeretlen Szerepkör</h2>
            <p>A felhasználói szerepkör ({userData.role}) nem ismert, vagy nincs hozzá tartozó műszerfal.</p>
          </div>
        );
    }
  };

  // --- Sikeres betöltés, felhasználói adattal ---
  return (
    <div className={styles.pageContainer}>
      {/* A szerepkörnek megfelelő tartalom megjelenítése */}
      {renderDashboardContent()}

    </div>
  );
}