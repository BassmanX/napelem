'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';

export default function DashboardPage() {
  const [userData, setUserData] = useState<{ username: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/user');
        if (!response.ok) {
          throw new Error('Nem sikerült lekérni a felhasználói adatokat');
        }
        const data = await response.json();
        setUserData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <p>Betöltés...</p>;
  }

  if (error) {
    return <p>Hiba: {error}</p>;
  }

  if (!userData) {
    return <p>Nem sikerült lekérni a felhasználói adatokat.</p>;
  }

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Üdvözöljük, {userData.username}!</p>
      <p>Szerepkör: {userData.role}</p>
      <button onClick={() => signOut({ callbackUrl: '/' })}>Kijelentkezés</button>
      {/* ... a dashboard tartalma ... */}
    </div>
  );
}