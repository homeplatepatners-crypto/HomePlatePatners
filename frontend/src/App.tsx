import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import CustomerLayout from './layouts/CustomerLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { PageLoader } from './components/ui';

// Customer
import Home from './pages/customer/Home';
import Kitchens from './pages/customer/Kitchens';
import KitchenDetail from './pages/customer/KitchenDetail';
import CustomRequestPage from './pages/customer/CustomRequestPage';
import MyRequests from './pages/customer/MyRequests';
import RequestDetail from './pages/customer/RequestDetail';
import Cart from './pages/customer/Cart';
import Orders from './pages/customer/Orders';
import OrderTracking from './pages/customer/OrderTracking';
import Profile from './pages/customer/Profile';
import MySubscriptions from './pages/customer/MySubscriptions';
// Auth
import LoginPage from './pages/auth/LoginPage';
import CustomerRegister from './pages/auth/CustomerRegister';
import KitchenRegister from './pages/auth/KitchenRegister';
import ForgotPassword from './pages/auth/ForgotPassword';

// Portals are code-split
const KitchenPortal = lazy(() => import('./pages/kitchen/KitchenPortal'));
const AdminPortal = lazy(() => import('./pages/admin/AdminPortal'));

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route index element={<Home />} />
          <Route path="kitchens" element={<Kitchens />} />
          <Route path="kitchens/:id" element={<KitchenDetail />} />
          <Route path="request" element={<CustomRequestPage />} />
          <Route path="cart" element={<Cart />} />
          <Route path="my-requests" element={<ProtectedRoute role="CUSTOMER"><MyRequests /></ProtectedRoute>} />
          <Route path="my-requests/:id" element={<ProtectedRoute role="CUSTOMER"><RequestDetail /></ProtectedRoute>} />
          <Route path="orders" element={<ProtectedRoute role="CUSTOMER"><Orders /></ProtectedRoute>} />
          <Route path="orders/:id" element={<ProtectedRoute role="CUSTOMER"><OrderTracking /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute role="CUSTOMER"><Profile /></ProtectedRoute>} />
          <Route path="subscriptions" element={<ProtectedRoute role="CUSTOMER"><MySubscriptions /></ProtectedRoute>} />
        </Route>

        <Route path="/login" element={<LoginPage portal="customer" />} />
        <Route path="/register" element={<CustomerRegister />} />
        <Route path="/kitchen/login" element={<LoginPage portal="kitchen" />} />
        <Route path="/kitchen/register" element={<KitchenRegister />} />
        <Route path="/admin/login" element={<LoginPage portal="admin" />} />
        <Route path="/forgot-password" element={<ForgotPassword portal="customer" />} />
        <Route path="/kitchen/forgot-password" element={<ForgotPassword portal="kitchen" />} />

        <Route path="/kitchen/*" element={<ProtectedRoute role="KITCHEN_OWNER"><KitchenPortal /></ProtectedRoute>} />
        <Route path="/admin/*" element={<ProtectedRoute role="ADMIN"><AdminPortal /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
