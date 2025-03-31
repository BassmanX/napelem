import React, { ReactNode } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="layout">
      <Navbar />
      <div className="content">
        <Sidebar />
        <main>{children}</main>
      </div>
    </div>
  );
};

export default Layout;