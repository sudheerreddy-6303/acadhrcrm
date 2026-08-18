import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Nav items. `adminOnly` items are hidden from telecallers entirely.
const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '▤' },
  { to: '/leads', label: 'Leads', icon: '☎' },
  { to: '/teachers', label: 'Teachers', icon: '✎' },
  { to: '/tutors', label: 'Tutors', icon: '◎' },
  { to: '/schools', label: 'Schools', icon: '⌂' },
  { to: '/tuitions', label: 'Tuitions', icon: '✐' },
  { to: '/acadhrs', label: 'AcadHrs', icon: '☏', adminOnly: true },
  { to: '/users', label: 'Users', icon: '⚙', adminOnly: true },
];

export default function Sidebar({ open, onClose }) {
  const { user, isAdmin, logout } = useAuth();
  const items = NAV.filter((n) => !n.adminOnly || isAdmin);

  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? 'show' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo-pill">
            <img src="/acadhr-logo.png" alt="AcadHr" className="brand-logo" />
          </div>
          <div className="brand-caption">CRM Portal</div>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="who">
            <div className="who-name">{user?.name}</div>
            <div className="who-role">{user?.role}</div>
          </div>
          <button className="btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </aside>
    </>
  );
}
