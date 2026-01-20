// src/pages/publicar/MyProductsPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../LandingPage.css";
import logoMark from "../../assets/brand/lokaly-mark.svg";

import { usePublishGuard } from "../../hooks/usePublishGuard";
import {
  deleteCatalogProduct,
  listMyCatalogProducts,
  setCatalogProductPaused,
  type CatalogProductDto,
  getMyPublisherCatalog,
} from "../../api";

const TOS_VERSION = "2026-01-20";

async function getSellerConsent(): Promise<{ accepted: boolean; version?: string | null }> {
  const res = await fetch("/api/public/v1/legal/seller/consent", { credentials: "include" });
  if (!res.ok) {
    // si falla, por seguridad NO bloquees (o sí, según tu preferencia)
    return { accepted: true };
  }
  return (await res.json()) as any;
}

async function acceptSellerConsent(): Promise<void> {
  const res = await fetch("/api/public/v1/legal/seller/consent", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version: TOS_VERSION }),
  });
  if (!res.ok) throw new Error("No se pudo guardar tu aceptación.");
}
/* ================== TIPOS ================== */

type StatsSummary = {
  catalogViews: number;
  uniqueVisitors: number;
  productViews: number;
  productClicks: number;
  whatsappClicks: number;
  orderIntent: number;
  orderSubmitOk: number;
};

type CatalogImageDto = {
  originalUrl: string;
  mediumUrl: string;
  thumbUrl: string;
};

type TabKey = "products" | "orders" | "stats";

type OrderStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "DELIVERED";

type PublishOrderDto = {
  id: string;
  productTitle: string;
  quantity: number;
  unitPrice?: number | string;
  totalPrice?: number | string;
  status: OrderStatus;
  createdAt?: string;
  buyerName?: string | null;
  buyerPhone?: string | null;
  note?: string | null;
};

/* ================== HELPERS ================== */

function pctColor(pct: number) {
  if (pct >= 60) return "#16A34A"; // verde
  if (pct >= 30) return "#F59E0B"; // ámbar
  return "#DC2626";               // rojo
}

function resolveImageUrl(rawUrl?: string | null): string {
  if (!rawUrl) return "";
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

  const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  if (path.startsWith("/api/")) return path;

  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const origin = isLocal ? "https://lokaly.site" : window.location.origin;
  return `${origin}${path}`;
}

type AlertTone = "good" | "warn" | "bad";

function pct(n: number, d: number) {
  if (!d || d <= 0) return 0;
  return Math.round((n / Math.max(1, d)) * 100);
}

function toneColors(tone: AlertTone) {
  if (tone === "bad") return { bg: "rgba(220,38,38,0.06)", bd: "rgba(220,38,38,0.18)", fg: "rgba(127,29,29,0.95)" };
  if (tone === "warn") return { bg: "rgba(245,158,11,0.12)", bd: "rgba(245,158,11,0.22)", fg: "rgba(146,64,14,0.95)" };
  return { bg: "rgba(34,197,94,0.10)", bd: "rgba(34,197,94,0.20)", fg: "rgba(21,128,61,0.95)" };
}

function buildActionableAlerts(
  stats: any | null,
  items: CatalogProductDto[]
): Array<{ tone: AlertTone; title: string; body: string; action?: string }> {
  if (!stats) return [];

  const catalogViews = Number(stats.catalogViews ?? 0);
  const productClicks = Number(stats.productClicks ?? 0);
  const orderIntent = Number(stats.orderIntent ?? 0);
  const orderSubmitOk = Number(stats.orderSubmitOk ?? 0);

  const ctr = pct(productClicks, catalogViews);           // Catalog -> Product
  const i2o = pct(orderSubmitOk, orderIntent);            // Intent -> Order OK

  const alerts: Array<{ tone: AlertTone; title: string; body: string; action?: string }> = [];

  // 🔴 Mucho interés, pocas compras
  const enoughTraffic = catalogViews >= 10;
  const manyClicks = productClicks >= 6 || ctr >= 40;
  const lowOrders = orderSubmitOk === 0 || i2o < 20;

  if (enoughTraffic && manyClicks && lowOrders) {
    alerts.push({
      tone: "bad",
      title: "Mucho interés, pocas compras",
      body: `Tus productos están recibiendo clics (Catálogo→Producto ${ctr}%), pero casi no se convierten en pedidos (Intento→Pedido ${i2o}%).`,
      action: "Revisa precio, foto principal y descripción. Asegúrate de stock y tiempos de entrega claros.",
    });
  }

  // 🟡 Muchas vistas, pocos clics
  if (catalogViews >= 20 && ctr < 15) {
    alerts.push({
      tone: "warn",
      title: "Mucha gente ve tu catálogo, pero pocos entran a productos",
      body: `De ${catalogViews} visitas al catálogo, solo ${ctr}% hace clic en un producto.`,
      action: "Mejora la portada de tus productos: foto más clara, título corto y 1–3 productos destacados al inicio.",
    });
  }

  // 🟢 Buen rendimiento
  if (catalogViews >= 10 && ctr >= 25 && i2o >= 30) {
    alerts.push({
      tone: "good",
      title: "Buen rendimiento",
      body: `Vas bien: Catálogo→Producto ${ctr}% · Intento→Pedido ${i2o}%.`,
      action: "Mantén stock, responde rápido por WhatsApp y replica el estilo de tus productos más vistos.",
    });
  }

  // 🟡 Stock sugerido (si existe availableQuantity)
  const activeItems = items.filter((p) => !Boolean((p as any).paused));
  const zeroStock = activeItems.filter((p) => Number((p as any).availableQuantity ?? 0) === 0);

  if (zeroStock.length > 0) {
    alerts.push({
      tone: "warn",
      title: "Productos activos sin stock",
      body: `${zeroStock.length} producto(s) siguen activos con stock 0.`,
      action: "Páusalos para evitar pedidos que no puedas cumplir.",
    });
  }

  // Si hay muy poco tráfico, damos un tip neutral (opcional)
  if (alerts.length === 0 && catalogViews < 10) {
    alerts.push({
      tone: "warn",
      title: "Aún hay pocos datos",
      body: "Cuando tengas más visitas, aquí verás recomendaciones automáticas sobre qué mejorar.",
      action: "Comparte tu link del catálogo en WhatsApp para generar tráfico.",
    });
  }

  // Limita a 3 para que no se vea saturado
  return alerts.slice(0, 3);
}

function AlertsPanel({
  alerts,
}: {
  alerts: Array<{ tone: "good" | "warn" | "bad"; title: string; body: string; action?: string }>;
}) {
  if (!alerts.length) return null;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {alerts.map((a, idx) => {
        const c = toneColors(a.tone);
        const icon = a.tone === "bad" ? "🔴" : a.tone === "warn" ? "🟡" : "🟢";

        return (
          <div
            key={idx}
            style={{
              padding: 12,
              borderRadius: 16,
              background: c.bg,
              border: `1px solid ${c.bd}`,
              color: c.fg,
            }}
          >
            <div style={{ fontWeight: 950, marginBottom: 4 }}>
              {icon} {a.title}
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.45, color: "rgba(15,23,42,0.75)" }}>
              {a.body}
            </div>
            {a.action ? (
              <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 900, color: "rgba(15,23,42,0.82)" }}>
                👉 {a.action}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function firstImageThumb(p: { imageUrls?: CatalogImageDto[] | null }) {
  const img = p.imageUrls?.[0];
  return resolveImageUrl(img?.thumbUrl || img?.mediumUrl || img?.originalUrl);
}

function moneyLabel(price: any) {
  if (price === null || price === undefined || price === "") return "";
  const n = Number(price);
  if (Number.isFinite(n)) return `$${n.toLocaleString("es-MX")}`;
  return `$${String(price)}`;
}

function moneyMaybe(v: any) {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "$0";
  return `$${n.toLocaleString("es-MX")}`;
}

function formatDateLite(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function cleanPhone(phone?: string | null) {
  return (phone || "").replace(/[^\d]/g, "");
}

function openWhatsApp(phone?: string | null, message?: string) {
  const p = cleanPhone(phone);
  if (!p) {
    alert("El comprador no tiene WhatsApp");
    return;
  }
  window.open(
    `https://wa.me/${p}?text=${encodeURIComponent(message || "")}`,
    "_blank",
    "noopener,noreferrer"
  );
}

/* ================== UI PIECES ================== */
function StatCard(props: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(15,23,42,0.10)",
        background: "#fff",
        boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.55)" }}>
        {props.label}
      </div>
      <div style={{ marginTop: 6, fontSize: 26, fontWeight: 950, color: "rgba(15,23,42,0.88)" }}>
        {props.value}
      </div>
      {props.sub ? (
        <div
          style={{
            marginTop: 6,
            fontSize: 12.5,
            fontWeight: 750,
            color: "rgba(15,23,42,0.62)",
            lineHeight: 1.35,
          }}
        >
          {props.sub}
        </div>
      ) : null}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(15,23,42,0.08)",
        background: "#fff",
        padding: 12,
        boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 12 }}>
        <div style={{ width: 92, height: 92, borderRadius: 14, background: "rgba(15,23,42,0.06)" }} />
        <div>
          <div style={{ height: 14, width: "62%", borderRadius: 999, background: "rgba(15,23,42,0.06)" }} />
          <div style={{ marginTop: 10, height: 12, width: "85%", borderRadius: 999, background: "rgba(15,23,42,0.05)" }} />
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ height: 30, width: 110, borderRadius: 999, background: "rgba(15,23,42,0.06)" }} />
            <div style={{ height: 30, width: 90, borderRadius: 999, background: "rgba(15,23,42,0.06)" }} />
            <div style={{ height: 30, width: 100, borderRadius: 999, background: "rgba(15,23,42,0.06)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
export default function MyProductsPage() {
  const navigate = useNavigate();
  const { loading, ok } = usePublishGuard({ redirectTo: "/publicar" });

  const [tab, setTab] = useState<TabKey>("products");

  // ===== productos =====
  const [items, setItems] = useState<CatalogProductDto[]>([]);
  const [fetching, setFetching] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // ===== créditos =====
  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState<boolean>(true);

  // ===== pedidos =====
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("PENDING");
  const [orders, setOrders] = useState<PublishOrderDto[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersErr, setOrdersErr] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const [tosAccepted, setTosAccepted] = useState<boolean>(true);
  const [tosLoading, setTosLoading] = useState<boolean>(true);
  const [tosOpen, setTosOpen] = useState<boolean>(false);
  const [tosChecked, setTosChecked] = useState<boolean>(false);
  const [tosBusy, setTosBusy] = useState<boolean>(false);
  const [tosErr, setTosErr] = useState<string | null>(null);

  // Si luego quieres cargar slug real, aquí
  const catalogSlug: string | null = null;

  // ===== stats =====
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [statsDays, setStatsDays] = useState<number>(7);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsErr, setStatsErr] = useState<string | null>(null);

  const alerts = useMemo(() => buildActionableAlerts(stats, items), [stats, items]);

  const loadStats = useCallback(async () => {
    if (!catalogId) return;

    setStatsErr(null);
    setStatsLoading(true);

    try {
      const res = await fetch(`/api/public/v1/stats/catalog/${catalogId}/summary?days=${statsDays}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const msg =
          res.status === 401
            ? "Tu sesión expiró. Vuelve a verificar tu número."
            : "No se pudieron cargar las estadísticas.";
        throw new Error(msg);
      }

      const j = (await res.json()) as StatsSummary;
      setStats(j);
    } catch (e: any) {
      setStatsErr(e?.message || "No se pudieron cargar las estadísticas.");
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  }, [catalogId, statsDays]);

  useEffect(() => {
    if (loading) return;
    if (!ok) return;

    (async () => {
      setTosLoading(true);
      try {
        const s = await getSellerConsent();
        const accepted = Boolean(s.accepted) && (s.version ? s.version === TOS_VERSION : true);
        setTosAccepted(accepted);
      } finally {
        setTosLoading(false);
      }
    })();
  }, [loading, ok]);

  const goPublish = useCallback(async () => {
    // si todavía no sabemos, espera (o permite)
    if (tosLoading) return;

    if (tosAccepted) {
      navigate("/publicar/producto");
      return;
    }

    setTosErr(null);
    setTosChecked(false);
    setTosOpen(true);
  }, [tosAccepted, tosLoading, navigate]);

  /* ================== LOAD PRODUCTS ================== */
  const load = useCallback(async () => {
    setErr(null);
    setFetching(true);

    try {
      const data = await listMyCatalogProducts({ draft: false });
      setItems(Array.isArray(data) ? data : []);

      setCreditsLoading(true);
      const catalog = await getMyPublisherCatalog().catch(() => null);
      const c: any = catalog;
      if (catalog) {
        const total = Number((catalog as any).creditsTotal ?? 0);
        const used = Number((catalog as any).creditsUsed ?? 0);
        setCreditsLeft(Math.max(0, total - used));
        setCatalogId(
          c.publicSlug ??
          c.slug ??
          c.catalogSlug ??
          c.catalogPublicId ??
          c.id ??
          c._id ??
          null
        );
      } else {
        setCreditsLeft(null);
        setCatalogId(null);
      }
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      setErr(
        status === 401
          ? "Tu sesión expiró. Vuelve a verificar tu número."
          : "No se pudieron cargar tus productos."
      );
    } finally {
      setFetching(false);
      setCreditsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ok) return;
    if (tab !== "stats") return;
    loadStats();
  }, [tab, ok, loadStats]);

  useEffect(() => {
    if (!ok) return;
    if (tab !== "stats") return;
    loadStats();
  }, [statsDays, tab, ok, loadStats]);


  useEffect(() => {
    if (loading) return;
    if (!ok) return;
    load();
  }, [loading, ok, load]);

  /* ================== LOAD ORDERS ================== */
  const loadOrders = useCallback(async () => {
    setOrdersErr(null);
    setOrdersLoading(true);

    try {
      const qs = orderStatus ? `?status=${orderStatus}` : "";
      const res = await fetch(`/api/public/v1/publish/orders${qs}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const msg =
          res.status === 401
            ? "Tu sesión expiró. Vuelve a verificar tu número."
            : "No se pudieron cargar los pedidos.";
        throw new Error(msg);
      }

      const data = (await res.json()) as PublishOrderDto[];
      setOrders(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setOrdersErr(e?.message || "No se pudieron cargar los pedidos.");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [orderStatus]);

  // Carga pedidos al entrar a la pestaña
  useEffect(() => {
    if (!ok) return;
    if (tab !== "orders") return;
    loadOrders();
  }, [tab, ok, loadOrders]);

  // Recarga pedidos si cambia filtro, sólo si estás en la pestaña
  useEffect(() => {
    if (!ok) return;
    if (tab !== "orders") return;
    loadOrders();
  }, [orderStatus, tab, ok, loadOrders]);

  /* ================== UPDATE ORDER STATUS ================== */
  const updateOrderStatus = useCallback(
    async (orderId: string, next: OrderStatus) => {
      setBusyOrderId(orderId);
      setOrdersErr(null);

      try {
        const res = await fetch(`/api/public/v1/publish/orders/${orderId}/status`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });

        if (!res.ok) {
          let msg = "No se pudo actualizar el pedido.";
          try {
            const j = await res.json();
            msg = j?.message || j?.error || msg;
          } catch { }
          throw new Error(msg);
        }

        // optimista
        setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: next } : o)));

        // recarga por si cambió el filtro o el BE devuelve info distinta
        await loadOrders();
      } catch (e: any) {
        setOrdersErr(e?.message || "No se pudo actualizar el pedido.");
      } finally {
        setBusyOrderId(null);
      }
    },
    [loadOrders]
  );

  /* ================== PRODUCT ACTIONS ================== */

  const onTogglePaused = useCallback(
    async (p: CatalogProductDto) => {
      const id = p.id;
      if (!id) return;

      const currentPaused = Boolean((p as any).paused);
      const nextPaused = !currentPaused;

      setBusyId(id);
      setErr(null);

      // optimista
      setItems((prev) => prev.map((x) => (x.id === id ? ({ ...x, paused: nextPaused } as any) : x)));

      try {
        await setCatalogProductPaused(id, nextPaused);
      } catch {
        // rollback
        setItems((prev) =>
          prev.map((x) => (x.id === id ? ({ ...x, paused: currentPaused } as any) : x))
        );
        setErr("No se pudo actualizar el estado. Intenta nuevamente.");
      } finally {
        setBusyId(null);
      }
    },
    [setItems]
  );

  const onDelete = useCallback(
    async (p: CatalogProductDto) => {
      const id = p.id;
      if (!id) return;

      const okConfirm = window.confirm(`¿Eliminar "${p.title}"? (Se ocultará de tu catálogo)`);
      if (!okConfirm) return;

      setBusyId(id);
      setErr(null);

      const prev = items;
      setItems((xs) => xs.filter((x) => x.id !== id));

      try {
        await deleteCatalogProduct(id);
      } catch {
        setItems(prev);
        setErr("No se pudo eliminar. Intenta nuevamente.");
      } finally {
        setBusyId(null);
      }
    },
    [items]
  );

  /* ================== UI HELPERS ================== */

  function TabButton(props: { k: TabKey; label: string; emoji: string }) {
    const active = tab === props.k;
    return (
      <button
        type="button"
        onClick={() => setTab(props.k)}
        style={{
          border: "1px solid rgba(15,23,42,0.14)",
          background: active ? "rgba(37,99,235,0.10)" : "rgba(255,255,255,0.95)",
          borderRadius: 999,
          padding: "10px 14px",
          fontWeight: 950,
          cursor: "pointer",
          boxShadow: active ? "0 10px 24px rgba(0,0,0,0.06)" : "none",
        }}
      >
        {props.emoji} {props.label}
      </button>
    );
  }

  // ✅ OJO: hooks (useMemo) SIEMPRE antes de cualquier return condicional
  const hasCredits = (creditsLeft ?? 0) > 0;
  const hasProducts = items.length > 0;

  function firstImage(p: CatalogProductDto) {
    return firstImageThumb(p as any);
  }

  // ✅ returns condicionales al final (para no romper hooks)
  if (loading) return null;
  if (!ok) return null;
  return (
    <div className="lp">
      <header className="lp__header">
        <div className="lp__headerInner">
          <button className="lp__brand" onClick={() => navigate("/")}>
            <img className="lp__logoImg" src={logoMark} alt="Lokaly" />
            <span className="lp__brandText">Lokaly</span>
          </button>

          <nav className="lp__nav">
            <Link className="lp__navLink" to="/">
              Home
            </Link>

            <button className="lp__navCta" onClick={goPublish}>
              Publicar
            </button>
          </nav>
        </div>
      </header>

      <main className="lp__main">
        <section className="lp__detail" style={{ marginTop: 18 }}>
          <div className="lp__detailLeft">
            <div className="lp__detailKicker">Mi negocio</div>
            <div className="lp__detailTitle">Panel del catálogo</div>
            <div className="lp__detailText">
              Administra tus productos, revisa pedidos y mira tus estadísticas.
            </div>

            {creditsLeft !== null && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: hasCredits
                    ? "1px solid rgba(34,197,94,0.25)"
                    : "1px solid rgba(15,23,42,0.10)",
                  background: hasCredits ? "rgba(34,197,94,0.06)" : "rgba(15,23,42,0.02)",
                  fontSize: 12.5,
                  fontWeight: 850,
                  color: "rgba(15,23,42,0.72)",
                }}
              >
                {creditsLoading ? (
                  <>Revisando créditos…</>
                ) : hasCredits ? (
                  <>
                    ✅ Tienes <b>{creditsLeft}</b> publicación(es) disponibles
                  </>
                ) : (
                  <>ℹ️ No tienes publicaciones disponibles. Compra un paquete para publicar nuevos productos.</>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <TabButton k="products" label="Productos" emoji="📦" />
              <TabButton k="orders" label="Pedidos" emoji="🧾" />
              <TabButton k="stats" label="Estadísticas" emoji="📊" />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="lp__btn lp__btn--primary"
                onClick={goPublish}
                disabled={creditsLoading || tosLoading}
                style={{
                  opacity: creditsLoading || tosLoading ? 0.7 : 1,
                  cursor: creditsLoading || tosLoading ? "not-allowed" : "pointer",
                }}
              >
                + Publicar producto
              </button>

              <button
                type="button"
                className="lp__btn lp__btn--ghost"
                onClick={() => (tab === "orders" ? loadOrders() : load())}
                disabled={fetching || ordersLoading}
              >
                {fetching || ordersLoading ? "Actualizando..." : "Actualizar"}
              </button>

              {catalogSlug ? (
                <button
                  type="button"
                  className="lp__btn lp__btn--ghost"
                  onClick={() => window.open(`https://lokaly.site/catalog/${catalogSlug}`, "_blank")}
                >
                  🔗 Ver mi catálogo
                </button>
              ) : null}
            </div>

            {err && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(220,38,38,0.06)",
                  border: "1px solid rgba(220,38,38,0.18)",
                  color: "rgba(127,29,29,0.95)",
                  fontSize: 12.5,
                  fontWeight: 800,
                }}
                role="alert"
              >
                ⚠️ {err}
              </div>
            )}

            {/* ===================== TAB: PRODUCTS ===================== */}
            {tab === "products" ? (
              <div style={{ marginTop: 14 }}>
                {fetching ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : !hasProducts ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 14,
                      borderRadius: 16,
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "rgba(15,23,42,0.02)",
                      fontWeight: 850,
                      color: "rgba(15,23,42,0.75)",
                    }}
                  >
                    Aún no tienes productos publicados. Publica tu primero 👇
                    <div style={{ marginTop: 10 }}>
                      <button
                        className="lp__btn lp__btn--primary"
                        onClick={() => navigate("/publicar/producto")}
                      >
                        Publicar ahora
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                      {items.map((p) => {
                        const paused = Boolean((p as any).paused);
                        const reported = Boolean((p as any).reported);
                        const img = firstImage(p);
                        const busy = busyId === p.id;

                        return (
                          <div
                            key={p.id}
                            style={{
                              borderRadius: 18,
                              border: "1px solid rgba(15,23,42,0.10)",
                              background: "#fff",
                              boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
                              overflow: "hidden",
                              opacity: busy ? 0.72 : 1,
                            }}
                          >
                            <div style={{ position: "relative" }}>
                              <div style={{ height: 160, background: "rgba(15,23,42,0.04)" }}>
                                {img ? (
                                  <img
                                    src={img}
                                    alt={p.title}
                                    loading="lazy"
                                    decoding="async"
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      display: "block",
                                    }}
                                  />
                                ) : null}

                                {reported ? (
                                  <div
                                    style={{
                                      position: "absolute",
                                      inset: 0,
                                      background: "rgba(255,255,255,0.62)",
                                      backdropFilter: "blur(2px)",
                                      zIndex: 2,
                                      pointerEvents: "none",
                                    }}
                                  />
                                ) : null}
                              </div>

                              <div
                                style={{
                                  position: "absolute",
                                  top: 10,
                                  right: 10,
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  background: "rgba(255,255,255,0.92)",
                                  border: "1px solid rgba(15,23,42,0.10)",
                                  fontWeight: 950,
                                  fontSize: 13,
                                  color: "rgba(15,23,42,0.88)",
                                  backdropFilter: "blur(10px)",
                                }}
                              >
                                {moneyLabel(p.price)}
                              </div>

                              <div
                                style={{
                                  position: "absolute",
                                  left: 10,
                                  top: 10,
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  background: reported
                                    ? "rgba(220,38,38,0.12)"
                                    : paused
                                      ? "rgba(245,158,11,0.16)"
                                      : "rgba(34,197,94,0.14)",
                                  border: "1px solid rgba(15,23,42,0.10)",
                                  fontWeight: 950,
                                  fontSize: 12,
                                  color: reported
                                    ? "rgba(127,29,29,0.95)"
                                    : paused
                                      ? "rgba(161,98,7,0.95)"
                                      : "rgba(21,128,61,0.95)",
                                  zIndex: 3,
                                }}
                              >
                                {reported ? "🚩 Reportado" : paused ? "Pausado" : "Activo"}
                              </div>
                            </div>

                            <div style={{ padding: 12 }}>
                              <div
                                style={{
                                  fontWeight: 950,
                                  fontSize: 14,
                                  color: "rgba(15,23,42,0.92)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={p.title}
                              >
                                {p.title}
                              </div>

                              {reported ? (
                                <div
                                  style={{
                                    marginTop: 6,
                                    padding: "8px 10px",
                                    borderRadius: 14,
                                    border: "1px solid rgba(220,38,38,0.18)",
                                    background: "rgba(220,38,38,0.06)",
                                    fontSize: 12.5,
                                    fontWeight: 850,
                                    color: "rgba(127,29,29,0.92)",
                                    lineHeight: 1.35,
                                  }}
                                >
                                  Este producto está <b>oculto</b> del catálogo público mientras se revisa.
                                  <div style={{ marginTop: 4, fontWeight: 800, color: "rgba(15,23,42,0.72)" }}>
                                    👉 Edita la publicación o elimínala.
                                  </div>
                                </div>
                              ) : null}

                              {p.description ? (
                                <div
                                  style={{
                                    marginTop: 6,
                                    fontSize: 12.5,
                                    fontWeight: 750,
                                    color: "rgba(15,23,42,0.62)",
                                    lineHeight: 1.35,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    minHeight: 34,
                                  }}
                                  title={p.description}
                                >
                                  {p.description}
                                </div>
                              ) : (
                                <div
                                  style={{
                                    marginTop: 6,
                                    fontSize: 12.5,
                                    fontWeight: 750,
                                    color: "rgba(15,23,42,0.40)",
                                    minHeight: 34,
                                  }}
                                >
                                  Sin descripción
                                </div>
                              )}

                              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  onClick={() => onTogglePaused(p)}
                                  disabled={busy || reported}
                                  className="lp__chipBtn"
                                  style={{
                                    background: paused ? "#0f172a" : "rgba(245,158,11,0.10)",
                                    color: paused ? "#fff" : "rgba(15,23,42,0.85)",
                                    border: paused ? "0" : "1px solid rgba(15,23,42,0.14)",
                                    opacity: busy ? 0.7 : 1,
                                    cursor: busy ? "not-allowed" : "pointer",
                                  }}
                                >
                                  {reported ? "⛔ Bloqueado" : paused ? "▶️ Reactivar" : "⏸️ Pausar"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => navigate(`/publicar/editar/${p.id}`)}
                                  disabled={busy}
                                  className="lp__chipBtn"
                                  style={{
                                    background: "rgba(15,23,42,0.03)",
                                    opacity: busy ? 0.7 : 1,
                                    cursor: busy ? "not-allowed" : "pointer",
                                  }}
                                >
                                  ✏️ Editar
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onDelete(p)}
                                  disabled={busy}
                                  className="lp__chipBtn"
                                  style={{
                                    background: "rgba(220,38,38,0.06)",
                                    border: "1px solid rgba(220,38,38,0.22)",
                                    color: "rgba(127,29,29,0.95)",
                                    opacity: busy ? 0.7 : 1,
                                    cursor: busy ? "not-allowed" : "pointer",
                                  }}
                                >
                                  🗑️ Eliminar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {/* ===================== TAB: ORDERS ===================== */}
            {tab === "orders" ? (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "#fff",
                    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
                  }}
                >
                  <div style={{ fontWeight: 950, color: "rgba(15,23,42,0.85)" }}>Filtrar:</div>

                  <select
                    value={orderStatus}
                    onChange={(ev) => setOrderStatus(ev.target.value as OrderStatus)}
                    style={{
                      border: "1px solid rgba(15,23,42,0.14)",
                      borderRadius: 12,
                      padding: "10px 12px",
                      fontWeight: 900,
                      outline: "none",
                      background: "rgba(255,255,255,0.98)",
                      cursor: "pointer",
                    }}
                    disabled={ordersLoading}
                  >
                    <option value="PENDING">Pendientes</option>
                    <option value="ACCEPTED">Aceptados</option>
                    <option value="DELIVERED">Entregados</option>
                    <option value="REJECTED">Rechazados</option>
                  </select>

                  <button
                    type="button"
                    className="lp__btn lp__btn--ghost"
                    onClick={() => loadOrders()}
                    disabled={ordersLoading}
                  >
                    {ordersLoading ? "Cargando..." : "Recargar"}
                  </button>

                  <div
                    style={{
                      marginLeft: "auto",
                      fontSize: 12.5,
                      fontWeight: 850,
                      color: "rgba(15,23,42,0.60)",
                    }}
                  >
                    {ordersLoading ? "…" : `${orders.length} pedido(s)`}
                  </div>
                </div>

                {ordersErr ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "rgba(220,38,38,0.06)",
                      border: "1px solid rgba(220,38,38,0.18)",
                      color: "rgba(127,29,29,0.95)",
                      fontSize: 12.5,
                      fontWeight: 800,
                    }}
                    role="alert"
                  >
                    ⚠️ {ordersErr}
                  </div>
                ) : null}

                {ordersLoading ? (
                  <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : orders.length === 0 ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 14,
                      borderRadius: 16,
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "rgba(15,23,42,0.02)",
                      fontWeight: 850,
                      color: "rgba(15,23,42,0.75)",
                    }}
                  >
                    No hay pedidos en este estado.
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 12.5,
                        fontWeight: 750,
                        color: "rgba(15,23,42,0.62)",
                      }}
                    >
                      Cuando un vecino pida desde tu catálogo, aparecerá aquí.
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                    {orders.map((o) => {
                      const busy = busyOrderId === o.id;
                      const canShowWa = o.status === "ACCEPTED" || o.status === "DELIVERED";

                      const buyerPhone = o.buyerPhone || "";
                      const buyerName = o.buyerName || "Comprador";

                      const waMsg = `Hola ${buyerName} 👋 Soy el vendedor de Lokaly. Sobre tu pedido de "${o.productTitle}" (x${o.quantity}). ¿Cuándo te queda bien para entregarlo?`;

                      return (
                        <div
                          key={o.id}
                          style={{
                            borderRadius: 18,
                            border: "1px solid rgba(15,23,42,0.10)",
                            background: "#fff",
                            boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
                            overflow: "hidden",
                            opacity: busy ? 0.75 : 1,
                          }}
                        >
                          <div style={{ padding: 12 }}>
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                              }}
                            >
                              <div>
                                <div style={{ fontWeight: 950, fontSize: 14, color: "rgba(15,23,42,0.92)" }}>
                                  {o.productTitle}{" "}
                                  <span style={{ fontWeight: 850, color: "rgba(15,23,42,0.60)" }}>
                                    × {o.quantity}
                                  </span>
                                </div>
                                <div style={{ marginTop: 4, fontSize: 12.5, fontWeight: 800, color: "rgba(15,23,42,0.60)" }}>
                                  {formatDateLite(o.createdAt)}
                                </div>
                              </div>

                              <div
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  background:
                                    o.status === "PENDING"
                                      ? "rgba(245,158,11,0.16)"
                                      : o.status === "ACCEPTED"
                                        ? "rgba(34,197,94,0.14)"
                                        : o.status === "DELIVERED"
                                          ? "rgba(37,99,235,0.14)"
                                          : "rgba(220,38,38,0.10)",
                                  border: "1px solid rgba(15,23,42,0.10)",
                                  fontWeight: 950,
                                  fontSize: 12,
                                  color: "rgba(15,23,42,0.78)",
                                }}
                              >
                                {o.status === "PENDING"
                                  ? "Pendiente"
                                  : o.status === "ACCEPTED"
                                    ? "Aceptado"
                                    : o.status === "DELIVERED"
                                      ? "Entregado"
                                      : "Rechazado"}
                              </div>
                            </div>

                            <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                              <div
                                style={{
                                  padding: "8px 10px",
                                  borderRadius: 14,
                                  border: "1px solid rgba(15,23,42,0.10)",
                                  background: "rgba(15,23,42,0.02)",
                                  fontWeight: 900,
                                  fontSize: 12.5,
                                  color: "rgba(15,23,42,0.78)",
                                }}
                              >
                                Unit: {moneyMaybe(o.unitPrice)}
                              </div>
                              <div
                                style={{
                                  padding: "8px 10px",
                                  borderRadius: 14,
                                  border: "1px solid rgba(15,23,42,0.10)",
                                  background: "rgba(15,23,42,0.02)",
                                  fontWeight: 900,
                                  fontSize: 12.5,
                                  color: "rgba(15,23,42,0.78)",
                                }}
                              >
                                Total: {moneyMaybe(o.totalPrice)}
                              </div>
                            </div>

                            {o.note ? (
                              <div
                                style={{
                                  marginTop: 10,
                                  padding: 10,
                                  borderRadius: 14,
                                  border: "1px solid rgba(15,23,42,0.10)",
                                  background: "rgba(255,255,255,0.98)",
                                  fontSize: 12.5,
                                  fontWeight: 800,
                                  color: "rgba(15,23,42,0.72)",
                                }}
                              >
                                📝 {o.note}
                              </div>
                            ) : null}

                            <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 850, color: "rgba(15,23,42,0.70)" }}>
                              👤 {buyerName}
                              {canShowWa && buyerPhone ? (
                                <span style={{ marginLeft: 8, fontWeight: 800, color: "rgba(15,23,42,0.55)" }}>
                                  • WA: {buyerPhone}
                                </span>
                              ) : (
                                <span style={{ marginLeft: 8, fontWeight: 800, color: "rgba(15,23,42,0.45)" }}>
                                  • WhatsApp disponible al aceptar
                                </span>
                              )}
                            </div>

                            <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                              {o.status === "PENDING" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => updateOrderStatus(o.id, "ACCEPTED")}
                                    disabled={busy}
                                    className="lp__chipBtn"
                                    style={{
                                      background: "rgba(34,197,94,0.14)",
                                      border: "1px solid rgba(34,197,94,0.24)",
                                      color: "rgba(21,128,61,0.95)",
                                      opacity: busy ? 0.7 : 1,
                                      cursor: busy ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    ✅ Aceptar
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => updateOrderStatus(o.id, "REJECTED")}
                                    disabled={busy}
                                    className="lp__chipBtn"
                                    style={{
                                      background: "rgba(220,38,38,0.06)",
                                      border: "1px solid rgba(220,38,38,0.22)",
                                      color: "rgba(127,29,29,0.95)",
                                      opacity: busy ? 0.7 : 1,
                                      cursor: busy ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    ❌ Rechazar
                                  </button>
                                </>
                              ) : null}

                              {o.status === "ACCEPTED" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => updateOrderStatus(o.id, "DELIVERED")}
                                    disabled={busy}
                                    className="lp__chipBtn"
                                    style={{
                                      background: "rgba(37,99,235,0.10)",
                                      border: "1px solid rgba(37,99,235,0.18)",
                                      color: "rgba(30,64,175,0.95)",
                                      opacity: busy ? 0.7 : 1,
                                      cursor: busy ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    📦 Marcar entregado
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => updateOrderStatus(o.id, "REJECTED")}
                                    disabled={busy}
                                    className="lp__chipBtn"
                                    style={{
                                      background: "rgba(220,38,38,0.06)",
                                      border: "1px solid rgba(220,38,38,0.22)",
                                      color: "rgba(127,29,29,0.95)",
                                      opacity: busy ? 0.7 : 1,
                                      cursor: busy ? "not-allowed" : "pointer",
                                    }}
                                  >
                                    Cancelar (rechazar)
                                  </button>
                                </>
                              ) : null}

                              <button
                                type="button"
                                disabled={busy || !canShowWa}
                                className="lp__chipBtn"
                                onClick={() => openWhatsApp(buyerPhone, waMsg)}
                                style={{
                                  background: canShowWa ? "rgba(34,197,94,0.14)" : "rgba(15,23,42,0.03)",
                                  border: "1px solid rgba(15,23,42,0.12)",
                                  color: "rgba(15,23,42,0.85)",
                                  opacity: busy || !canShowWa ? 0.6 : 1,
                                  cursor: busy || !canShowWa ? "not-allowed" : "pointer",
                                }}
                                title={canShowWa ? "Abrir WhatsApp" : "Disponible al aceptar el pedido"}
                              >
                                💬 WhatsApp
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            {/* ===================== TAB: STATS ===================== */}
            {tab === "stats" ? (
              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <AlertsPanel alerts={alerts} />
                {/* selector y recargar */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "#fff",
                    boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontWeight: 950, color: "rgba(15,23,42,0.85)" }}>Rango:</div>

                  <select
                    value={statsDays}
                    onChange={(e) => setStatsDays(Number(e.target.value))}
                    disabled={statsLoading}
                    style={{
                      border: "1px solid rgba(15,23,42,0.14)",
                      borderRadius: 12,
                      padding: "10px 12px",
                      fontWeight: 900,
                      outline: "none",
                      background: "rgba(255,255,255,0.98)",
                      cursor: "pointer",
                    }}
                  >
                    <option value={1}>Hoy</option>
                    <option value={7}>7 días</option>
                    <option value={30}>30 días</option>
                  </select>

                  <button
                    type="button"
                    className="lp__btn lp__btn--ghost"
                    onClick={() => loadStats()}
                    disabled={statsLoading || !catalogId}
                  >
                    {statsLoading ? "Cargando..." : "Recargar"}
                  </button>

                  <div style={{ marginLeft: "auto", fontSize: 12.5, fontWeight: 850, color: "rgba(15,23,42,0.60)" }}>
                    {catalogId ? `Catálogo: ${String(catalogId).slice(0, 6)}…` : "Sin catálogo"}
                  </div>
                </div>

                {statsErr ? (
                  <div
                    style={{
                      marginTop: 0,
                      padding: "10px 12px",
                      borderRadius: 12,
                      background: "rgba(220,38,38,0.06)",
                      border: "1px solid rgba(220,38,38,0.18)",
                      color: "rgba(127,29,29,0.95)",
                      fontSize: 12.5,
                      fontWeight: 800,
                    }}
                    role="alert"
                  >
                    ⚠️ {statsErr}
                  </div>
                ) : null}

                {/* cards “operación diaria” */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  <StatCard label="Vistas del catálogo" value={statsLoading ? "…" : (stats?.catalogViews ?? "—")} sub="Cuántas veces abrieron tu catálogo." />
                  <StatCard label="Visitantes únicos" value={statsLoading ? "…" : (stats?.uniqueVisitors ?? "—")} sub="Personas distintas (aprox.)." />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  <StatCard label="Vistas de productos" value={statsLoading ? "…" : (stats?.productViews ?? "—")} sub="Entraron a la página de un producto." />
                  <StatCard label="Clicks a producto" value={statsLoading ? "…" : (stats?.productClicks ?? "—")} sub="Click en “Ver detalles” desde el catálogo." />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  <StatCard label="Intención de compra" value={statsLoading ? "…" : (stats?.orderIntent ?? "—")} sub="Abrieron el formulario de pedido." />
                  <StatCard label="Pedidos enviados" value={statsLoading ? "…" : (stats?.orderSubmitOk ?? "—")} sub="Enviaron el pedido correctamente." />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  <StatCard label="Clicks a WhatsApp" value={statsLoading ? "…" : (stats?.whatsappClicks ?? "—")} sub="Intentaron contactarte por WhatsApp." />
                  <StatCard
                    label="Créditos disponibles"
                    value={creditsLeft ?? "—"}
                    sub="Para publicar productos nuevos."
                  />
                </div>

                {/* conversión simple (sin charts) */}
                <div
                  style={{
                    padding: 12,
                    borderRadius: 16,
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "rgba(15,23,42,0.02)",
                    fontWeight: 850,
                    color: "rgba(15,23,42,0.75)",
                  }}
                >
                  <div style={{ fontWeight: 950, marginBottom: 6 }}>¿Cómo avanzan tus clientes?</div>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: "rgba(15,23,42,0.70)",
                      lineHeight: 1.5,
                    }}
                  >
                    {stats ? (
                      <>
                        <div style={{ fontWeight: 900, marginBottom: 6 }}>
                          ¿Cómo avanzan tus clientes?
                        </div>

                        {/* Catálogo → Producto */}
                        {(() => {
                          const pct =
                            stats.catalogViews > 0
                              ? Math.round(
                                (stats.productClicks / Math.max(1, stats.catalogViews)) * 100
                              )
                              : 0;

                          return (
                            <div>
                              📖 <b>Catálogo → Producto</b>:{" "}
                              <b style={{ color: pctColor(pct) }}>{pct}%</b>{" "}
                              <span style={{ fontWeight: 700 }}>
                                de quienes abren tu catálogo hacen clic en un producto.
                              </span>
                            </div>
                          );
                        })()}

                        {/* Producto → Intento */}
                        {(() => {
                          const pct =
                            stats.productViews > 0
                              ? Math.round(
                                (stats.orderIntent / Math.max(1, stats.productViews)) * 100
                              )
                              : 0;

                          return (
                            <div>
                              👀 <b>Producto → Intento</b>:{" "}
                              <b style={{ color: pctColor(pct) }}>{pct}%</b>{" "}
                              <span style={{ fontWeight: 700 }}>
                                de quienes ven un producto intentan comprar.
                              </span>
                            </div>
                          );
                        })()}

                        {/* Intento → Pedido */}
                        {(() => {
                          const pct =
                            stats.orderIntent > 0
                              ? Math.round(
                                (stats.orderSubmitOk / Math.max(1, stats.orderIntent)) * 100
                              )
                              : 0;

                          return (
                            <div>
                              🛒 <b>Intento → Pedido</b>:{" "}
                              <b style={{ color: pctColor(pct) }}>{pct}%</b>{" "}
                              <span style={{ fontWeight: 700 }}>
                                de los intentos terminan enviando un pedido.
                              </span>
                            </div>
                          );
                        })()}

                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 11.5,
                            fontWeight: 700,
                            color: "rgba(15,23,42,0.55)",
                          }}
                        >
                          💡 Con pocos visitantes, los porcentajes pueden verse muy altos.
                        </div>
                      </>
                    ) : (
                      <>—</>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {tosOpen ? (
              <div
                role="dialog"
                aria-modal="true"
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(15,23,42,0.55)",
                  display: "grid",
                  placeItems: "center",
                  zIndex: 9999,
                  padding: 16,
                }}
                onClick={() => (tosBusy ? null : setTosOpen(false))}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "min(560px, 100%)",
                    borderRadius: 18,
                    background: "#fff",
                    border: "1px solid rgba(15,23,42,0.12)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: 16, borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
                    <div style={{ fontWeight: 950, fontSize: 16, color: "rgba(15,23,42,0.92)" }}>
                      Acepta Términos y Condiciones
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 800, color: "rgba(15,23,42,0.62)", lineHeight: 1.45 }}>
                      Para publicar productos necesitas aceptar los Términos y el Aviso de Privacidad.
                    </div>
                  </div>

                  <div style={{ padding: 16, display: "grid", gap: 12 }}>
                    <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <input
                        type="checkbox"
                        checked={tosChecked}
                        onChange={(e) => setTosChecked(e.target.checked)}
                        disabled={tosBusy}
                        style={{ marginTop: 3 }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 850, color: "rgba(15,23,42,0.78)", lineHeight: 1.45 }}>
                        Acepto los{" "}
                        <a href="/terms.html" target="_blank" rel="noreferrer" style={{ fontWeight: 950 }}>
                          Términos y Condiciones
                        </a>{" "}
                        y el{" "}
                        <a href="/privacy.html" target="_blank" rel="noreferrer" style={{ fontWeight: 950 }}>
                          Aviso de Privacidad
                        </a>
                        .
                      </span>
                    </label>

                    {tosErr ? (
                      <div
                        style={{
                          padding: "10px 12px",
                          borderRadius: 12,
                          background: "rgba(220,38,38,0.06)",
                          border: "1px solid rgba(220,38,38,0.18)",
                          color: "rgba(127,29,29,0.95)",
                          fontSize: 12.5,
                          fontWeight: 800,
                        }}
                        role="alert"
                      >
                        ⚠️ {tosErr}
                      </div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      padding: 16,
                      display: "flex",
                      gap: 10,
                      justifyContent: "flex-end",
                      borderTop: "1px solid rgba(15,23,42,0.08)",
                      background: "rgba(15,23,42,0.02)",
                    }}
                  >
                    <button
                      type="button"
                      className="lp__btn lp__btn--ghost"
                      disabled={tosBusy}
                      onClick={() => setTosOpen(false)}
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      className="lp__btn lp__btn--primary"
                      disabled={!tosChecked || tosBusy}
                      onClick={async () => {
                        setTosErr(null);
                        setTosBusy(true);
                        try {
                          await acceptSellerConsent();
                          setTosAccepted(true);
                          setTosOpen(false);
                          navigate("/publicar/producto");
                        } catch (e: any) {
                          setTosErr(e?.message || "No se pudo guardar tu aceptación.");
                        } finally {
                          setTosBusy(false);
                        }
                      }}
                      style={{
                        opacity: !tosChecked || tosBusy ? 0.7 : 1,
                        cursor: !tosChecked || tosBusy ? "not-allowed" : "pointer",
                      }}
                    >
                      {tosBusy ? "Guardando..." : "Aceptar y continuar"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="lp__detailRight">
            <div className="lp__detailImgWrap">
              <div style={{ width: "100%" }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>Tip</div>
                <div style={{ fontSize: 13, color: "rgba(15,23,42,0.68)", lineHeight: 1.45 }}>
                  Pausa productos cuando no tengas stock. Así tu catálogo siempre se ve actualizado.
                </div>

                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "rgba(37,99,235,0.06)",
                    color: "rgba(15,23,42,0.78)",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Tip: Acepta un pedido para ver el WhatsApp del comprador y coordinar la entrega.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}