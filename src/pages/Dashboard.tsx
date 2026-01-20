// src/pages/Dashboard.tsx
import React, { useCallback, useMemo, useState } from "react";

type CatalogStatsResponse = {
  catalogViews: number;
  uniqueVisitors: number;
  productViews: number;
  productClicks: number;
  whatsappClicks: number;
  orderIntent: number;
  orderSubmitOk: number;
  // si luego agregas más en BE, se extiende aquí
};

function pct(n: number, d: number) {
  if (!d || d <= 0) return 0;
  return Math.round((n / Math.max(1, d)) * 100);
}

function KpiCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background:
          "radial-gradient(circle at top left, rgba(255,255,255,0.08), rgba(0,0,0,0.9))",
      }}
    >
      <div style={{ fontSize: 11, color: "#a3a3a3", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#f2d58b" }}>{value}</div>
      {sub ? <div style={{ marginTop: 6, fontSize: 11, color: "#8a8a8a" }}>{sub}</div> : null}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(8,8,8,0.95)",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 650, color: "#f5f5f5", marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const [catalogId, setCatalogId] = useState("");
  const [days, setDays] = useState(7);

  const [stats, setStats] = useState<CatalogStatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id = catalogId.trim();
    if (!id) {
      setErr("Escribe un catalogId para consultar estadísticas.");
      setStats(null);
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/public/v1/stats/catalog/${encodeURIComponent(id)}/summary?days=${days}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const msg =
          res.status === 401
            ? "Tu sesión expiró."
            : res.status === 404
            ? "No se encontró ese catálogo."
            : "No se pudieron cargar estadísticas.";
        throw new Error(msg);
      }

      const j = (await res.json()) as CatalogStatsResponse;
      setStats(j);
    } catch (e: any) {
      setErr(e?.message || "No se pudieron cargar estadísticas.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [catalogId, days]);

  const funnel = useMemo(() => {
    if (!stats) return null;
    const c2p = pct(stats.productClicks, stats.catalogViews);
    const p2i = pct(stats.orderIntent, stats.productViews);
    const i2o = pct(stats.orderSubmitOk, stats.orderIntent);
    const c2o = pct(stats.orderSubmitOk, stats.catalogViews);
    return { c2p, p2i, i2o, c2o };
  }, [stats]);

  return (
    <div>
      <section style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 650, color: "#f5f5f5" }}>
          Dashboard · Uso (Tracción)
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9b9b9b" }}>
          Embudo comprador (por catálogo) usando track_events.
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
          gap: 14,
        }}
      >
        {/* Controles */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={catalogId}
            onChange={(e) => setCatalogId(e.target.value)}
            placeholder="catalogId (ej: mi-catalogo-ed8x5qf o ObjectId)"
            style={{
              flex: 1,
              minWidth: 260,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              outline: "none",
            }}
          />

          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              outline: "none",
              cursor: "pointer",
            }}
          >
            <option value={1}>Hoy</option>
            <option value={7}>7 días</option>
            <option value={14}>14 días</option>
            <option value={30}>30 días</option>
          </select>

          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(242,213,139,0.35)",
              background: loading ? "rgba(255,255,255,0.08)" : "rgba(242,213,139,0.12)",
              color: "#f2d58b",
              fontWeight: 750,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Cargando..." : "Consultar"}
          </button>
        </div>

        {err ? (
          <div style={{ fontSize: 13, color: "#ff6b6b", fontWeight: 650 }}>{err}</div>
        ) : null}

        {!stats ? (
          <div style={{ fontSize: 13, color: "#bdbdbd" }}>
            Ingresa un <b>catalogId</b> y presiona <b>Consultar</b>.
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              <KpiCard label="👥 Visitantes únicos" value={stats.uniqueVisitors ?? 0} sub={`${days} días`} />
              <KpiCard label="📖 Vistas de catálogo" value={stats.catalogViews ?? 0} sub={`${days} días`} />
              <KpiCard label="🖱️ Clicks a producto" value={stats.productClicks ?? 0} sub={`${days} días`} />
              <KpiCard label="🧾 Pedidos enviados (OK)" value={stats.orderSubmitOk ?? 0} sub={`${days} días`} />
            </div>

            {/* Embudo comprador */}
            <Panel title="Embudo comprador">
              <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#e3e3e3" }}>
                <div>1) Vistas catálogo: <b style={{ color: "#f2d58b" }}>{stats.catalogViews ?? 0}</b></div>
                <div>2) Click producto: <b style={{ color: "#f2d58b" }}>{stats.productClicks ?? 0}</b> ({funnel?.c2p ?? 0}%)</div>
                <div>3) Intento compra (form): <b style={{ color: "#f2d58b" }}>{stats.orderIntent ?? 0}</b> (Producto→Intento {funnel?.p2i ?? 0}%)</div>
                <div>4) Pedido enviado OK: <b style={{ color: "#f2d58b" }}>{stats.orderSubmitOk ?? 0}</b> (Intento→OK {funnel?.i2o ?? 0}%)</div>
                <div>5) Click WhatsApp: <b style={{ color: "#f2d58b" }}>{stats.whatsappClicks ?? 0}</b></div>

                <div style={{ marginTop: 8, fontSize: 12, color: "#9b9b9b" }}>
                  Conversión total (Catálogo→Pedido OK): <b style={{ color: "#f2d58b" }}>{funnel?.c2o ?? 0}%</b>
                </div>
              </div>
            </Panel>
          </>
        )}
      </section>
    </div>
  );
}