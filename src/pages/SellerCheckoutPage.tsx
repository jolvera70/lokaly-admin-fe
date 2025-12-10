// src/pages/SellerCheckoutPage.tsx
import React, { useState } from "react";
import {
  createSellerCheckout,
  fakeCompleteCheckout,
  type PlanKey,          // 👈 importamos el type real
} from "../api";

// Reutilizamos el tipo del api
type SellerPlanKey = PlanKey;

type SellerPlanOrder = {
  id: string;
  userId?: string;
  planKey: SellerPlanKey;
  status: string; // "PENDING" | "PAID" | etc
  paymentId?: string;
  createdAt?: string;
};

const SellerCheckoutPage: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<SellerPlanKey>("ONE_PRODUCT");
  const [order, setOrder] = useState<SellerPlanOrder | null>(null);
  const [creating, setCreating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const neighborToken = localStorage.getItem("neighbor_token");

  const handleCreateCheckout = async () => {
    if (!neighborToken) {
      setError("Debes iniciar sesión como vecino para comprar un plan.");
      return;
    }

    if (!selectedPlan) {
      setError("Primero elige un plan de vendedor.");
      return;
    }

    try {
      setError(null);
      setCreating(true);
      // 👇 ya no necesitamos cast, SellerPlanKey === PlanKey
      const newOrder = await createSellerCheckout(selectedPlan);
      setOrder(newOrder);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error al iniciar la compra");
    } finally {
      setCreating(false);
    }
  };

  const handleFakeComplete = async () => {
    if (!order) return;
    try {
      setError(null);
      setCompleting(true);
      const updated = await fakeCompleteCheckout(order.id);
      setOrder(updated);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error al completar la compra");
    } finally {
      setCompleting(false);
    }
  };

  // Si no hay token, mostramos mensaje sencillo
  if (!neighborToken) {
    return (
      <div
        style={{
          maxWidth: 480,
          margin: "40px auto",
          padding: 20,
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(10,10,10,0.95)",
        }}
      >
        <h2
          style={{
            marginTop: 0,
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          Hazte vendedor
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "#c3c3c3",
          }}
        >
          Para comprar un plan de vendedor necesitas iniciar sesión como vecino.
        </p>
        <p
          style={{
            fontSize: 12,
            color: "#9b9b9b",
            marginTop: 10,
          }}
        >
          Ve a la pantalla de registro / login de vecinos, inicia sesión, y
          vuelve a esta página.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "24px auto",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <header>
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 600,
          }}
        >
          Activa tu portal de vendedor
        </h1>
        <p
          style={{
            marginTop: 4,
            fontSize: 13,
            color: "#9b9b9b",
          }}
        >
          Elige un plan para poder publicar productos y vender a tus vecinos.
        </p>
      </header>

      {/* Tarjeta planes */}
      <section
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(5,5,5,0.95)",
          padding: 18,
          boxShadow: "0 16px 40px rgba(0,0,0,0.65)",
        }}
      >
        <h2
          style={{
            margin: 0,
            marginBottom: 10,
            fontSize: 16,
            fontWeight: 500,
          }}
        >
          Elige tu plan
        </h2>
        <p
          style={{
            margin: 0,
            marginBottom: 14,
            fontSize: 12,
            color: "#b3b3b3",
          }}
        >
          Los precios reales vienen del administrador de tu cluster. Aquí sólo
          eliges el tipo de plan que quieres comprar.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
          }}
        >
          <PlanCard
            selected={selectedPlan === "ONE_PRODUCT"}
            onClick={() => setSelectedPlan("ONE_PRODUCT")}
            title="Plan 1 producto"
            description="Publica 1 producto a la vez. Ideal si solo quieres vender algo específico."
            badge="Básico"
          />

          <PlanCard
            selected={selectedPlan === "THREE_PRODUCTS"}
            onClick={() => setSelectedPlan("THREE_PRODUCTS")}
            title="Plan 3 productos"
            description="Hasta 3 productos publicados simultáneamente."
            badge="Casual"
          />

          <PlanCard
            selected={selectedPlan === "TEN_PRODUCTS"}
            onClick={() => setSelectedPlan("TEN_PRODUCTS")}
            title="Plan 10 productos"
            description="Hasta 10 productos publicados simultáneamente."
            badge="Emprendedor"
          />

          <PlanCard
            selected={selectedPlan === "FORTY_PRODUCTS"}
            onClick={() => setSelectedPlan("FORTY_PRODUCTS")}
            title="Plan ilimitado"
            description="Publica todos los productos que quieras durante el periodo del plan."
            badge="Ilimitado"
          />
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={handleCreateCheckout}
            disabled={creating}
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              border: "none",
              fontSize: 13,
              fontWeight: 500,
              cursor: creating ? "default" : "pointer",
              background:
                "linear-gradient(135deg, #f2d58b, #d8b25a)",
              color: "#211a08",
              boxShadow: "0 10px 24px rgba(0,0,0,0.6)",
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? "Creando orden..." : "Continuar con la compra"}
          </button>
        </div>
      </section>

      {/* Resultado de checkout */}
      {order && (
        <section
          style={{
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(5,5,5,0.95)",
            padding: 18,
            boxShadow: "0 16px 40px rgba(0,0,0,0.65)",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 500,
            }}
          >
            Orden creada
          </h2>
          <p
            style={{
              margin: "4px 0 10px",
              fontSize: 12,
              color: "#b3b3b3",
            }}
          >
            ID de la orden:{" "}
            <span style={{ color: "#f2d58b" }}>{order.id}</span>
          </p>

          <p
            style={{
              margin: 0,
              fontSize: 13,
              color:
                order.status === "PAID" ? "#8ee28e" : "#e8e8e8",
            }}
          >
            Estado actual:{" "}
            <strong>{order.status}</strong>
            {order.status === "PAID" &&
              " · Ya tienes el plan activo como vendedor."}
          </p>

          {order.status !== "PAID" && (
            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <button
                onClick={handleFakeComplete}
                disabled={completing}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: completing ? "default" : "pointer",
                  background:
                    "linear-gradient(135deg, #8de98d, #4fbf4f)",
                  color: "#031403",
                  boxShadow: "0 8px 18px rgba(0,0,0,0.6)",
                  opacity: completing ? 0.7 : 1,
                }}
              >
                {completing
                  ? "Confirmando pago..."
                  : "Simular pago completado"}
              </button>

              <span
                style={{
                  fontSize: 11,
                  color: "#9b9b9b",
                }}
              >
                (Solo para pruebas, sin pasarela real)
              </span>
            </div>
          )}
        </section>
      )}

      {error && (
        <div
          style={{
            marginTop: 4,
            padding: "8px 10px",
            borderRadius: 10,
            border: "1px solid rgba(255,99,99,0.45)",
            background: "rgba(255,99,99,0.12)",
            color: "#ffb3b3",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

const PlanCard: React.FC<{
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
  badge?: string;
}> = ({ selected, onClick, title, description, badge }) => (
  <button
    type="button"
    onClick={onClick}
    style={{
      textAlign: "left",
      borderRadius: 14,
      padding: 14,
      border: selected
        ? "1px solid rgba(242,213,139,0.85)"
        : "1px solid rgba(255,255,255,0.08)",
      background: selected
        ? "radial-gradient(circle at top left, rgba(242,213,139,0.18), rgba(5,5,5,0.98))"
        : "radial-gradient(circle at top left, rgba(242,213,139,0.06), rgba(5,5,5,0.98))",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      boxShadow: selected
        ? "0 12px 32px rgba(0,0,0,0.7)"
        : "0 8px 20px rgba(0,0,0,0.5)",
      transition: "transform 0.15s ease, box-shadow 0.18s ease, border 0.18s ease",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "#f5f5f5",
        }}
      >
        {title}
      </span>
      {badge && (
        <span
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "3px 8px",
            borderRadius: 999,
            border: "1px solid rgba(242,213,139,0.7)",
            color: "#f2d58b",
          }}
        >
          {badge}
        </span>
      )}
    </div>
    <p
      style={{
        margin: 0,
        fontSize: 12,
        color: "#c3c3c3",
      }}
    >
      {description}
    </p>
  </button>
);

export default SellerCheckoutPage;