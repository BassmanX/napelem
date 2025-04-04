'use client';
import './globals.css';
import Footer from '@/app/components/footer';
import Header from '@/app/components/header';
import { SessionProvider } from 'next-auth/react';


export default function RootLayout({ children }) {
  return (
    <html lang="en">
	   <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <SessionProvider><div style={{ flex: 1, paddingTop: '80px', paddingBottom: '80px' }}>{children}</div></SessionProvider>
        <Header />
        <Footer />
      </body>
    </html>
  );
}