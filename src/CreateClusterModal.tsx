// src/CreateClusterModal.tsx
import React, { useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (data: { name: string; city: string; description?: string }) => Promise<void>;
  onSuccess?: () => void;   // 👈 opcional
};

export const CreateClusterModal: React.FC<Props> = ({
  open,
  onClose,
  onCreate,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await onCreate({
        name: name.trim(),
        city: city.trim(),
        description: description.trim() || undefined,
      });

      onSuccess?.();       // 👈 solo si existe
      onClose();           // cerrar modal
      setName("");
      setCity("");
      setDescription("");
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Error al crear el cluster");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(5px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: "linear-gradient(145deg, #121212, #050505)",
          borderRadius: 18,
          padding: 28,
          width: "100%",
          maxWidth: 420,
          border: "1px solid rgba(216,178,90,0.35)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
          color: "#f5f5f5",
        }}
      >
        <h2
          style={{
            margin: 0,
            marginBottom: 18,
            color: "#f2d58b",
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          Crear Cluster
        </h2>

        {error && (
          <div
            style={{
              marginBottom: 14,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(248,113,113,0.6)",
              background: "rgba(248,113,113,0.08)",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        <label style={{ color: "#ddd", fontSize: 13 }}>Nombre *</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
          placeholder="Ej. Cluster Lombardía"
        />

        <label style={{ color: "#ddd", fontSize: 13, marginTop: 12 }}>
          Ciudad *
        </label>
        <input
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={inputStyle}
          placeholder="Ej. León"
        />

        <label style={{ color: "#ddd", fontSize: 13, marginTop: 12 }}>
          Descripción (opcional)
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            ...inputStyle,
            borderRadius: 14,
            minHeight: 80,
            resize: "none",
          }}
          placeholder="Agrupación de cluster Lombardía León Gto"
        />

        <div
          style={{
            display: "flex",
            marginTop: 22,
            justifyContent: "flex-end",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "9px 16px",
              background: "transparent",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#ccc",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "9px 18px",
              borderRadius: 999,
              border: "none",
              fontSize: 13,
              cursor: "pointer",
              background: "linear-gradient(135deg, #f2d58b, #d8b25a)",
              color: "#211a08",
              boxShadow: "0 10px 24px rgba(0,0,0,0.6)",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Creando..." : "Crear"}
          </button>
        </div>
      </form>
    </div>
  );
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(8,8,8,0.9)",
  color: "#f5f5f5",
  marginTop: 5,
  outline: "none",
};