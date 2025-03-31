import React from 'react';
import Link from 'next/link';

interface SidebarProps {
  role: 'szakember' | 'raktáros' | 'raktárvezető';
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  return (
    <aside className="sidebar">
      {role === 'szakember' && (
        <ul>
          <li><Link href="/dashboard">Műszerfal</Link></li>
          <li><Link href="/technicians">Telepítések</Link></li>
        </ul>
      )}
      {role === 'raktáros' && (
        <ul>
          <li><Link href="/inventory">Raktárkészlet</Link></li>
        </ul>
      )}
      {role === 'raktárvezető' && (
        <ul>
          <li><Link href="/dashboard">Műszerfal</Link></li>
          <li><Link href="/inventory">Raktárkészlet</Link></li>
          <li><Link href="/technicians">Telepítések</Link></li>
        </ul>
      )}
    </aside>
  );
};

export default Sidebar;