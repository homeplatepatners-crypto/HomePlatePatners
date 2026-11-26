import { useEffect, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BarChart3, ChefHat, Repeat, ClipboardList, CreditCard, LayoutDashboard, MessageSquareQuote, Settings, Store, UtensilsCrossed, Video } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout, { type NavItem } from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { api, errMsg } from '../../api/client';
import { Toggle } from '../../components/ui';
import KitchenDashboard from './KitchenDashboard';
import Onboarding from './Onboarding';
import MenuPage from './MenuPage';
import RequestsPage from './RequestsPage';
import OrdersPage from './OrdersPage';
import VideosPage from './VideosPage';
import EarningsPage from './EarningsPage';
import SubscriptionPage from './SubscriptionPage';
import ReviewsPage from './ReviewsPage';
import ProfilePage from './ProfilePage';
import SettingsPage from './SettingsPage';
import MealPlansPage from './MealPlansPage';

export default function KitchenPortal() {
  const { kitchen, refresh } = useAuth();
  const loc = useLocation();
  const [counts, setCounts] = useState<{ orders: number; requests: number }>({ orders: 0, requests: 0 });
  const status = kitchen?.status;
  const active = status === 'ACTIVE';
  const needsOnboarding = status === 'PENDING' || status === 'DOCS_REQUESTED' || status === 'REJECTED';

  useEffect(() => {
    if (!active) return;
    const load = () => Promise.all([api.get('/kitchen/orders'), api.get('/kitchen/requests')]).then(([o, r]) => setCounts({
      orders: o.data.filter((x: { status: string }) => ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(x.status)).length,
      requests: r.data.filter((x: { myQuote: unknown }) => !x.myQuote).length,
    })).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [active, loc.pathname]);

  const nav: NavItem[] = [
    { to: '/kitchen', label: 'Dashboard', icon: LayoutDashboard, end: true },
    ...(needsOnboarding ? [{ to: '/kitchen/onboarding', label: 'Complete Onboarding', icon: Store, badge: '!' }] : []),
    { to: '/kitchen/profile', label: 'Kitchen Profile', icon: Store },
    { to: '/kitchen/menu', label: 'Daily Menu', icon: UtensilsCrossed },
    { to: '/kitchen/requests', label: 'Custom Food Requests', icon: ChefHat, badge: counts.requests },
    { to: '/kitchen/orders', label: 'Orders', icon: ClipboardList, badge: counts.orders },
    { to: '/kitchen/meal-plans', label: 'Meal Plans & Subscribers', icon: Repeat },
    { to: '/kitchen/videos', label: 'Cooking Videos', icon: Video },
    { to: '/kitchen/earnings', label: 'Earnings', icon: BarChart3 },
    { to: '/kitchen/subscription', label: 'Subscription', icon: CreditCard },
    { to: '/kitchen/reviews', label: 'Reviews', icon: MessageSquareQuote },
    { to: '/kitchen/settings', label: 'Settings', icon: Settings },
  ];

  const toggle = async (v: boolean) => {
    try { await api.patch('/kitchen/accepting', { accepting: v }); await refresh(); toast.success(v ? 'You are now accepting orders' : 'Orders paused'); }
    catch (e) { toast.error(errMsg(e)); }
  };

  const banner = !kitchen ? null : status === 'UNDER_REVIEW' ? (
    <div className="bg-amber-50 px-6 py-2.5 text-center text-sm text-amber-800">Your application is <b>under review</b>. We'll notify you by SMS once approved — usually within 48 hours.</div>
  ) : status === 'APPROVED' ? (
    <div className="bg-brand-50 px-6 py-2.5 text-center text-sm text-brand-800">🎉 Your kitchen is approved! <Link to="/kitchen" className="font-semibold underline">Activate now</Link> to start your free trial.</div>
  ) : needsOnboarding && !loc.pathname.includes('onboarding') ? (
    <div className="bg-saffron-50 px-6 py-2.5 text-center text-sm text-saffron-700">{status === 'DOCS_REQUESTED' ? 'Admin requested additional documents.' : status === 'REJECTED' ? 'Your application needs changes.' : 'Finish setting up your kitchen.'} <Link to="/kitchen/onboarding" className="font-semibold underline">Continue onboarding →</Link></div>
  ) : status === 'SUSPENDED' ? (
    <div className="bg-red-50 px-6 py-2.5 text-center text-sm text-red-700">Your kitchen is suspended. {kitchen.adminRemarks} Contact support@homeplate.in.</div>
  ) : null;

  return (
    <Routes>
      <Route element={<DashboardLayout nav={nav} portalLabel="Kitchen Partner" banner={banner}
        topRight={active && kitchen ? <Toggle checked={kitchen.acceptingOrders} onChange={toggle} label={<span className="hidden sm:inline">{kitchen.acceptingOrders ? 'Accepting orders' : 'Orders paused'}</span>} /> : null} />}>
        <Route index element={<KitchenDashboard />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="meal-plans" element={<MealPlansPage />} />
        <Route path="videos" element={<VideosPage />} />
        <Route path="earnings" element={<EarningsPage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/kitchen" replace />} />
      </Route>
    </Routes>
  );
}
