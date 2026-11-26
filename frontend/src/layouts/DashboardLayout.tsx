import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, LogOut, Menu, X, type LucideIcon } from 'lucide-react';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { Avatar, BackButton, cx } from '../components/ui';
import NotificationBell from '../components/NotificationBell';

export interface NavItem { to: string; label: string; icon: LucideIcon; badge?: number | string; end?: boolean; }

const COLLAPSE_KEY = 'homeplate.sidebar.collapsed';

/** Shared shell for the Admin and Kitchen Owner portals: collapsible left sidebar + top bar with back arrow. */
export default function DashboardLayout({ nav, portalLabel, topRight, banner }:
  { nav: NavItem[]; portalLabel: string; topRight?: ReactNode; banner?: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* ignore */ } }, [collapsed]);
  const home = nav[0]?.to ?? '/';
  const atHome = pathname === home || pathname === `${home}/`;

  // mini = icon-only sidebar (desktop collapsed). The mobile drawer is always full width.
  const sidebar = (mini: boolean) => (
    <div className="flex h-full flex-col">
      <div className={cx('flex h-16 items-center', mini ? 'justify-center px-2' : 'justify-between px-5')}>
        {mini ? <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 font-display text-lg font-bold text-white">H</span>
          : <Logo to={home} light sub={portalLabel} />}
        <button className="text-white lg:hidden" onClick={() => setOpen(false)}><X className="h-6 w-6" /></button>
      </div>
      <nav className={cx('flex-1 space-y-0.5 overflow-y-auto py-4', mini ? 'px-2' : 'px-3')}>
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} title={mini ? n.label : undefined}
            className={({ isActive }) => cx('relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition',
              mini ? 'justify-center px-2' : 'px-3',
              isActive ? 'bg-white text-brand-800 shadow-sm' : 'text-brand-50/80 hover:bg-white/10 hover:text-white')}>
            <n.icon className="h-[18px] w-[18px] shrink-0" />
            {!mini && <span className="flex-1">{n.label}</span>}
            {n.badge != null && n.badge !== 0 && (mini
              ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-saffron-500" />
              : <span className="rounded-full bg-saffron-500 px-2 py-0.5 text-[10px] font-bold text-white">{n.badge}</span>)}
          </NavLink>
        ))}
      </nav>
      <div className={cx('m-3 rounded-2xl bg-white/10', mini ? 'p-2' : 'p-3')}>
        <div className={cx('flex items-center', mini ? 'flex-col gap-2' : 'gap-3')}>
          <Avatar name={user?.fullName} />
          {!mini && <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{user?.fullName}</p><p className="truncate text-xs text-brand-100/70">@{user?.username}</p></div>}
          <button title="Logout" onClick={() => { logout(); navigate(portalLabel === 'Super Admin' ? '/admin/login' : '/kitchen/login'); }}
            className="rounded-lg p-2 text-brand-50 hover:bg-white/10"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
      <button onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="mx-3 mb-3 hidden items-center justify-center gap-2 rounded-xl py-2 text-xs font-semibold text-brand-50/80 hover:bg-white/10 hover:text-white lg:flex">
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <><ChevronsLeft className="h-4 w-4" />Collapse</>}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-cream-100">
      <aside className={cx('fixed inset-y-0 left-0 z-[700] hidden bg-gradient-to-b from-brand-800 to-brand-900 transition-[width] duration-200 lg:block',
        collapsed ? 'w-20' : 'w-64')}>{sidebar(collapsed)}</aside>
      {open && (
        <div className="fixed inset-0 z-[900] bg-charcoal-900/50 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-64 bg-gradient-to-b from-brand-800 to-brand-900" onClick={(e) => e.stopPropagation()}>{sidebar(false)}</aside>
        </div>
      )}
      <div className={cx('transition-[padding] duration-200', collapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        <header className="sticky top-0 z-[600] flex h-16 items-center gap-2 border-b border-cream-200 bg-cream-100/90 px-4 backdrop-blur-lg sm:px-6">
          <button className="rounded-xl p-2 hover:bg-cream-200 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <button className="hidden rounded-xl p-2 hover:bg-cream-200 lg:block" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar"><Menu className="h-5 w-5" /></button>
          {!atHome && <BackButton fallback={home} />}
          <p className="hidden text-sm text-charcoal-500 sm:block">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <div className="ml-auto flex items-center gap-2">{topRight}<NotificationBell /></div>
        </header>
        {banner}
        <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8"><Outlet /></main>
      </div>
    </div>
  );
}
