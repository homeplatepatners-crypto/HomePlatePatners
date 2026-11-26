import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BadgeCheck, BarChart3, ChefHat, NotebookPen, Repeat, ClipboardList, CreditCard, FileCheck2, FileText, LayoutDashboard, MessageSquareWarning, Settings, Store, Tag, Users, Video } from 'lucide-react';
import DashboardLayout, { type NavItem } from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import AdminDashboard from './AdminDashboard';
import { DocumentsPage, KitchenDetailAdmin, KitchensPage, VerificationQueue } from './AdminKitchens';
import { ComplaintsPage, CustomersPage } from './AdminPeople';
import { CustomRequestsAdmin, OrdersAdmin, VideoReviews } from './AdminOps';
import { OffersPage, ReportsPage, RevenuePage, SubscriptionsAdmin } from './AdminMoney';
import AdminSettings from './AdminSettings';
import AdminMenus from './AdminMenus';
import AdminMealSubscriptions from './AdminMealSubscriptions';

export default function AdminPortal() {
  const loc = useLocation();
  const [b, setB] = useState({ pending: 0, videos: 0, complaints: 0 });
  useEffect(() => {
    api.get('/admin/dashboard').then(({ data }) => setB({ pending: data.kpis.pendingApprovals, videos: data.kpis.pendingVideos, complaints: data.kpis.openComplaints })).catch(() => {});
  }, [loc.pathname]);

  const nav: NavItem[] = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/kitchens', label: 'Kitchen Management', icon: Store },
    { to: '/admin/customers', label: 'Customer Management', icon: Users },
    { to: '/admin/verification', label: 'Kitchen Verification', icon: BadgeCheck, badge: b.pending },
    { to: '/admin/documents', label: 'Document Verification', icon: FileCheck2 },
    { to: '/admin/menus', label: 'Daily Menu Verification', icon: NotebookPen },
    { to: '/admin/videos', label: 'Cooking Video Reviews', icon: Video, badge: b.videos },
    { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
    { to: '/admin/requests', label: 'Custom Requests', icon: ChefHat },
    { to: '/admin/subscriptions', label: 'Kitchen Subscriptions', icon: CreditCard },
    { to: '/admin/meal-subscriptions', label: 'Customer Meal Plans', icon: Repeat },
    { to: '/admin/revenue', label: 'Revenue & Commission', icon: BarChart3 },
    { to: '/admin/offers', label: 'Offers', icon: Tag },
    { to: '/admin/reports', label: 'Reports', icon: FileText },
    { to: '/admin/complaints', label: 'Complaints', icon: MessageSquareWarning, badge: b.complaints },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <Routes>
      <Route element={<DashboardLayout nav={nav} portalLabel="Super Admin" />}>
        <Route index element={<AdminDashboard />} />
        <Route path="kitchens" element={<KitchensPage />} />
        <Route path="kitchens/:id" element={<KitchenDetailAdmin />} />
        <Route path="verification" element={<VerificationQueue />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="menus" element={<AdminMenus />} />
        <Route path="videos" element={<VideoReviews />} />
        <Route path="orders" element={<OrdersAdmin />} />
        <Route path="requests" element={<CustomRequestsAdmin />} />
        <Route path="subscriptions" element={<SubscriptionsAdmin />} />
        <Route path="meal-subscriptions" element={<AdminMealSubscriptions />} />
        <Route path="revenue" element={<RevenuePage />} />
        <Route path="offers" element={<OffersPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="complaints" element={<ComplaintsPage />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
