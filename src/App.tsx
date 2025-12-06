import { useState } from "react";

// Login
import { LoginPage } from "./LoginPage";
import type { LoginSuccessPayload } from "./LoginPage";

// Layout administrador
import { AdminLayout } from "./AdminLayout";

// Router
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Páginas del admin
import ColoniesPage from "./pages/ColoniesPage";
import ClustersPage from "./pages/ClustersPage";
import ColoniesSelectorPage from "./pages/ColoniesSelectorPage";
import NeighborSignupPage from "./pages/NeighborSignupPage";
import UsersPage from "./pages/UsersPage";
import SellerCheckoutPage from "./pages/SellerCheckoutPage";

// Pública: catálogo
import { PublicCatalogPage } from "./pages/public/PublicCatalogPage";
// Pública: landing nueva
import { LandingPage } from "./pages/public/LandingPAge";

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
        {/* 🌐 Landing pública en / */}
        <Route path="/" element={<LandingPage />} />

        {/* 🌐 Ruta pública de catálogo */}
        <Route path="/catalog/:slug" element={<PublicCatalogPage />} />

        {/* 🔑 Login admin */}
        <Route
          path="/login"
          element={
            auth ? (
              <Navigate to="/admin" replace />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        {/* 🔒 Rutas privadas del admin */}
        <Route
          path="/admin/*"
          element={
            auth ? (
              <AdminLayout name={auth.name} onLogout={handleLogout}>
                <Routes>
                  <Route path="" element={<div>Dashboard</div>} />
                  <Route path="clusters" element={<ClustersPage />} />
                  <Route path="colonies" element={<ColoniesSelectorPage />} />
                  <Route path="colonies/:clusterId" element={<ColoniesPage />} />
                  <Route path="signup" element={<NeighborSignupPage />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="seller/checkout" element={<SellerCheckoutPage />} />
                  <Route path="catalog/:slug" element={<PublicCatalogPage />} />
                </Routes>
              </AdminLayout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;