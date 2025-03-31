'use client';
import React from 'react';
import LoginForm from './components/LoginForm';
import styles from 'app/styles/login.module.css';
import { signIn } from "next-auth/react";

export default function Login() {
  return (
    <div>
      <div className={styles.loginContainer}>
        <LoginForm />
      </div>
	  <div className={styles.infoBox}>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </p>
      </div>
    </div>
  );
}