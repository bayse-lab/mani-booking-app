import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../App';
import { useCenterContext } from '../App';

const ADMIN_NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon },
  { to: '/classes', label: 'Classes', icon: ClassesIcon },
  { to: '/schedule', label: 'Schedule', icon: ScheduleIcon },
  { to: '/users', label: 'Users', icon: UsersIcon },
];

const SETTINGS_NAV_ITEMS = [
  { to: '/centers', label: 'Centers', icon: CentersIcon },
  { to: '/member-types', label: 'Member Types', icon: MemberTypesIcon },
  { to: '/pricing', label: 'Pricing', icon: PricingIcon },
  { to: '/legal', label: 'Legal', icon: LegalIcon },
];

const INSTRUCTOR_NAV_ITEMS = [
  { to: '/my-schedule', label: 'Mine Hold', icon: ScheduleIcon },
  { to: '/schedule', label: 'Alle Hold', icon: ScheduleIcon },
];

export default function Layout() {
  const { signOut, isAdmin } = useAdminAuth();
  const { centers, selectedCenter, setSelectedCenter } = useCenterContext();
  const location = useLocation();

  const navItems = isAdmin ? ADMIN_NAV_ITEMS : INSTRUCTOR_NAV_ITEMS;
  const isOnSettingsPage = SETTINGS_NAV_ITEMS.some((item) => location.pathname === item.to);
  const [settingsOpen, setSettingsOpen] = useState(isOnSettingsPage);

  useEffect(() => {
    if (isOnSettingsPage && !settingsOpen) {
      setSettingsOpen(true);
    }
  }, [location.pathname]);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-brand text-white flex flex-col">
        <div className="p-6 border-b border-brand-light">
          <h1 className="text-3xl font-serif font-semibold tracking-wide text-sand">
            Maní
          </h1>
          <p className="text-xs text-mani-taupe mt-1 tracking-widest uppercase">
            {isAdmin ? 'Admin Panel' : 'Instruktør'}
          </p>
        </div>

        {/* Center Picker - only for admins */}
        {isAdmin && centers.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <label className="block text-[10px] uppercase tracking-wider text-mani-taupe mb-1.5">
              Center
            </label>
            <select
              value={selectedCenter || ''}
              onChange={(e) => setSelectedCenter(e.target.value || null)}
              className="w-full bg-brand-light text-sand text-sm px-3 py-2 rounded-lg border border-mani-brown/30 focus:outline-none focus:border-sand/50"
            >
              <option value="">All Centers</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/' || item.to === '/my-schedule'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sand/15 text-sand'
                    : 'text-mani-taupe hover:text-sand hover:bg-sand/5'
                }`
              }
            >
              <item.icon />
              {item.label}
            </NavLink>
          ))}

          {/* Settings section - admin only */}
          {isAdmin && (
            <>
              <div className="border-t border-brand-light my-3" />
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg text-sm font-medium text-mani-taupe hover:text-sand hover:bg-sand/5 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <SettingsIcon />
                  Settings
                </span>
                <ChevronIcon open={settingsOpen} />
              </button>
              {settingsOpen && (
                <div className="ml-2 space-y-1">
                  {SETTINGS_NAV_ITEMS.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-sand/15 text-sand'
                            : 'text-mani-taupe hover:text-sand hover:bg-sand/5'
                        }`
                      }
                    >
                      <item.icon />
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-brand-light">
          <button
            onClick={signOut}
            className="w-full px-4 py-2 text-sm text-mani-taupe hover:text-sand hover:bg-sand/5 rounded-lg transition-colors text-left"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-sand-light">
        <Outlet />
      </main>
    </div>
  );
}

function DashboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ClassesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
    </svg>
  );
}

function ScheduleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function CentersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9h1" /><path d="M9 13h1" /><path d="M9 17h1" />
    </svg>
  );
}

function MemberTypesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function PricingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

function LegalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
