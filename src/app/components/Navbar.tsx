import React from 'react';

const Navbar: React.FC = () => {
  return (
    <nav className="navbar">
      <div className="logo">Napelem Kft.</div>
      <div className="user">Felhasználónév</div>
    </nav>
  );
};

export default Navbar;