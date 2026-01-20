// src/App.tsx
import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { canAccessAdminPanel, canAccessSellerPanel, normalizeRole } from "./auth";

// Login
import { LoginPage } from "./LoginPage";
import type { LoginSuccessPayload } from "./LoginPage";

// Layout
import { AdminLayout } from "./AdminLayout";

// Páginas del admin
import ColoniesPage from "./pages/ColoniesPage";
import ColoniesSelectorPage from "./pages/ColoniesSelectorPage";
import NeighborSignupPage from "./pages/NeighborSignupPage";
import UsersPage from "./pages/UsersPage";
import SellerCheckoutPage from "./pages/SellerCheckoutPage";
import { PublishStartPage } from "./pages/publicar/PublishStartPage";
import  VerifyOtpRoutePage  from "./pages/publicar/VerifyOtpRoutePage";
import ProductFormPage from "./pages/publicar/ProductFormPage";
import PaymentPage from "./pages/publicar/PaymentPage";
import PublishSuccessPage  from "./pages/publicar/PublishSuccessPage";
import MyProductsPage from "./pages/publicar/MyProductsPage";
import EditProductPage from "./pages/publicar/EditProductPage";


// Públicas
import { PublicCatalogPage } from "./pages/public/PublicCatalogPage";
import { PublicProductPage } from "./pages/public/PublicProductPage";
import  LandingPage  from "./pages/public/LandingPAge";

// Seller panel
import SellerProductsPage from "./pages/seller/SellerProductsPage";
import SellerStatsPage from "./pages/seller/SellerStatsPage";
import SellerSettingsPage from "./pages/seller/SellerSettingsPage";
import SellerOrdersPage from "./pages/seller/SellerOrdersPage";
import Dashboard from "./pages/Dashboard";

type AuthState = {
  token: string;
  name: string;
  role: string;
  isSeller: boolean;
} | null;

function decodeJwtPayload(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function loadInitialAuth(): AuthState {
  const token = localStorage.getItem("lokaly_admin_token");
  const name = localStorage.getItem("lokaly_admin_name");

  if (!token || !name) return null;

  const claims = decodeJwtPayload(token);
  const role = String(claims?.role || "").toUpperCase();
  const isSeller = claims?.seller === true;

  // Si no hay role en el token, considera sesión inválida
  if (!role) return null;

  return { token, name, role, isSeller };
}

// eslint-disable-next-line react-refresh/only-export-components
function AdminShell({
  auth,
  onLogout,
}: {
  auth: AuthState;
  onLogout: () => void;
}) {
  const location = useLocation();

  if (!auth) return <Navigate to="/login" replace />;

  const role = normalizeRole(auth.role);
  const isSellerArea = location.pathname.startsWith("/admin/seller");
  const isAdminArea = location.pathname.startsWith("/admin/") && !isSellerArea;

  // ✅ Seller panel: requiere seller=true (o admin)
  if (isSellerArea && !canAccessSellerPanel(role, auth.isSeller)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  // ✅ Admin panel: solo admins
  if (isAdminArea && !canAccessAdminPanel(role)) {
    return <Navigate to="/admin/seller/orders" replace />;
  }

  return (
    <AdminLayout name={auth.name} onLogout={onLogout}>
      <Outlet />
    </AdminLayout>
  );
}

function App() {
  const [auth, setAuth] = useState<AuthState>(() => loadInitialAuth());

  const handleLoginSuccess = (data: LoginSuccessPayload) => {
    localStorage.setItem("lokaly_admin_token", data.accessToken);
    localStorage.setItem("lokaly_admin_name", data.name);
    localStorage.setItem("lokaly_admin_role", data.role);

    // ✅ IMPORTANT: tu LoginSuccessPayload debe traer isSeller:boolean
    localStorage.setItem("lokaly_is_seller", String(data.seller));

    setAuth({
      token: data.accessToken,
      name: data.name,
      role: data.role,
      isSeller: Boolean(data.seller),
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("lokaly_admin_token");
    localStorage.removeItem("lokaly_admin_name");
    localStorage.removeItem("lokaly_admin_role");
    localStorage.removeItem("lokaly_is_seller");
    setAuth(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* 🌐 Landing pública */}
        <Route path="/" element={<LandingPage />} />

        {/* 🌐 Catálogo público */}
        <Route path="/catalog/:slug" element={<PublicCatalogPage />} />

        {/* 🌐 Detalle público de producto */}
        <Route path="/p/:productId" element={<PublicProductPage />} />

        <Route path="/publicar" element={<PublishStartPage />} />
        <Route path="/publicar/verificar" element={<VerifyOtpRoutePage />} />
        <Route path="/publicar/producto" element={<ProductFormPage />} />
        <Route path="/publicar/pago" element={<PaymentPage />} />
        <Route path="/publicar/listo" element={<PublishSuccessPage />} />
        <Route path="/publicar/mis-productos" element={<MyProductsPage />} />
        <Route path="/publicar/editar/:productId" element={<EditProductPage />} />

        {/* 🔑 Login */}
        <Route
          path="/login"
          element={
            auth ? (
              <Navigate to="/admin/dashboard" replace />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* 🔒 Rutas protegidas */}
        <Route element={<AdminShell auth={auth} onLogout={handleLogout} />}>
          <Route path="/admin/dashboard"  element={<Dashboard />} />

          {/* Admin */}
          <Route path="/admin/colonies" element={<ColoniesSelectorPage />} />
          <Route path="/admin/colonies/:clusterId" element={<ColoniesPage />} />
          <Route path="/admin/signup" element={<NeighborSignupPage />} />
          <Route path="/admin/users" element={<UsersPage />} />

          {/* Seller */}
          <Route path="/admin/seller/orders" element={<SellerOrdersPage />} />
          <Route path="/admin/seller/products" element={<SellerProductsPage />} />
          <Route path="/admin/seller/stats" element={<SellerStatsPage />} />
          <Route path="/admin/seller/settings" element={<SellerSettingsPage />} />
          <Route path="/admin/seller/checkout" element={<SellerCheckoutPage />} />
          

          {/* Admin puede abrir catálogos también */}
          <Route path="/admin/catalog/:slug" element={<PublicCatalogPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;