// src/pages/ColoniesPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  type ClusterDetail,
  type Colony,
  fetchCluster,
  fetchColonies,
  createColony,
  updateColony,
  deleteColony,
} from "../lib/coloniesApi";
import { CreateColonyModal } from "../CreateColonyModal";
import { EditColonyModal } from "../EditColonyModal";

const ColoniesPage: React.FC = () => {
  const { clusterId } = useParams<{ clusterId: string }>();
  const navigate = useNavigate();

  const [cluster, setCluster] = useState<ClusterDetail | null>(null);
  const [colonies, setColonies] = useState<Colony[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedColony, setSelectedColony] = useState<Colony | null>(null);

  const title = useMemo(
    () =>
      cluster
        ? `Colonias de ${cluster.name} (${cluster.city})`
        : "Colonias",
    [cluster]
  );

  const loadData = async () => {
    if (!clusterId) return;
    try {
      setLoading(true);
      setError(null);
      const [clusterData, coloniesData] = await Promise.all([
        fetchCluster(clusterId),
        fetchColonies(clusterId),
      ]);
      setCluster(clusterData);
      setColonies(coloniesData);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!clusterId) return;
    void loadData();
  }, [clusterId]);

  // 👉 se usará después de crear/editar colonia
  const refreshCluster = async () => {
    await loadData();
  };

  const handleCreateColony = async (body: {
    name: string;
    city?: string;
    state?: string;
    zipCode?: string;
  }) => {
    if (!clusterId) return;

    // Solo mandamos al backend lo que espera el DTO
    await createColony(clusterId, {
    name: body.name,
    city: body.city,
    state: body.state,
    zipCode: body.zipCode,
    } as any);
  };

  const handleDelete = async (colony: Colony) => {
    if (!clusterId) return;
    const ok = window.confirm(
      `¿Seguro que quieres eliminar la colonia "${colony.name}"?`
    );
    if (!ok) return;

    try {
      setSaving(true);
      setError(null);
      await deleteColony(clusterId, colony.id);
      await loadData();
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Error al eliminar la colonia");
    } finally {
      setSaving(false);
    }
  };

  if (!clusterId) {
    return (
      <div style={{ padding: 24 }}>
        <p>No se proporcionó clusterId en la URL.</p>
        <button
          onClick={() => navigate("/admin/colonies")}
          style={{
            marginTop: 12,
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "transparent",
            color: "#f5f5f5",
            cursor: "pointer",
          }}
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Encabezado de la página */}
      <section
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
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
            {title}
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 13,
              color: "#9b9b9b",
            }}
          >
            Administra las colonias asociadas a este cluster.
          </p>
        </div>

        <button
          onClick={() => navigate("/admin/colonies")}
          style={{
            padding: "7px 14px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.22)",
            background: "transparent",
            color: "#e5e5e5",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          ← Volver a selección
        </button>
      </section>

      {/* Tarjeta principal con la tabla */}
      <section
        style={{
          background: "rgba(5,5,5,0.9)",
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.06)",
          padding: 18,
          boxShadow: "0 18px 45px rgba(0,0,0,0.65)",
        }}
      >
        <div
          style={{
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              Listado de colonias
            </h2>
            <div
              style={{
                marginTop: 3,
                fontSize: 11,
                color: "#a3a3a3",
              }}
            >
              {loading
                ? "Cargando..."
                : `${colonies.length} colonia(s) registradas`}
              {saving && !loading && " · Guardando cambios..."}
            </div>
          </div>

          <button
            onClick={() => setOpenCreateModal(true)}
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              background: "linear-gradient(135deg, #f2d58b, #d8b25a)",
              color: "#211a08",
              boxShadow: "0 10px 24px rgba(0,0,0,0.6)",
            }}
          >
            + Nueva colonia
          </button>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 10,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,99,99,0.45)",
              background: "rgba(255,99,99,0.10)",
              color: "#ffb3b3",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        {!loading && colonies.length === 0 && !error && (
          <p style={{ fontSize: 13, color: "#bcbcbc" }}>
            No hay colonias registradas todavía.
          </p>
        )}

        {!loading && colonies.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    textAlign: "left",
                    color: "#a5a5a5",
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  <th style={{ padding: "8px 10px" }}>Nombre</th>
                  <th style={{ padding: "8px 10px" }}>CP</th>
                  <th style={{ padding: "8px 10px" }}>Notas</th>
                  <th
                    style={{
                      padding: "8px 10px",
                      textAlign: "right",
                    }}
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {colonies.map((colony) => (
                  <tr
                    key={colony.id}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <td style={{ padding: "8px 10px" }}>{colony.name}</td>
                    <td style={{ padding: "8px 10px" }}>
                      {colony.zipCode ?? "—"}
                    </td>
                    <td style={{ padding: "8px 10px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          maxWidth: 260,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: "#cfcfcf",
                        }}
                      >
                        {(colony as any).notes ?? "—"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        textAlign: "right",
                      }}
                    >
                      <button
                        onClick={() => {
                          setSelectedColony(colony);
                          setOpenEditModal(true);
                        }}
                        style={{
                          marginRight: 6,
                          padding: "5px 10px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.18)",
                          background: "transparent",
                          color: "#e8e8e8",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(colony)}
                        style={{
                          padding: "5px 10px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,99,99,0.6)",
                          background: "rgba(120,0,0,0.1)",
                          color: "#ff9a9a",
                          fontSize: 11,
                          cursor: "pointer",
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modal crear colonia */}
      {clusterId && (
        <CreateColonyModal
          open={openCreateModal}
          onClose={() => setOpenCreateModal(false)}
          onCreate={handleCreateColony}
          onCreated={loadData}
        />
      )}

      {/* Modal editar colonia */}
      {clusterId && (
        <EditColonyModal
          open={openEditModal}
          onClose={() => {
            setOpenEditModal(false);
            setSelectedColony(null);
          }}
          colony={selectedColony}
          onSave={async (body) => {
            if (!clusterId || !selectedColony) return;
            await updateColony(clusterId, selectedColony.id, body);
          }}
          onSuccess={refreshCluster}
        />
      )}
    </>
  );
};

export default ColoniesPage;