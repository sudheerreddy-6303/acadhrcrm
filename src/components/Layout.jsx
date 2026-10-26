import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AutoSyncNotifier from './AutoSyncNotifier';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const [navOpen, setNavOpen] = useState(false);
  const { isAdmin } = useAuth();

  return (
    <div className="app-shell">
      {/* Popup when the background auto-sync adds new AcadHr registrations */}
      {isAdmin && <AutoSyncNotifier />}
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="app-main">
        <header className="topbar">
          <button
            className="hamburger"
            onClick={() => setNavOpen(true)}
            aria-label="Open menu"
          >
            ☰
          </button>
          {/* Logo in the top bar on phones / tablets (hidden on desktop by CSS). */}
          <img src="/acadhr-logo.png" alt="AcadHr" className="topbar-logo" />
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
