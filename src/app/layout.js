// src/app/layout.js

'use client'; // Mivel useSession-t használó Header van itt, ez kliens komponens kell legyen

import './globals.css';
import Footer from '@/app/components/footer'; // Ellenőrizd az elérési utat
import Header from '@/app/components/header'; // Ellenőrizd az elérési utat
import { SessionProvider } from 'next-auth/react';
import React from 'react'; // React import (jó gyakorlat, bár Next.js néha implicit)

export default function RootLayout({ children }) {
  return (
    <html lang="hu">
      <head>
        <title>Napelem Projekt</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /> 
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <SessionProvider>
          <Header /> 
          <div style={{ flex: 1, paddingTop: '80px', paddingBottom: '80px' }}>
            {children}
          </div>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}