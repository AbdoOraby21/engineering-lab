import { Suspense, lazy, useEffect, useLayoutEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom';
import i18n, { getStoredLanguage, isAppLanguage } from './lib/i18n';
import { ensureSession } from './lib/session';
import { useUiStore } from './stores/ui.store';
import BrandHead from './components/BrandHead';
import Header from './components/layout/Header';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Toaster from './components/ui/Toaster';
import Spinner from './components/ui/Spinner';
import CartDrawer from './components/cart/CartDrawer';
import CompareTray from './components/compare/CompareTray';
import LoginPrompt from './components/LoginPrompt';
import ProtectedRoute from './components/ProtectedRoute';
const HomePage = lazy(() => import('./pages/Home'));
const LoginPage = lazy(() => import('./pages/Login'));
const RegisterPage = lazy(() => import('./pages/Register'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPassword'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPassword'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmail'));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallback'));
const NotFoundPage = lazy(() => import('./pages/NotFound'));

// Catalog group
const CatalogPage = lazy(() => import('./pages/Catalog'));
const ProductPage = lazy(() => import('./pages/Product'));
const BrandPage = lazy(() => import('./pages/Brand'));
const SearchPage = lazy(() => import('./pages/Search'));
const FaqPage = lazy(() => import('./pages/Faq'));
const StaticPage = lazy(() => import('./pages/StaticPage'));

// Cart / checkout group
const CartPage = lazy(() => import('./pages/Cart'));
const ComparePage = lazy(() => import('./pages/Compare'));

// Account group
const AccountLayout = lazy(() => import('./pages/account/AccountLayout'));
const ProfilePage = lazy(() => import('./pages/account/Profile'));
const AddressesPage = lazy(() => import('./pages/account/Addresses'));
const ChangePasswordPage = lazy(() => import('./pages/account/ChangePassword'));

// Admin group
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminNotAuthorized = lazy(() => import('./pages/admin/NotAuthorized'));
const SettingsPage = lazy(() => import('./pages/admin/Settings'));

// Static pages
const AboutPage = lazy(() => import('./pages/About'));
const ContactPage = lazy(() => import('./pages/Contact'));
const WishlistPage = lazy(() => import('./pages/Wishlist'));
const SupportPage = lazy(() => import('./pages/Support'));
const SupportTicketPage = lazy(() => import('./pages/SupportTicket'));
const CheckoutPage = lazy(() => import('./pages/Checkout'));
const OrderPayPage = lazy(() => import('./pages/OrderPay'));
const MyOrdersPage = lazy(() => import('./pages/MyOrders'));
const OrderDetailsPage = lazy(() => import('./pages/OrderDetails'));

function persistLanguage(lang: string): void {
  try {
    localStorage.setItem('el_lang', lang);
  } catch {
    return;
  }
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

function LocaleLayout() {
  const { lang } = useParams<{ lang: string }>();
  const location = useLocation();
  const setMobileMenu = useUiStore((state) => state.setMobileMenu);

  useLayoutEffect(() => {
    if (!isAppLanguage(lang)) {
      return;
    }
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    persistLanguage(lang);
    void i18n.changeLanguage(lang);
  }, [lang]);

  useEffect(() => {
    setMobileMenu(false);
  }, [location.pathname, setMobileMenu]);

  if (!isAppLanguage(lang)) {
    const rest = location.pathname.replace(/^\/[^/]+/, '');
    return (
      <Navigate to={`/${getStoredLanguage()}${rest}${location.search}`} replace />
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <BrandHead />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:rounded"
      >
        Skip to content
      </a>
      <Header />
      <Navbar />
      <main className="flex-1" id="main-content">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <Toaster />
      <CartDrawer />
      <CompareTray />
      <LoginPrompt />
    </div>
  );
}

function RootRedirect() {
  return <Navigate to={`/${getStoredLanguage()}`} replace />;
}

function CatchAll() {
  const location = useLocation();
  return (
    <Navigate to={`/${getStoredLanguage()}${location.pathname}${location.search}`} replace />
  );
}

export default function App() {
  useEffect(() => {
    void ensureSession();
  }, []);

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/:lang" element={<LocaleLayout />}>
          <Route index element={<HomePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route path="auth/callback" element={<AuthCallbackPage />} />
          <Route path="catalog" element={<CatalogPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="products/:slug" element={<ProductPage />} />
          <Route path="brands/:slug" element={<BrandPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="returns" element={<StaticPage slug="returns" />} />
          <Route path="privacy" element={<StaticPage slug="privacy" />} />
          <Route path="terms" element={<StaticPage slug="terms" />} />
          <Route path="support" element={<SupportPage />} />
          <Route
            path="support/:ticketId"
            element={
              <ProtectedRoute>
                <SupportTicketPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="wishlist"
            element={
              <ProtectedRoute>
                <WishlistPage />
              </ProtectedRoute>
            }
          />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<CheckoutPage />} />
          <Route path="orders" element={<MyOrdersPage />} />
          <Route path="orders/:orderNumber" element={<OrderDetailsPage />} />
          <Route path="orders/:orderNumber/pay" element={<OrderPayPage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="admin/*" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="forbidden" element={<AdminNotAuthorized />} />
            <Route path="*" element={<AdminNotAuthorized />} />
          </Route>
          <Route
            path="account"
            element={
              <ProtectedRoute>
                <AccountLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="profile" replace />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="addresses" element={<AddressesPage />} />
            <Route path="password" element={<ChangePasswordPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        <Route path="*" element={<CatchAll />} />
      </Routes>
    </BrowserRouter>
  );
}
