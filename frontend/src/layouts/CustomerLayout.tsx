import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ChefHat, ClipboardList, LogOut, Menu, Repeat, Search, ShieldCheck, ShoppingBag, User as UserIcon, UtensilsCrossed, X } from 'lucide-react';
import Logo from '../components/Logo';
import LocationPicker from '../components/LocationPicker';
import { nearestArea, useLocationCtx } from '../context/LocationContext';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Avatar, BackButton, cx } from '../components/ui';
import NotificationBell from '../components/NotificationBell';

export default function CustomerLayout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const isCustomer = user?.role === 'CUSTOMER';
  const { pathname } = useLocation();
  const { setLocation } = useLocationCtx();

  // When a customer logs in, start from their saved delivery address (once per login), so nearby kitchens are correct.
  useEffect(() => {
    if (!isCustomer || user?.latitude == null || user?.longitude == null) return;
    const key = 'homeplate.location.user';
    try { if (localStorage.getItem(key) === String(user.id)) return; localStorage.setItem(key, String(user.id)); } catch { /* ignore */ }
    const a = nearestArea(user.latitude, user.longitude);
    setLocation({ label: a.far ? 'Home' : a.name, address: user.address || `${a.name}, Coimbatore`, lat: user.latitude, lng: user.longitude });
  }, [isCustomer, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    nav(`/kitchens${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
  };

  const links = [
    { to: '/kitchens', label: 'Kitchens', icon: UtensilsCrossed },
    { to: '/request', label: 'Request a Dish', icon: ChefHat },
    { to: '/orders', label: 'Orders', icon: ClipboardList },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[600] border-b border-cream-200 bg-cream-100/90 backdrop-blur-lg">
        <div className="container-x flex h-16 items-center gap-3">
          <Logo />
          <div className="hidden w-[220px] shrink-0 md:block"><LocationPicker /></div>
          <form onSubmit={search} className="relative hidden flex-1 lg:block">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} className="input rounded-full bg-white pl-10"
              placeholder="Search biryani, meals, chapati or a home kitchen…" />
          </form>
          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => cx('rounded-xl px-3 py-2 text-sm font-semibold transition',
                isActive ? 'bg-brand-50 text-brand-700' : 'text-charcoal-600 hover:bg-cream-200')}>{l.label}</NavLink>
            ))}
          </nav>
          {isCustomer && <div className="ml-auto md:ml-0"><NotificationBell /></div>}
          <Link to="/cart" className={cx('relative rounded-xl p-2 text-charcoal-700 hover:bg-cream-200', isCustomer ? 'md:ml-0' : 'ml-auto md:ml-0')} aria-label="Cart">
            <ShoppingBag className="h-6 w-6" />
            {count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-saffron-500 px-1 text-[11px] font-bold text-white">{count}</span>}
          </Link>
          {isCustomer ? (
            <div className="group relative hidden md:block">
              <button className="flex items-center gap-2 rounded-xl p-1 hover:bg-cream-200"><Avatar name={user!.fullName} size="h-8 w-8" /></button>
              <div className="invisible absolute right-0 top-full w-56 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
                <div className="card overflow-hidden py-1">
                  <div className="border-b border-cream-200 px-4 py-3"><p className="text-sm font-semibold">{user!.fullName}</p><p className="text-xs text-charcoal-400">+91 {user!.phone}</p></div>
                  <Link to="/profile" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-cream-50"><UserIcon className="h-4 w-4" />Profile</Link>
                  <Link to="/my-requests" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-cream-50"><ChefHat className="h-4 w-4" />My dish requests</Link>
                  <Link to="/orders" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-cream-50"><ClipboardList className="h-4 w-4" />My orders</Link>
                  <Link to="/subscriptions" className="flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-cream-50"><Repeat className="h-4 w-4" />Meal subscriptions</Link>
                  <button onClick={() => { logout(); nav('/'); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Logout</button>
                </div>
              </div>
            </div>
          ) : (
            <Link to="/login" className="btn-primary hidden md:inline-flex">Login</Link>
          )}
          <button className="rounded-xl p-2 md:hidden" onClick={() => setMenuOpen(true)} aria-label="Menu"><Menu className="h-6 w-6" /></button>
        </div>
        <div className="container-x pb-3 md:hidden"><LocationPicker /></div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-[900] bg-charcoal-900/40 md:hidden" onClick={() => setMenuOpen(false)}>
          <div className="absolute right-0 top-0 h-full w-72 bg-white p-5 shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between"><Logo /><button onClick={() => setMenuOpen(false)}><X className="h-6 w-6" /></button></div>
            <form onSubmit={(e) => { search(e); setMenuOpen(false); }} className="mb-4">
              <input value={q} onChange={(e) => setQ(e.target.value)} className="input" placeholder="Search food or kitchens" />
            </form>
            {[...links, { to: '/my-requests', label: 'My dish requests', icon: ChefHat }, { to: '/subscriptions', label: 'Meal subscriptions', icon: Repeat }, { to: '/profile', label: 'Profile', icon: UserIcon }].map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 font-medium hover:bg-cream-100">
                <l.icon className="h-5 w-5 text-brand-600" />{l.label}
              </Link>
            ))}
            <div className="mt-4 border-t border-cream-200 pt-4">
              {isCustomer ? <button onClick={() => { logout(); setMenuOpen(false); nav('/'); }} className="btn-outline w-full">Logout</button>
                : <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-primary w-full">Login / Sign up</Link>}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        {pathname !== '/' && <div className="container-x pt-4"><BackButton fallback="/" /></div>}
        <Outlet />
      </main>

      <footer className="mt-16 bg-charcoal-900 text-cream-200">
        <div className="container-x grid gap-10 py-12 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-sm text-sm text-cream-300/80">Homemade food. Local kitchens. A taste of home. Connecting students, professionals and families in Coimbatore with verified home chefs.</p>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-white">For home chefs</p>
            <ul className="space-y-2 text-sm text-cream-300/80">
              <li><Link to="/kitchen/register" className="hover:text-white">Become a kitchen partner</Link></li>
              <li><Link to="/kitchen/login" className="hover:text-white">Kitchen partner login</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 text-sm font-semibold text-white">Company</p>
            <ul className="space-y-2 text-sm text-cream-300/80">
              <li><Link to="/kitchens" className="hover:text-white">Explore kitchens</Link></li>
              <li><Link to="/admin/login" className="inline-flex items-center gap-1 hover:text-white"><ShieldCheck className="h-3.5 w-3.5" />Admin portal</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-cream-300/60">© {new Date().getFullYear()} HomePlate · Made with love in Coimbatore</div>
      </footer>
    </div>
  );
}
