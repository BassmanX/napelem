'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from 'app/styles/login.module.css';

export default function LoginForm() {
  const [username, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await signIn('credentials', {
      redirect: false,
      username,
      password,
    });

    if (result?.error) {
      setError(result.error);
      setShowPopup(true); 
    } else {
      router.push('/');
    }
  };
  
  const closePopup = () => {
    setShowPopup(false); // Popup elrejtése
  };

  return (
    <div className={styles.loginContainer}>
      <form className={styles.loginForm} onSubmit={handleSubmit}>
        <h1>Jelentkezzen be!</h1>
		<input
          type="text"
          placeholder="Felhasználónév"
          value={username}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Jelszó"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Bejelentkezés</button>
      </form>

      {showPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popup}>
            <p className={styles.error}>Hibás bejelentkezési adatok!</p>
            <button onClick={closePopup}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}