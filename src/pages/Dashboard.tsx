// src/pages/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { fetchAdminStats, type AdminStats } from "../api";

export default function Dashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await fetchAdminStats();
        setStats(data);
      } catch (e: any) {
        setError(e.message || "Error al cargar estadísticas");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <section
        style={{
          marginBottom: 12,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: 20,
            fontWeight: 500,
          }}
        >
          Dashboard
        </h2>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 13,
            color: "#9b9b9b",
          }}
        >
          Resumen general de Lokaly: usuarios, vendedores, ventas y actividad.
        </p>
      </section>

      <section
        style={{
          background: "rgba(5,5,5,0.9)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.06)",
          padding: 18,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {loading ? (
          <p style={{ fontSize: 13, color: "#e3e3e3" }}>
            Cargando estadísticas...
          </p>
        ) : error ? (
          <p style={{ fontSize: 13, color: "#ff6b6b" }}>{error}</p>
        ) : !stats ? (
          <p style={{ fontSize: 13, color: "#e3e3e3" }}>
            No hay estadísticas disponibles todavía.
          </p>
        ) : (
          <>
            {/* KPIs principales */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              <KpiCard
                label="Usuarios totales"
                value={stats.totalUsers.toString()}
              />
              <KpiCard
                label="Vendedores activos"
                value={stats.totalSellers.toString()}
              />
              <KpiCard
                label="Productos publicados"
                value={stats.totalProducts.toString()}
              />
              <KpiCard
                label="Ventas totales"
                value={stats.totalSales.toString()}
              />
            </div>

            {/* Actividad y engagement */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              <Card
                title="Actividad reciente"
                description="Cómo se ha movido la plataforma en los últimos 7 días."
              >
                <SmallStat
                  label="Nuevos usuarios (7 días)"
                  value={stats.newUsersLast7Days.toString()}
                />
                <SmallStat
                  label="Vendedores activos (7 días)"
                  value={stats.activeSellersLast7Days.toString()}
                />
              </Card>

              <Card
                title="Engagement con catálogos"
                description="Visitas a productos y catálogos públicos."
              >
                <SmallStat
                  label="Vistas de productos"
                  value={stats.totalProductViews.toString()}
                />
                <SmallStat
                  label="Vistas de catálogos"
                  value={stats.totalCatalogViews.toString()}
                />
              </Card>
            </div>

            <p
              style={{
                margin: "4px 0 0",
                fontSize: 11,
                color: "#7a7a7a",
              }}
            >
              Tip: usa estos datos para entender qué tan rápido está creciendo
              Lokaly y qué tanto están usando los catálogos los vendedores.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

const KpiCard: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div
    style={{
      padding: 14,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)",
      background:
        "radial-gradient(circle at top left, rgba(255,255,255,0.08), rgba(0,0,0,0.9))",
    }}
  >
    <div
      style={{
        fontSize: 11,
        color: "#a3a3a3",
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 22,
        fontWeight: 600,
        color: "#f2d58b",
      }}
    >
      {value}
    </div>
  </div>
);

const Card: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => (
  <div
    style={{
      padding: 14,
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,0.08)",
      background: "rgba(8,8,8,0.95)",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}
  >
    <div>
      <div
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "#f5f5f5",
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 12,
            color: "#9b9b9b",
          }}
        >
          {description}
        </div>
      )}
    </div>
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      {children}
    </div>
  </div>
);

const SmallStat: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      fontSize: 12,
      color: "#e3e3e3",
    }}
  >
    <span>{label}</span>
    <span
      style={{
        fontWeight: 600,
        color: "#f2d58b",
      }}
    >
      {value}
    </span>
  </div>
);