import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  House,
  Wallet,
  FileText,
  Users,
  Mail,
  Gift,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { AccessibilityBar } from './AccessibilityBar.jsx';
import { Logo } from './Logo.jsx';
import { StatusBanner } from './StatusBanner.jsx';

const NAV = [
  { to: '/app', label: 'Home', icon: House, end: true },
  { to: '/app/assets', label: 'My accounts & assets', icon: Wallet },
  { to: '/app/documents', label: 'Documents', icon: FileText },
  { to: '/app/nominees', label: 'Trusted people', icon: Users },
  { to: '/app/letters', label: 'Personal letters', icon: Mail },
  { to: '/app/shared', label: 'Left for me', icon: Gift },
  { to: '/app/activity', label: 'Activity history', icon: History },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export function AppLayout() {
  const { user, logout, devTools } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true, state: { signedOut: true } });
  };

  const nav = (
    <nav aria-label="Main menu">
      <ul className="space-y-1.5">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex min-h-14 items-center gap-3 rounded-xl px-4 text-lg font-bold no-underline ${
                  isActive ? 'bg-brand text-white' : 'text-ink hover:bg-brand-soft'
                }`
              }
            >
              <Icon className="size-6 shrink-0" aria-hidden /> {label}
            </NavLink>
          </li>
        ))}
        {devTools && (
          <li>
            <NavLink
              to="/dev/mailbox"
              className="flex min-h-12 items-center gap-3 rounded-xl px-4 text-base font-bold text-muted no-underline hover:bg-brand-soft"
            >
              <Inbox className="size-5 shrink-0" aria-hidden /> Demo mailbox
            </NavLink>
          </li>
        )}
      </ul>
      <button
        type="button"
        onClick={signOut}
        className="mt-6 flex min-h-14 w-full items-center gap-3 rounded-xl border-2 border-line bg-white px-4 text-lg font-bold hover:border-danger hover:text-danger cursor-pointer"
      >
        <LogOut className="size-6" aria-hidden /> Log out
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen">
      <a href="#main" className="skip-link">Skip to main content</a>
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo to="/app" />
          <div className="hidden md:block">
            <AccessibilityBar />
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-lg lg:block">
              Signed in as <strong>{user?.name}</strong>
            </span>
            <button
              type="button"
              className="flex min-h-12 items-center gap-2 rounded-xl border-2 border-line px-3 text-base font-bold lg:hidden cursor-pointer"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
              Menu
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div id="mobile-menu" className="border-b border-line bg-paper px-4 py-4 lg:hidden">
          <div className="mb-4 md:hidden">
            <AccessibilityBar />
          </div>
          {nav}
        </div>
      )}

      <div className="mx-auto flex max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:py-8">
        <aside className="hidden w-72 shrink-0 lg:block">
          <div className="sticky top-28">{nav}</div>
        </aside>
        <main id="main" className="min-w-0 flex-1 pb-24" tabIndex={-1}>
          <StatusBanner />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
