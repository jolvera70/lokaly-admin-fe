// src/pages/ColoniesSelectorPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchClusters, type ClusterSummary } from "../lib/coloniesApi";

const ColoniesSelectorPage: React.FC = () => {
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchClusters();
        setClusters(data);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Error al cargar clusters");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <section
      style={{
        maxWidth: 1160,
        margin: "0 auto",
        paddingTop: 8,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          Selecciona un cluster
        </h1>
        <p
          style={{
            marginTop: 4,
            fontSize: 13,
            color: "#9b9b9b",
          }}
        >
          Elige el cluster para administrar sus colonias.
        </p>
      </div>

      <div
        style={{
          marginTop: 8,
          padding: 20,
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.06)",
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(5,5,5,0.9))",
          boxShadow: "0 18px 45px rgba(0,0,0,0.65)",
        }}
      >
        {loading && (
          <p style={{ fontSize: 13, color: "#bcbcbc" }}>Cargando clusters…</p>
        )}

        {error && !loading && (
          <p style={{ fontSize: 13, color: "#ff9a9a" }}>{error}</p>
        )}

        {!loading && !error && clusters.length === 0 && (
          <p style={{ fontSize: 13, color: "#bcbcbc" }}>
            Todavía no hay clusters registrados.
          </p>
        )}

        {!loading && !error && clusters.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 20,
              padding: "10px 2px",
            }}
          >
            {clusters.map((cluster) => (
              <button
                key={cluster.id}
                onClick={() => navigate(`/admin/colonies/${cluster.id}`)}
                style={{
                  textAlign: "left",
                  padding: "20px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    "linear-gradient(180deg, rgba(25,25,25,0.9), rgba(10,10,10,0.95))",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  boxShadow: "0 12px 30px rgba(0,0,0,0.55)",
                  transition: "transform 0.18s ease, box-shadow 0.22s ease",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.transform = "translateY(-4px)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#f2d58b",
                    fontWeight: 600,
                  }}
                >
                  Cluster
                </div>

                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    color: "#f5f5f5",
                  }}
                >
                  {cluster.name}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "#cfcfcf",
                  }}
                >
                  {cluster.city} · {(cluster as any).coloniesCount ?? 0} colonias
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ColoniesSelectorPage;