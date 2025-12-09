import React from "react";
import { NavLink } from "react-router-dom";
import lokalyLogo from "./assets/lokaly-logo.svg";

type AdminLayoutProps = {
  name: string;
  onLogout: () => void;
  children: React.ReactNode;
};

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  name,
  onLogout,
  children,
}) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        background:
          "radial-gradient(circle at top, #161616 0, #020202 55%)",
        color: "#f5f5f5",
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro", sans-serif',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 240,
          borderRight: "1px solid rgba(255,255,255,0.06)",
          padding: "18px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          background:
            "linear-gradient(180deg, #050505 0, #050505 60%, #020202 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <img
            src={lokalyLogo}
            alt="Lokaly"
            style={{ height: 26, objectFit: "contain" }}
          />
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <NavItem label="Dashboard" to="/" exact />
          <NavItem label="Clusters" to="/admin/clusters" />
          <NavItem label="Colonias" to="/admin/colonies" />
          <NavItem label="Usuarios" to="/admin/users" />
          <NavItem label="Ajustes" to="/admin/settings" />
          <NavItem label="Checkout" to="/admin/checkout" />
        </nav>

        <div style={{ flexGrow: 1 }} />

        <div
          style={{
            fontSize: 11,
            color: "#777",
          }}
        >
          © {new Date().getFullYear()} Lokaly
        </div>
      </aside>

      {/* Main */}
      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
        {/* Topbar */}
        <header
          style={{
            height: 64,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            backdropFilter: "blur(10px)",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 500,
              }}
            >
              Panel de Superadmin
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#9b9b9b",
              }}
            >
              Configuración global de clusters y colonias
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                textAlign: "right",
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 500 }}>{name}</div>
              <div style={{ color: "#9b9b9b" }}>SUPERADMIN</div>
            </div>
            <button
              onClick={onLogout}
              style={{
                padding: "7px 14px",
                borderRadius: 999,
                border: "1px solid rgba(216,178,90,0.6)",
                background: "transparent",
                color: "#f2d58b",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {/* Content (rutas) */}
        <main
          style={{
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

const NavItem: React.FC<{
  label: string;
  to: string;
  exact?: boolean;
}> = ({ label, to, exact }) => (
  <NavLink
    to={to}
    end={exact}
    style={({ isActive }) => ({
      textAlign: "left",
      padding: "8px 10px",
      borderRadius: 999,
      border: "none",
      fontSize: 13,
      cursor: "pointer",
      textDecoration: "none",
      background: isActive ? "rgba(216,178,90,0.18)" : "transparent",
      color: isActive ? "#f2d58b" : "#dddddd",
    })}
  >
    {label}
  </NavLink>
);