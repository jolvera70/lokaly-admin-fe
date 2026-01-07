import React, { useEffect, useMemo, useState } from "react";

/**
 * Ajusta a tu backend:
 * - local:  http://localhost:8080/api/seller
 * - prod:   https://lokaly.site/api/seller
 */
const SELLER_BASE_URL = "https://lokaly.site/api/seller";

/**
 * URL pública del catálogo para compartir
 */
const PUBLIC_CATALOG_URL_PREFIX = "https://lokaly.site/catalog";

type SellerMe = {
  id: string;
  name: string;
  slug: string;
};

type StatsKpis = {
  orders: number;
  revenue: number; // MXN
  itemsSold?: number;
  views?: number;
  whatsappClicks?: number;
  conversion?: number; // 0..1 o porcentaje, depende BE
};

type DailyPoint = {
  date: string; // "2026-01-06"
  orders: number;
  revenue: number;
};

type TopProduct = {
  productId: string;
  name: string;
  orders: number;
  revenue: number;
};

type SellerStatsResponse = {
  kpis: StatsKpis;
  daily: DailyPoint[];
  topProducts: TopProduct[];
};

function getToken() {
  return localStorage.getItem("lokaly_admin_token") || "";
}

function authHeaders(extra?: Record<string, string>) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra ?? {}),
  };
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function formatMoneyMXN(n: number) {
  return `$${(n ?? 0).toLocaleString("es-MX")} MXN`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function SellerStatsPage() {
  const [me, setMe] = useState<SellerMe | null>(null);
  const [rangeDays, setRangeDays] = useState<7 | 14 | 30>(7);

  const [data, setData] = useState<SellerStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogUrl = useMemo(() => {
    if (!me?.slug) return null;
    return `${PUBLIC_CATALOG_URL_PREFIX}/${me.slug}`;
  }, [me?.slug]);

  async function loadAll(days: number) {
    try {
      setLoading(true);
      setError(null);

      // 1) Me
      const meRes = await fetch(`${SELLER_BASE_URL}/me`, {
        headers: authHeaders(),
      });

      if (!meRes.ok) {
        const body = await safeJson(meRes);
        throw new Error(body?.message || "No se pudo cargar tu perfil (me).");
      }

      const meRaw = await safeJson(meRes);

      const normalizedMe: SellerMe = {
        id: meRaw.id,
        name: meRaw.fullName ?? meRaw.name,
        slug: meRaw.slug,
      };
      setMe(normalizedMe);

      // 2) Stats
      // Ajusta si tu endpoint es distinto:
      // e.g. /stats?days=7  o /analytics?days=7
      const statsRes = await fetch(`${SELLER_BASE_URL}/stats?days=${days}`, {
        headers: authHeaders(),
      });

      if (!statsRes.ok) {
        const body = await safeJson(statsRes);
        throw new Error(body?.message || "No se pudieron cargar tus estadísticas.");
      }

      const raw = await safeJson(statsRes);

      // Normalización tolerante (por si tus campos se llaman diferente)
      const normalized: SellerStatsResponse = {
        kpis: {
          orders: Number(raw?.kpis?.orders ?? raw?.orders ?? 0),
          revenue: Number(raw?.kpis?.revenue ?? raw?.revenue ?? 0),
          itemsSold: raw?.kpis?.itemsSold ?? raw?.itemsSold,
          views: raw?.kpis?.views ?? raw?.views,
          whatsappClicks: raw?.kpis?.whatsappClicks ?? raw?.whatsappClicks,
          conversion: raw?.kpis?.conversion ?? raw?.conversion,
        },
        daily: Array.isArray(raw?.daily)
          ? raw.daily.map((d: any) => ({
              date: String(d.date ?? d.day ?? d.label ?? ""),
              orders: Number(d.orders ?? d.count ?? 0),
              revenue: Number(d.revenue ?? d.amount ?? 0),
            }))
          : [],
        topProducts: Array.isArray(raw?.topProducts)
          ? raw.topProducts.map((p: any) => ({
              productId: String(p.productId ?? p.id ?? ""),
              name: String(p.name ?? p.title ?? "Producto"),
              orders: Number(p.orders ?? p.count ?? 0),
              revenue: Number(p.revenue ?? p.amount ?? 0),
            }))
          : [],
      };

      setData(normalized);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error cargando estadísticas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(rangeDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays]);

  async function copyCatalogLink() {
    if (!catalogUrl) return;
    try {
      await navigator.clipboard.writeText(catalogUrl);
      alert("Link del catálogo copiado ✅");
    } catch {
      alert("No se pudo copiar. Copia manual: " + catalogUrl);
    }
  }

  const dailyMaxRevenue = useMemo(() => {
    const arr = data?.daily ?? [];
    return arr.reduce((max, p) => Math.max(max, p.revenue), 0);
  }, [data?.daily]);

  const dailyMaxOrders = useMemo(() => {
    const arr = data?.daily ?? [];
    return arr.reduce((max, p) => Math.max(max, p.orders), 0);
  }, [data?.daily]);

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: "6px 0 6px", fontSize: 22, fontWeight: 900 }}>
            Estadísticas
          </h2>
          <div style={{ color: "#6B7280", fontSize: 13 }}>
            Revisa ventas, ingresos y qué productos se mueven más.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <RangePill value={rangeDays} onChange={setRangeDays} />

          {catalogUrl && (
            <>
              <button onClick={() => window.open(catalogUrl, "_blank")} style={btnOutline}>
                Ver mi catálogo
              </button>
              <button onClick={copyCatalogLink} style={btnOutline}>
                Copiar link
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div style={alertError}>{error}</div>}

      {loading ? (
        <div style={{ marginTop: 14, color: "#6B7280" }}>Cargando…</div>
      ) : !data ? (
        <div style={{ marginTop: 14, color: "#6B7280" }}>Sin datos.</div>
      ) : (
        <>
          {/* KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            <KpiCard label="Órdenes" value={String(data.kpis.orders)} />
            <KpiCard label="Ingresos" value={formatMoneyMXN(data.kpis.revenue)} />
            <KpiCard
              label="Productos vendidos"
              value={data.kpis.itemsSold != null ? String(data.kpis.itemsSold) : "—"}
              hint="(si aplica)"
            />
            <KpiCard
              label="Clicks WhatsApp"
              value={data.kpis.whatsappClicks != null ? String(data.kpis.whatsappClicks) : "—"}
              hint="(si lo trackeas)"
            />
          </div>

          {/* Charts */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 12,
              marginTop: 12,
            }}
          >
            <div style={card}>
              <div style={cardTitle}>Ingresos por día</div>
              {(data.daily ?? []).length === 0 ? (
                <div style={empty}>Sin datos en este rango.</div>
              ) : (
                <BarList
                  items={data.daily.map((d) => ({
                    label: d.date,
                    value: d.revenue,
                    max: dailyMaxRevenue,
                    rightText: formatMoneyMXN(d.revenue),
                  }))}
                />
              )}
            </div>

            <div style={card}>
              <div style={cardTitle}>Órdenes por día</div>
              {(data.daily ?? []).length === 0 ? (
                <div style={empty}>Sin datos en este rango.</div>
              ) : (
                <BarList
                  items={data.daily.map((d) => ({
                    label: d.date,
                    value: d.orders,
                    max: dailyMaxOrders,
                    rightText: `${d.orders}`,
                  }))}
                />
              )}
            </div>
          </div>

          {/* Top products */}
          <div style={{ marginTop: 12 }}>
            <div style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={cardTitle}>Top productos</div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>
                    Los que más vendes en este rango.
                  </div>
                </div>
              </div>

              {data.topProducts.length === 0 ? (
                <div style={empty}>Aún no hay top productos.</div>
              ) : (
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {data.topProducts.map((p) => (
                    <div
                      key={p.productId || p.name}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: 10,
                        borderRadius: 12,
                        border: "1px solid #E5E7EB",
                        background: "#fff",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 12, color: "#6B7280" }}>
                          Órdenes: <strong>{p.orders}</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 900 }}>{formatMoneyMXN(p.revenue)}</div>
                        <button
                          style={btnOutlineSmall}
                          onClick={() => window.open(`/p/${p.productId}`, "_blank")}
                          disabled={!p.productId}
                        >
                          Ver público
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* =======================
   Small components
======================= */

function RangePill({
  value,
  onChange,
}: {
  value: 7 | 14 | 30;
  onChange: (v: 7 | 14 | 30) => void;
}) {
  const options: Array<7 | 14 | 30> = [7, 14, 30];

  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid #E5E7EB",
        borderRadius: 999,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {options.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          style={{
            padding: "8px 12px",
            border: "none",
            cursor: "pointer",
            fontWeight: 900,
            fontSize: 12,
            background: value === d ? "#111827" : "#fff",
            color: value === d ? "#fff" : "#111827",
          }}
        >
          {d} días
        </button>
      ))}
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 12, color: "#6B7280", fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 950, marginTop: 6 }}>{value}</div>
      {hint ? <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 2 }}>{hint}</div> : null}
    </div>
  );
}

function BarList({
  items,
}: {
  items: Array<{ label: string; value: number; max: number; rightText: string }>;
}) {
  return (
    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
      {items.map((it, idx) => {
        const pct = it.max > 0 ? clamp((it.value / it.max) * 100, 0, 100) : 0;

        return (
          <div
            key={`${it.label}-${idx}`}
            style={{
              display: "grid",
              gridTemplateColumns: "110px 1fr auto",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 12, color: "#6B7280", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {it.label}
            </div>
            <div
              style={{
                height: 10,
                borderRadius: 999,
                background: "#F3F4F6",
                overflow: "hidden",
                border: "1px solid #E5E7EB",
              }}
            >
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: "#111827",
                }}
              />
            </div>
            <div style={{ fontSize: 12, fontWeight: 900 }}>{it.rightText}</div>
          </div>
        );
      })}
    </div>
  );
}

/* =======================
   Styles
======================= */

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 16,
  padding: 12,
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const cardTitle: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 14,
};

const empty: React.CSSProperties = {
  marginTop: 10,
  color: "#6B7280",
  fontSize: 13,
};

const btnOutline: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid #E5E7EB",
  background: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const btnOutlineSmall: React.CSSProperties = {
  marginTop: 6,
  padding: "7px 10px",
  borderRadius: 999,
  border: "1px solid #E5E7EB",
  background: "#fff",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 12,
};

const alertError: React.CSSProperties = {
  marginTop: 12,
  padding: 10,
  borderRadius: 12,
  background: "#FEF2F2",
  border: "1px solid #FCA5A5",
  color: "#991B1B",
  fontWeight: 800,
};