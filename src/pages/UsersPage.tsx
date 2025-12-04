// src/pages/UsersPage.tsx
import React, { useEffect, useState } from "react";
import { fetchUsers, setUserSeller, type UserSummary } from "../api";

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<"list" | "detail">("list");
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<
    "ONE_PRODUCT" | "TEN_PRODUCTS" | "UNLIMITED"
  >("ONE_PRODUCT");
  const [saving, setSaving] = useState(false);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const openDetail = (u: UserSummary) => {
    setSelectedUser(u);
    setSelectedPlan(
      (u.sellerPlanKey as any) || "ONE_PRODUCT"
    );
    setView("detail");
  };

  const backToList = () => {
    setView("list");
    setSelectedUser(null);
    setError(null);
  };

  const handleSaveSeller = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await setUserSeller(selectedUser.id, true, selectedPlan);

      // refrescamos lista y estado local
      await loadUsers();
      setSelectedUser((prev) =>
        prev
          ? { ...prev, seller: true, sellerPlanKey: selectedPlan }
          : prev
      );
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error al activar vendedor");
    } finally {
      setSaving(false);
    }
  };

  if (view === "list") {
    return (
      <>
        <section
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 500 }}>
              Usuarios
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "#9b9b9b",
              }}
            >
              Vecinos registrados en el sistema.
            </p>
          </div>
        </section>

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
                <Th>Nombre</Th>
                <Th>Correo</Th>
                <Th>Colonia</Th>
                <Th>Rol</Th>
                <Th>Vendedor</Th>
                <Th style={{ textAlign: "right", paddingRight: 20 }}>
                  Opciones
                </Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <Td colSpan={6}>Cargando...</Td>
                </tr>
              ) : error ? (
                <tr>
                  <Td colSpan={6}>{error}</Td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <Td colSpan={6}>No hay usuarios registrados.</Td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    style={{
                      borderTop: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Td>{u.fullName || "—"}</Td>
                    <Td>{u.email}</Td>
                    <Td>{u.colonyName || u.colonyId || "—"}</Td>
                    <Td>{u.role}</Td>
                    <Td>{u.seller ? "Sí" : "No"}</Td>
                    <Td
                      style={{
                        textAlign: "right",
                        paddingRight: 20,
                      }}
                    >
                      <button
                        onClick={() => openDetail(u)}
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
    );
  }

  // ---- Vista detalle ----
  return (
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
      <button
        onClick={backToList}
        style={{
          alignSelf: "flex-start",
          padding: "6px 12px",
          borderRadius: 999,
          border: "1px solid rgba(216,178,90,0.6)",
          background: "transparent",
          color: "#f2d58b",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        ← Volver a lista de usuarios
      </button>

      {selectedUser && (
        <>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>
              {selectedUser.fullName || selectedUser.email}
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "#9b9b9b",
              }}
            >
              {selectedUser.email} · {selectedUser.role} ·{" "}
              {selectedUser.colonyName || selectedUser.colonyId || "Sin colonia"}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <DetailCard label="Rol" value={selectedUser.role} />
            <DetailCard
              label="Vendedor"
              value={selectedUser.seller ? "Sí" : "No"}
            />
            <DetailCard
              label="Plan actual"
              value={selectedUser.sellerPlanKey || "Ninguno"}
            />
          </div>

          <div
            style={{
              marginTop: 8,
              padding: 14,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.09)",
              background: "rgba(8,8,8,0.95)",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 500,
              }}
            >
{selectedUser.seller && (
  <button
    onClick={async () => {
      const ok = window.confirm(
        "¿Seguro que quieres desactivar a este usuario como vendedor?"
      );
      if (!ok) return;
      try {
        setSaving(true);
        await setUserSeller(selectedUser.id, false); // 🚨 seller=false
        await loadUsers();
        setSelectedUser((prev) =>
          prev ? { ...prev, seller: false, sellerPlanKey: null } : prev
        );
      } catch (e: any) {
        setError(e.message);
      } finally {
        setSaving(false);
      }
    }}
    style={{
      marginBottom: 12,
      padding: "6px 14px",
      borderRadius: 999,
      border: "1px solid rgba(255,99,99,0.7)",
      background: "rgba(120,0,0,0.18)",
      color: "#ff9a9a",
      fontSize: 12,
      cursor: "pointer",
    }}
  >
    Quitar vendedor
  </button>
)}                
              Activar / cambiar plan de vendedor
            </h3>
            <p
              style={{
                margin: "4px 0 10px",
                fontSize: 12,
                color: "#b3b3b3",
              }}
            >
              Selecciona el plan que se le asignará a este vecino.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <select
                value={selectedPlan}
                onChange={(e) =>
                  setSelectedPlan(
                    e.target.value as
                      | "ONE_PRODUCT"
                      | "TEN_PRODUCTS"
                      | "UNLIMITED"
                  )
                }
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(8,8,8,0.9)",
                  color: "#f5f5f5",
                  fontSize: 13,
                }}
              >
                <option value="ONE_PRODUCT">Plan 1 producto</option>
                <option value="TEN_PRODUCTS">Plan 10 productos</option>
                <option value="UNLIMITED">Plan ilimitado</option>
              </select>

              <button
                onClick={handleSaveSeller}
                disabled={saving}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: saving ? "default" : "pointer",
                  background:
                    "linear-gradient(135deg, #f2d58b, #d8b25a)",
                  color: "#211a08",
                  boxShadow: "0 8px 18px rgba(0,0,0,0.6)",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Guardando..." : "Guardar plan"}
              </button>
            </div>
          </div>
        </>
      )}

      {error && (
        <p style={{ color: "#ff6b6b", fontSize: 13 }}>{error}</p>
      )}
    </section>
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

export default UsersPage;