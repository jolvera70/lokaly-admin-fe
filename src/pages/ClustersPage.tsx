// src/pages/ClustersPage.tsx
import React, { useEffect, useState } from "react";
import {
  fetchClusters,
  fetchClusterById,
  createCluster,
  updateCluster,
  deleteCluster,
  updateSellerPlans,
  type SellerPlans,
  type SellerPlanConfig,
} from "../api";
import { fetchColonies, type Colony } from "../lib/coloniesApi";
import { CreateClusterModal } from "../CreateClusterModal";

type ClusterItem = {
  id: string;
  name: string;
  city: string;
  colonies: number;
  createdAt: string;
};

type ClusterDetail = {
  id: string;
  name: string;
  city: string;
  colonies: number;
  createdAt?: string;
  description?: string;
  sellerPlans?: SellerPlans;
};

// Normaliza los planes para que nunca falte ningún campo
const normalizeSellerPlans = (sp?: SellerPlans): SellerPlans => ({
  oneProduct: {
    enabled: false,
    price: 19,
    ...(sp?.oneProduct ?? {}),
  },
  threeProducts: {
    enabled: false,
    price: 49,
    ...(sp?.threeProducts ?? {}),
  },
  tenProducts: {
    enabled: false,
    price: 99,
    ...(sp?.tenProducts ?? {}),
  },
  fortyProducts: {
    enabled: false,
    price: 299,
    ...(sp?.fortyProducts ?? {}),
  },
});

const ClustersPage: React.FC = () => {
  const [clusters, setClusters] = useState<ClusterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedCluster, setSelectedCluster] =
    useState<ClusterDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [colonies, setColonies] = useState<Colony[]>([]);
  const [loadingColonies, setLoadingColonies] = useState(false);
  const [sellerPlansForm, setSellerPlansForm] = useState<SellerPlans>(
    normalizeSellerPlans()
  );
  const [savingPlans, setSavingPlans] = useState(false);

  async function loadClusters() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClusters();
      setClusters(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar clusters");
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenDetail(id: string) {
    setLoadingDetail(true);
    setView("detail");
    setError(null);

    try {
      const data = await fetchClusterById(id);

      const detail: ClusterDetail = {
        id: data.id,
        name: data.name,
        city: data.city,
        colonies: data.colonies ?? data.coloniesCount ?? 0,
        createdAt: data.createdAt,
        description: data.description,
        sellerPlans: data.sellerPlans,
      };

      setSelectedCluster(detail);

      const sp = data.sellerPlans as SellerPlans | undefined;
      setSellerPlansForm(normalizeSellerPlans(sp));

      setLoadingColonies(true);
      const list = await fetchColonies(id);
      setColonies(list);
    } catch (e: any) {
      setError(e.message || "Error al cargar el cluster");
    } finally {
      setLoadingDetail(false);
      setLoadingColonies(false);
    }
  }

  async function handleEditCluster() {
    if (!selectedCluster) return;

    const newName = window.prompt(
      "Nuevo nombre del cluster",
      selectedCluster.name
    );
    if (!newName) return;

    const newCity = window.prompt(
      "Nueva ciudad del cluster",
      selectedCluster.city
    );
    if (!newCity) return;

    try {
      setLoadingDetail(true);
      setError(null);

      const updated = await updateCluster(selectedCluster.id, {
        name: newName.trim(),
        city: newCity.trim(),
      });

      setSelectedCluster((prev) =>
        prev
          ? {
              ...prev,
              name: updated.name,
              city: updated.city,
            }
          : prev
      );

      await loadClusters();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error al actualizar el cluster");
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleSoftDeleteCluster() {
    if (!selectedCluster) return;

    const ok = window.confirm(
      `¿Seguro que quieres desactivar el cluster "${selectedCluster.name}"? 
Esto también desactivará sus colonias.`
    );
    if (!ok) return;

    try {
      setLoadingDetail(true);
      setError(null);

      await deleteCluster(selectedCluster.id);

      setSelectedCluster(null);
      setView("list");
      await loadClusters();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error al desactivar el cluster");
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleBackToList() {
    setView("list");
    setSelectedCluster(null);
    setError(null);
  }

  const handleChangePlanField = (
    key: keyof SellerPlans,
    field: keyof SellerPlanConfig,
    value: string | boolean
  ) => {
    setSellerPlansForm((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: field === "price" ? Number(value) || 0 : value,
      },
    }));
  };

  const handleSaveSellerPlans = async () => {
    if (!selectedCluster) return;
    try {
      setSavingPlans(true);
      await updateSellerPlans(selectedCluster.id, sellerPlansForm);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error al guardar planes de vendedor");
    } finally {
      setSavingPlans(false);
    }
  };

  useEffect(() => {
    loadClusters();
  }, []);

  return (
    <>
      {view === "list" ? (
        <>
          {/* Encabezado lista */}
          <section
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 500,
                }}
              >
                Clusters
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 13,
                  color: "#9b9b9b",
                }}
              >
                Administra los clusters donde agruparás colonias y vecinos.
              </p>
            </div>
            <button
              onClick={() => setOpenModal(true)}
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
              + Crear Cluster
            </button>
          </section>

          {/* Tabla de clusters */}
          <section
            style={{
              background: "rgba(5,5,5,0.9)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
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
                    background:
                      "linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0))",
                  }}
                >
                  <Th>Cluster</Th>
                  <Th>Ciudad</Th>
                  <Th>Colonias</Th>
                  <Th>Creado el</Th>
                  <Th
                    style={{
                      textAlign: "right",
                      paddingRight: 20,
                    }}
                  >
                    Opciones
                  </Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <Td colSpan={5}>Cargando...</Td>
                  </tr>
                ) : error ? (
                  <tr>
                    <Td colSpan={5}>{error}</Td>
                  </tr>
                ) : clusters.length === 0 ? (
                  <tr>
                    <Td colSpan={5}>No hay clusters aún.</Td>
                  </tr>
                ) : (
                  clusters.map((c) => (
                    <tr
                      key={c.id}
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <Td>{c.name}</Td>
                      <Td>{c.city}</Td>
                      <Td>{c.colonies}</Td>
                      <Td>
                        {c.createdAt ? c.createdAt.split("T")[0] : ""}
                      </Td>
                      <Td
                        style={{
                          textAlign: "right",
                          paddingRight: 20,
                        }}
                      >
                        <button
                          onClick={() => handleOpenDetail(c.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#f2d58b",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          Ver detalle
                        </button>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </>
      ) : (
        /* Vista de detalle */
        <section
          style={{
            background: "rgba(5,5,5,0.9)",
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.06)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
        >
          {/* Header del detalle con botones de acción */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 4,
            }}
          >
            <button
              onClick={handleBackToList}
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid rgba(216,178,90,0.6)",
                background: "transparent",
                color: "#f2d58b",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ← Volver a lista de clusters
            </button>

            {selectedCluster && (
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={handleEditCluster}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.25)",
                    background: "transparent",
                    color: "#e5e5e5",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Editar cluster
                </button>
                <button
                  onClick={handleSoftDeleteCluster}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,99,99,0.7)",
                    background: "rgba(120,0,0,0.18)",
                    color: "#ff9a9a",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  Desactivar cluster
                </button>
              </div>
            )}
          </div>

          {loadingDetail && <p>Cargando detalle...</p>}

          {error && !loadingDetail && (
            <p style={{ color: "#ff6b6b" }}>{error}</p>
          )}

          {selectedCluster && !loadingDetail && (
            <>
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 22,
                    fontWeight: 500,
                  }}
                >
                  {selectedCluster.name}
                </h2>
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: 13,
                    color: "#9b9b9b",
                  }}
                >
                  Cluster en {selectedCluster.city} ·{" "}
                  {selectedCluster.colonies} colonias
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                }}
              >
                <DetailCard label="Ciudad" value={selectedCluster.city} />
                <DetailCard
                  label="Colonias registradas"
                  value={String(selectedCluster.colonies)}
                />
                <DetailCard
                  label="Creado el"
                  value={
                    selectedCluster.createdAt
                      ? selectedCluster.createdAt.split("T")[0]
                      : "—"
                  }
                />
              </div>

              <div>
                <h3
                  style={{
                    margin: "10px 0 6px",
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                >
                  Descripción
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: "#c5c5c5",
                  }}
                >
                  {selectedCluster.description ||
                    "Aún no se ha definido una descripción para este cluster."}
                </p>
              </div>

              <div
                style={{
                  marginTop: 8,
                  padding: 14,
                  borderRadius: 12,
                  border: "1px dashed rgba(255,255,255,0.12)",
                  fontSize: 12,
                  color: "#9b9b9b",
                }}
              >
                <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 14 }}>
                  Colonias dentro de este cluster
                </h3>

                {loadingColonies && <p>Cargando colonias...</p>}

                {!loadingColonies && colonies.length === 0 && (
                  <p>No hay colonias registradas.</p>
                )}

                {!loadingColonies && colonies.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: 18, color: "#ddd" }}>
                    {colonies.map((col) => (
                      <li key={col.id}>
                        {col.name} {col.zipCode ? `(${col.zipCode})` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Planes de vendedor */}
              <div
                style={{
                  marginTop: 10,
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.09)",
                  background: "rgba(8,8,8,0.95)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 16,
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      Planes de vendedor
                    </h3>
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: 12,
                        color: "#b3b3b3",
                      }}
                    >
                      Configura cuánto pagará un vecino para poder publicar
                      productos en este cluster.
                    </p>
                  </div>

                  <button
                    onClick={handleSaveSellerPlans}
                    disabled={savingPlans}
                    style={{
                      padding: "7px 16px",
                      borderRadius: 999,
                      border: "none",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: savingPlans ? "default" : "pointer",
                      background: "linear-gradient(135deg, #f2d58b, #d8b25a)",
                      color: "#211a08",
                      boxShadow: "0 8px 18px rgba(0,0,0,0.6)",
                      opacity: savingPlans ? 0.7 : 1,
                    }}
                  >
                    {savingPlans ? "Guardando..." : "Guardar planes"}
                  </button>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 12,
                  }}
                >
                  {/* Plan 1 producto */}
                  <SellerPlanCard
                    title="Plan 1 producto"
                    subtitle="El vecino puede publicar 1 producto."
                    plan={sellerPlansForm.oneProduct}
                    onToggleEnabled={(v) =>
                      handleChangePlanField("oneProduct", "enabled", v)
                    }
                    onChangePrice={(v) =>
                      handleChangePlanField("oneProduct", "price", v)
                    }
                  />

                  {/* Plan 3 productos */}
                  <SellerPlanCard
                    title="Plan 3 productos"
                    subtitle="El vecino puede publicar 3 productos."
                    plan={sellerPlansForm.threeProducts}
                    onToggleEnabled={(v) =>
                      handleChangePlanField("threeProducts", "enabled", v)
                    }
                    onChangePrice={(v) =>
                      handleChangePlanField("threeProducts", "price", v)
                    }
                  />

                  {/* Plan 10 productos */}
                  <SellerPlanCard
                    title="Plan 10 productos"
                    subtitle="Ideal para vecinos con inventario pequeño."
                    plan={sellerPlansForm.tenProducts}
                    onToggleEnabled={(v) =>
                      handleChangePlanField("tenProducts", "enabled", v)
                    }
                    onChangePrice={(v) =>
                      handleChangePlanField("tenProducts", "price", v)
                    }
                  />

                  {/* Plan ilimitado */}
                  <SellerPlanCard
                    title="Plan ilimitado"
                    subtitle="Publicar productos sin límite."
                    plan={sellerPlansForm.fortyProducts}
                    onToggleEnabled={(v) =>
                      handleChangePlanField("fortyProducts", "enabled", v)
                    }
                    onChangePrice={(v) =>
                      handleChangePlanField("fortyProducts", "price", v)
                    }
                  />
                </div>
              </div>
            </>
          )}
        </section>
      )}

      <CreateClusterModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreate={async (data) => {
          await createCluster(data);
          await loadClusters();
          setOpenModal(false);
        }}
      />
    </>
  );
};

const Th: React.FC<
  React.PropsWithChildren<{ style?: React.CSSProperties }>
> = ({ children, style }) => (
  <th
    style={{
      textAlign: "left",
      padding: "10px 14px",
      fontWeight: 500,
      color: "#c8c8c8",
      borderBottom: "1px solid rgba(255,255,255,0.06)",
      ...style,
    }}
  >
    {children}
  </th>
);

const Td: React.FC<
  React.PropsWithChildren<{ style?: React.CSSProperties; colSpan?: number }>
> = ({ children, style, colSpan }) => (
  <td
    colSpan={colSpan}
    style={{
      padding: "9px 14px",
      color: "#e3e3e3",
      ...style,
    }}
  >
    {children}
  </td>
);

const DetailCard: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div
    style={{
      minWidth: 180,
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.06)",
      background: "rgba(10,10,10,0.9)",
    }}
  >
    <div
      style={{
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#9b9b9b",
        marginBottom: 3,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 14,
        color: "#f5f5f5",
      }}
    >
      {value}
    </div>
  </div>
);

const SellerPlanCard: React.FC<{
  title: string;
  subtitle: string;
  plan: SellerPlanConfig;
  onToggleEnabled: (v: boolean) => void;
  onChangePrice: (v: string) => void;
}> = ({ title, subtitle, plan, onToggleEnabled, onChangePrice }) => (
  <div
    style={{
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.08)",
      padding: 12,
      background:
        "radial-gradient(circle at top left, rgba(242,213,139,0.08), rgba(5,5,5,0.95))",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}
  >
    <div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: "#f5f5f5",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#b8b8b8",
          marginTop: 2,
        }}
      >
        {subtitle}
      </div>
    </div>

    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: "#d9d9d9",
        marginTop: 4,
      }}
    >
      <input
        type="checkbox"
        checked={!!plan.enabled}
        onChange={(e) => onToggleEnabled(e.target.checked)}
      />
      Plan habilitado
    </label>

    <div style={{ marginTop: 4 }}>
      <span
        style={{
          display: "block",
          fontSize: 11,
          color: "#b0b0b0",
          marginBottom: 3,
        }}
      >
        Precio (por mes)
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(8,8,8,0.9)",
          padding: "6px 10px",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 12,
            color: "#9f9f9f",
          }}
        >
          $
        </span>
        <input
          type="number"
          min={0}
          step="1"
          value={plan.price ?? 0}
          onChange={(e) => onChangePrice(e.target.value)}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            color: "#f5f5f5",
            fontSize: 13,
          }}
        />
      </div>
    </div>
  </div>
);

export default ClustersPage;