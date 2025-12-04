// src/pages/NeighborSignupPage.tsx
import React, { useEffect, useState } from "react";
import { signupNeighbor, type NeighborSignupRequest } from "../api";
import { fetchClusters, fetchColonies, type Colony, type ClusterSummary } from "../lib/coloniesApi";

const NeighborSignupPage: React.FC = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [zipCode, setZipCode] = useState("");

  const [clusters, setClusters] = useState<ClusterSummary[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string>("");
  const [colonies, setColonies] = useState<Colony[]>([]);
  const [selectedColonyId, setSelectedColonyId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [loadingColonies, setLoadingColonies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cargar clusters existentes (reutilizamos el API admin, por ahora es permitAll)
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchClusters();
        setClusters(data);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Error al cargar clusters");
      }
    };
    void load();
  }, []);

  // Cuando cambie el cluster, cargamos sus colonias
  useEffect(() => {
    if (!selectedClusterId) {
      setColonies([]);
      setSelectedColonyId("");
      return;
    }

    const loadColonies = async () => {
      setLoadingColonies(true);
      try {
        const list = await fetchColonies(selectedClusterId);
        setColonies(list);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Error al cargar colonias");
      } finally {
        setLoadingColonies(false);
      }
    };

    void loadColonies();
  }, [selectedClusterId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!selectedColonyId) {
      setError("Selecciona una colonia.");
      return;
    }

    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const payload: NeighborSignupRequest = {
      fullName: fullName.trim(),
      email: email.trim(),
      password,
      colonyId: selectedColonyId,
      clusterId: selectedClusterId,
      zipCode: zipCode.trim(),
    };

    try {
      setLoading(true);
      const resp = await signupNeighbor(payload);

      // Guardamos token y rol para que pueda entrar directo como vecino
      localStorage.setItem("lokaly_neighbor_token", resp.token);
      localStorage.setItem("lokaly_neighbor_role", resp.role);

      setSuccessMsg("Cuenta creada correctamente. ¡Bienvenido a Lokaly!");
      // aquí después puedes redirigir al app de vecino
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "Error al registrar la cuenta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at top, #1a1205, #050505 55%)",
        color: "#f5f5f5",
        padding: 24,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: "100%",
          maxWidth: 440,
          padding: 28,
          borderRadius: 18,
          background:
            "linear-gradient(145deg, rgba(18,18,18,0.98), rgba(5,5,5,0.98))",
          border: "1px solid rgba(242,213,139,0.25)",
          boxShadow: "0 26px 60px rgba(0,0,0,0.7)",
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            Crear cuenta en Lokaly
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 13,
              color: "#bcbcbc",
            }}
          >
            Regístrate como vecino para poder comprar (y después habilitarte como vendedor).
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: 12,
              padding: "9px 11px",
              borderRadius: 10,
              border: "1px solid rgba(255,99,99,0.55)",
              background: "rgba(120,0,0,0.22)",
              color: "#ffb3b3",
              fontSize: 12,
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              marginBottom: 12,
              padding: "9px 11px",
              borderRadius: 10,
              border: "1px solid rgba(116,214,161,0.55)",
              background: "rgba(0,120,60,0.25)",
              color: "#a9f5c5",
              fontSize: 12,
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Nombre */}
        <Label>Nombre completo</Label>
        <Input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          placeholder="Ej. Juan Pérez"
        />

        {/* Email */}
        <Label style={{ marginTop: 12 }}>Correo</Label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="tucorreo@ejemplo.com"
        />

        {/* Password */}
        <Label style={{ marginTop: 12 }}>Contraseña</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Label style={{ marginTop: 12 }}>Repite la contraseña</Label>
        <Input
          type="password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          required
        />

        {/* Cluster */}
        <Label style={{ marginTop: 14 }}>Cluster</Label>
        <select
          value={selectedClusterId}
          onChange={(e) => setSelectedClusterId(e.target.value)}
          required
          style={selectStyle}
        >
          <option value="">Selecciona un cluster…</option>
          {clusters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {c.city}
            </option>
          ))}
        </select>

        {/* Colonia */}
        <Label style={{ marginTop: 12 }}>Colonia</Label>
        <select
          value={selectedColonyId}
          onChange={(e) => setSelectedColonyId(e.target.value)}
          required
          disabled={!selectedClusterId || loadingColonies}
          style={selectStyle}
        >
          <option value="">
            {selectedClusterId
              ? loadingColonies
                ? "Cargando colonias…"
                : "Selecciona una colonia…"
              : "Selecciona primero un cluster"}
          </option>
          {colonies.map((col) => (
            <option key={col.id} value={col.id}>
              {col.name} {col.zipCode ? `(${col.zipCode})` : ""}
            </option>
          ))}
        </select>

        {/* CP */}
        <Label style={{ marginTop: 12 }}>Código postal</Label>
        <Input
          value={zipCode}
          onChange={(e) => setZipCode(e.target.value)}
          required
          placeholder="Ej. 37358"
        />

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 20,
            width: "100%",
            padding: "10px 16px",
            borderRadius: 999,
            border: "none",
            fontSize: 14,
            fontWeight: 500,
            cursor: loading ? "default" : "pointer",
            background: "linear-gradient(135deg, #f2d58b, #d8b25a)",
            color: "#211a08",
            boxShadow: "0 16px 36px rgba(0,0,0,0.7)",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
};

const Label: React.FC<
  React.PropsWithChildren<{ style?: React.CSSProperties }>
> = ({ children, style }) => (
  <label
    style={{
      display: "block",
      fontSize: 12,
      color: "#d0d0d0",
      marginBottom: 4,
      ...style,
    }}
  >
    {children}
  </label>
);

const Input: React.FC<
  React.InputHTMLAttributes<HTMLInputElement>
> = (props) => (
  <input
    {...props}
    style={{
      width: "100%",
      padding: "9px 12px",
      borderRadius: 999,
      border: "1px solid rgba(255,255,255,0.16)",
      background: "rgba(12,12,12,0.95)",
      color: "#f5f5f5",
      fontSize: 13,
      outline: "none",
    }}
  />
);

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(10,10,10,0.95)",
  color: "#f5f5f5",
  fontSize: 13,
  outline: "none",
  appearance: "none",
};

export default NeighborSignupPage;