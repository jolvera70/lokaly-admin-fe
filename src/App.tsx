// src/App.tsx
import { useState } from "react";

// Login
import { LoginPage } from "./LoginPage";
import type { LoginSuccessPayload } from "./LoginPage";

// Layout administrador
import { AdminLayout } from "./AdminLayout";

// Router
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

// Páginas del admin
import ColoniesPage from "./pages/ColoniesPage";
import ClustersPage from "./pages/ClustersPage";
import ColoniesSelectorPage from "./pages/ColoniesSelectorPage";
import NeighborSignupPage from "./pages/NeighborSignupPage";
import UsersPage from "./pages/UsersPage";
import SellerCheckoutPage from "./pages/SellerCheckoutPage";

// Públicas
import { PublicCatalogPage } from "./pages/public/PublicCatalogPage";
import { PublicProductPage } from "./pages/public/PublicProductPage";
import { LandingPage } from "./pages/public/LandingPAge";

// Seller panel (nuevas)
import SellerProductsPage from "./pages/seller/SellerProductsPage";
import SellerStatsPage from "./pages/seller/SellerStatsPage";
import SellerSettingsPage from "./pages/seller/SellerSettingsPage";

type AuthState = {
  token: string;
  name: string;
  role: string;
} | null;

function loadInitialAuth(): AuthState {
  const token = localStorage.getItem("lokaly_admin_token");
  const name = localStorage.getItem("lokaly_admin_name");
  const role = localStorage.getItem("lokaly_admin_role");
  if (!token || !name || !role) return null;
  return { token, name, role };
}

// eslint-disable-next-line react-refresh/only-export-components
function AdminShell({
  auth,
  onLogout,
}: {
  auth: AuthState;
  onLogout: () => void;
}) {
  if (!auth) return <Navigate to="/login" replace />;

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

    setAuth({
      token: data.accessToken,
      name: data.name,
      role: data.role,
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("lokaly_admin_token");
    localStorage.removeItem("lokaly_admin_name");
    localStorage.removeItem("lokaly_admin_role");
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

        {/* 🔑 Login admin */}
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

        {/* 🔒 Rutas protegidas admin */}
        <Route element={<AdminShell auth={auth} onLogout={handleLogout} />}>
          <Route path="/admin/dashboard" element={<div>Dashboard</div>} />
          <Route path="/admin/clusters" element={<ClustersPage />} />
          <Route path="/admin/colonies" element={<ColoniesSelectorPage />} />
          <Route path="/admin/colonies/:clusterId" element={<ColoniesPage />} />
          <Route path="/admin/signup" element={<NeighborSignupPage />} />
          <Route path="/admin/users" element={<UsersPage />} />
          <Route path="/admin/seller/checkout" element={<SellerCheckoutPage />} />

          {/* Admin puede abrir catálogos también */}
          <Route path="/admin/catalog/:slug" element={<PublicCatalogPage />} />

          {/* 🧑‍💼 Panel vendedor (web) */}
          <Route path="/admin/seller/products" element={<SellerProductsPage />} />
          <Route path="/admin/seller/stats" element={<SellerStatsPage />} />
          <Route path="/admin/seller/settings" element={<SellerSettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;