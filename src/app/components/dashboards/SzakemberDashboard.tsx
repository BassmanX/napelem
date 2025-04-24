// components/dashboards/SzakemberDashboard.tsx
import React from 'react';

const SzakemberDashboard = () => {
  return (
    <div>
      <h2>Szakember Műszerfal</h2>
      {/* Ide jönnek a Szakember specifikus funkciók és linkek */}
      {/* Pl. az A.1-A.7 funkciókhoz tartozó elemek a PDF-ből [cite: 1] */}
      <ul>
        <li>Új projekt létrehozása</li>
        <li>Projektek listázása</li>
        <li>Alkatrészek listázása</li>
        <li>Árkalkuláció</li>
        {/* ... stb. */}
      </ul>
    </div>
  );
};

export default SzakemberDashboard;