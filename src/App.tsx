import { useState } from "react";
import { LoginPage } from "./LoginPage";
import type { LoginSuccessPayload } from "./LoginPage";
import { AdminLayout } from "./AdminLayout";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ColoniesPage from "./pages/ColoniesPage";
import ClustersPage from "./pages/ClustersPage";
import ColoniesSelectorPage from "./pages/ColoniesSelectorPage";
import NeighborSignupPage from "./pages/NeighborSignupPage";
import UsersPage from "./pages/UsersPage";
import SellerCheckoutPage from "./pages/SellerCheckoutPage";


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

  if (!auth) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
  <BrowserRouter>
    <AdminLayout name={auth.name} onLogout={handleLogout}>
      <Routes>
        <Route path="/" element={<div>Dashboard (luego lo llenamos)</div>} />
        <Route path="/clusters" element={<ClustersPage />} />
        <Route path="/colonies" element={<ColoniesSelectorPage />} />
        <Route path="/colonies/:clusterId" element={<ColoniesPage />} />
        <Route path="/signup" element={<NeighborSignupPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/seller/checkout" element={<SellerCheckoutPage />} />
      </Routes>
    </AdminLayout>
  </BrowserRouter>
  );
}

export default App;