import {
  BellRing,
  FileUp,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Brand';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/contacts', label: 'Contacts', icon: UsersRound },
  { to: '/lists', label: 'Lists', icon: FolderKanban },
  { to: '/followups', label: 'Follow-ups', icon: BellRing },
  { to: '/import', label: 'Import CSV', icon: FileUp },
  { to: '/trash', label: 'Trash', icon: Trash2 },
];
const ADMIN_LINK = { to: '/admin', label: 'Admin', icon: ShieldCheck };

const initialsOf = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('') || '?';

/** The signed-in app frame: sidebar + top bar. <Outlet /> shows the current page (nested routes). */
export default function Layout() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  const links = isAdmin ? [...NAV, ADMIN_LINK] : NAV;

  const handleSignOut = () => {
    signOut();
    navigate('/signin', { replace: true });
  };

  const runQuickSearch = (event) => {
    event.preventDefault();
    const term = quickSearch.trim();
    navigate(term ? `/contacts?search=${encodeURIComponent(term)}` : '/contacts');
    setQuickSearch('');
  };

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar */}
      <aside
        className={`sidebar fixed inset-y-0 left-0 z-30 flex w-64 flex-col p-4 text-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="mb-8 flex items-center justify-between px-2 pt-1">
          <a href="/" title="Home page">
            <Logo inverted />
          </a>
          <button type="button" className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <p className="mb-2 px-3 text-[11px] font-bold tracking-widest text-white/40 uppercase">Workspace</p>
        <nav className="flex flex-col gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  isActive ? 'bg-white/12 text-white shadow-[inset_0_0_0_1px_rgb(255_255_255/0.08)]' : 'text-white/65 hover:translate-x-1 hover:bg-white/6 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-400 transition-all duration-300 ${
                      isActive ? 'opacity-100' : 'scale-y-0 opacity-0'
                    }`}
                  />
                  <span
                    className={`flex size-8 items-center justify-center rounded-lg transition-colors ${
                      isActive ? 'bg-brand-600 text-white shadow-[0_6px_16px_-6px_rgb(47_91_211/0.9)]' : 'bg-white/5 text-white/70 group-hover:text-white'
                    }`}
                  >
                    <Icon size={17} strokeWidth={2.2} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Signed-in user */}
        <div className="mt-auto flex items-center gap-3 rounded-xl bg-white/6 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-sm font-bold">
            {initialsOf(user?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-white/50">{isAdmin ? 'Administrator' : user?.email}</p>
          </div>
          <button type="button" className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white" onClick={handleSignOut} title="Sign out" aria-label="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-20 bg-navy/40 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)} />}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/60 bg-white/55 px-4 py-3 backdrop-blur-xl sm:px-8">
          <button type="button" className="icon-btn lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <form onSubmit={runQuickSearch} className="group relative w-full max-w-md">
            <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-faint transition group-focus-within:text-brand-600" />
            <input
              type="search"
              value={quickSearch}
              onChange={(event) => setQuickSearch(event.target.value)}
              placeholder="Quick search contacts…"
              className="input rounded-full bg-white/70 py-2 pl-10"
              aria-label="Quick search contacts"
            />
          </form>
          <span className="ml-auto hidden text-sm text-muted sm:inline">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </header>

        {/* key={pathname}: the page re-mounts on navigation, so its entrance animation plays */}
        <main key={location.pathname} className="mx-auto w-full max-w-6xl flex-1 animate-rise px-4 py-8 sm:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
