// src/EditColonyModal.tsx
import React, { useEffect, useState } from "react";
import type { Colony } from "./lib/coloniesApi";

type Props = {
  open: boolean;
  onClose: () => void;
  colony: Colony | null;
  onSave: (body: {
    name: string;
    city: string;
    state: string;
    zipCode?: string;
    notes?: string;
  }) => Promise<void>;
  onSuccess: () => void;
};

export const EditColonyModal: React.FC<Props> = ({
  open,
  onClose,
  colony,
  onSave,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!colony) return;
    setName(colony.name ?? "");
    setCity(colony.city ?? "");
    setState(colony.state ?? "");
    setZipCode(colony.zipCode ?? "");
    setNotes(colony.notes ?? "");
  }, [colony]);

  if (!open || !colony) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      await onSave({
        name: name.trim(),
        city: city.trim(),
        state: state.trim(),
        zipCode: zipCode.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Error al actualizar colonia");
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
          maxWidth: 480,
          border: "1px solid rgba(216,178,90,0.35)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
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
          Editar colonia
        </h2>

        {error && (
          <div
            style={{
              marginBottom: 14,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,99,99,0.45)",
              background: "rgba(255,99,99,0.12)",
              color: "#ffb3b3",
              fontSize: 12,
              whiteSpace: "pre-wrap",
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
        />

        <label style={{ color: "#ddd", fontSize: 13, marginTop: 12 }}>
          Ciudad *
        </label>
        <input
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
          style={inputStyle}
        />

        <label style={{ color: "#ddd", fontSize: 13, marginTop: 12 }}>
          Estado *
        </label>
        <input
          required
          value={state}
          onChange={(e) => setState(e.target.value)}
          style={inputStyle}
        />

        <label style={{ color: "#ddd", fontSize: 13, marginTop: 12 }}>
          Código Postal
        </label>
        <input
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          style={inputStyle}
        />

        <label style={{ color: "#ddd", fontSize: 13, marginTop: 12 }}>
          Notas
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{
            ...inputStyle,
            borderRadius: 16,
            resize: "none",
          }}
          placeholder="Comentarios internos, referencias, etc."
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
            {loading ? "Guardando..." : "Guardar cambios"}
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