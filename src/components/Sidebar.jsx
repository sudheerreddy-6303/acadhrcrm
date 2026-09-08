import { useEffect, useState } from 'react';
import { NavLink, Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Nav items. `adminOnly` items are hidden from telecallers entirely.
// Items with `children` expand into registration / unregistration follow-up
// sub-categories when the parent row is clicked.
const FOLLOWUP_CHILDREN = [
  { label: 'Registration Followup', reg: 'registered' },
  { label: 'Unregistration Followup', reg: 'unregistered' },
];

// Extra sub-category shown under the importable directory sections. Admin-only.
// Links to the Import & Assign page with the section's type preset.
const IMPORT_ASSIGN_CHILD = { label: 'Import & Assign', importAssign: true };

// Admin-only sub-item under Tutors: pull tutors from the AcadHr database.
const FETCH_ACADHR_CHILD = { label: 'Fetch from AcadHr', to: '/fetch-tutors', linkChild: true };
// <<<<<<< HEAD
// =======
// Admin-only sub-item under Teachers: pull teachers from the AcadHr database.
const FETCH_ACADHR_TEACHERS_CHILD = { label: 'Fetch from AcadHr', to: '/fetch-teachers', linkChild: true };
// >>>>>>> 96a6c55 (added the chages in the unregsiter teacher follow up)

// Followup children + Import & Assign, for sections that support importing.
const CHILDREN_WITH_IMPORT = [...FOLLOWUP_CHILDREN, IMPORT_ASSIGN_CHILD];
// Tutors additionally get the "Fetch from AcadHr" link.
const TUTOR_CHILDREN = [...FOLLOWUP_CHILDREN, IMPORT_ASSIGN_CHILD, FETCH_ACADHR_CHILD];
// <<<<<<< HEAD
// =======
// Teachers additionally get their own "Fetch from AcadHr" link.
const TEACHER_CHILDREN = [...FOLLOWUP_CHILDREN, IMPORT_ASSIGN_CHILD, FETCH_ACADHR_TEACHERS_CHILD];
// >>>>>>> 96a6c55 (added the chages in the unregsiter teacher follow up)

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '▤' },
  { to: '/leads', label: 'Leads', icon: '☎' },
// <<<<<<< HEAD
  { key: 'teachers', to: '/teachers', label: 'Teachers', icon: '✎', children: CHILDREN_WITH_IMPORT },
// =======
  { key: 'teachers', to: '/teachers', label: 'Teachers', icon: '✎', children: TEACHER_CHILDREN },
// >>>>>>> 96a6c55 (added the chages in the unregsiter teacher follow up)
  { key: 'tutors', to: '/tutors', label: 'Tutors', icon: '◎', children: TUTOR_CHILDREN },
  { key: 'schools', to: '/schools', label: 'Schools', icon: '⌂', children: CHILDREN_WITH_IMPORT },
  { key: 'tuitions', to: '/tuitions', label: 'Tuitions', icon: '✐', children: FOLLOWUP_CHILDREN },
  { to: '/acadhrs', label: 'AcadHrs', icon: '☏', adminOnly: true },
  { to: '/users', label: 'Users', icon: '⚙', adminOnly: true },
];

export default function Sidebar({ open, onClose }) {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const items = NAV.filter((n) => !n.adminOnly || isAdmin);

  // Which expandable group is currently open in the sidebar.
  const [openKey, setOpenKey] = useState(null);

  // Auto-expand the group that matches the page you're currently on.
  useEffect(() => {
    const match = NAV.find((n) => n.children && location.pathname === n.to);
    if (match) setOpenKey(match.key);
  }, [location.pathname]);

  const toggleGroup = (item) => {
    setOpenKey((prev) => (prev === item.key ? null : item.key));
    // Clicking the parent still opens the full list for that section.
    navigate(item.to);
  };

  const currentReg = params.get('registration') || '';

  return (
    <>
      <div
        className={`sidebar-backdrop ${open ? 'show' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${open ? 'open' : ''} ${isAdmin ? 'role-admin' : 'role-telecaller'}`}>
        <div className="sidebar-brand">
          <div className="brand-logo-pill">
            <img src="/acadhr-logo.png" alt="AcadHr" className="brand-logo" />
          </div>
          <div className="brand-caption">CRM Portal</div>
        </div>

        <nav className="sidebar-nav">
          {items.map((item) => {
            // Simple item (no sub-categories) — unchanged behaviour.
            if (!item.children) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </NavLink>
              );
            }

            // Expandable item with follow-up sub-categories.
            const isOpen = openKey === item.key;
            const parentActive = location.pathname === item.to;
            return (
              <div className="nav-group" key={item.key}>
                <button
                  type="button"
                  className={`nav-parent ${parentActive ? 'active' : ''} ${isOpen ? 'open' : ''}`}
                  onClick={() => toggleGroup(item)}
                  aria-expanded={isOpen}
                >
                  <span className="nav-icon" aria-hidden="true">{item.icon}</span>
                  {item.label}
                  <span className="nav-caret" aria-hidden="true">▸</span>
                </button>

                {isOpen && (
                  <div className="nav-sub">
                    {item.children.map((child) => {
                      // Import & Assign sub-category — admin-only, links to the
                      // import-assign page with this section's type preset.
                      if (child.importAssign) {
                        if (!isAdmin) return null;
                        const active = location.pathname === '/import-assign'
                          && params.get('type') === item.key;
                        return (
                          <Link
                            key={`import-assign-${item.key}`}
                            to={`/import-assign?type=${item.key}`}
                            className={`nav-subitem ${active ? 'active' : ''}`}
                            onClick={onClose}
                          >
                            {child.label}
                          </Link>
                        );
                      }
                      // Plain link sub-item (e.g. "Fetch from AcadHr") — admin-only.
                      if (child.linkChild) {
                        if (!isAdmin) return null;
                        const active = location.pathname === child.to;
                        return (
                          <Link
                            key={`link-${child.to}`}
                            to={child.to}
                            className={`nav-subitem ${active ? 'active' : ''}`}
                            onClick={onClose}
                          >
                            {child.label}
                          </Link>
                        );
                      }
                      // Follow-up sub-categories — unchanged.
                      const active = parentActive && currentReg === child.reg;
                      return (
                        <Link
                          key={child.reg}
                          to={`${item.to}?registration=${child.reg}`}
                          className={`nav-subitem ${active ? 'active' : ''}`}
                          onClick={onClose}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="who">
            <div className="who-name">{user?.name}</div>
            <div className="who-role">{user?.role === 'telecaller' ? 'AcadHr' : user?.role}</div>
          </div>
          <button className="btn-ghost" onClick={logout}>Sign out</button>
        </div>
      </aside>
    </>
  );
}
