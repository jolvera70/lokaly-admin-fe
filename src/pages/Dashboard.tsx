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
};

type SellerFunnelResponse = {
  // OTP
  otpSent: number;
  otpVerified: number;
  publishSessionCreated: number;

  // Producto (seller)
  productFormView: number;        // FE UX (PRODUCT_FORM_VIEW) si lo mandas desde FE
  productDraftRequested: number;  // BE (PRODUCT_DRAFT_REQUESTED)
  productDraftRejected: number;   // BE (PRODUCT_DRAFT_REJECTED)
  productDraftUploadFailed: number;
  productUpdated: number;

  productPublished: number;       // BE (PRODUCT_PUBLISHED)
  productPublishFailed: number;   // BE (PRODUCT_PUBLISH_FAILED)
  noCredits: number;              // reason NO_CREDITS

  // Pago (seller)
  paymentStarted: number;            // PAYMENT_STARTED
  paymentCheckoutCreated: number;    // PAYMENT_CHECKOUT_CREATED
  paymentConfirmStarted: number;     // PAYMENT_CONFIRM_STARTED
  paymentSucceeded: number;          // PAYMENT_SUCCEEDED
  paymentFailed: number;             // PAYMENT_FAILED
};

type AdminFunnelResponse = {
  buyer: CatalogStatsResponse;
  seller: SellerFunnelResponse;
};

type Mode = "catalog" | "global";

function pct(n: number, d: number) {
  if (!d || d <= 0) return 0;
  return Math.round((n / Math.max(1, d)) * 100);
}

function KpiCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
}) {
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
      <div style={{ fontSize: 11, color: "#a3a3a3", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#f2d58b" }}>
        {value}
      </div>
      {sub ? (
        <div style={{ marginTop: 6, fontSize: 11, color: "#8a8a8a" }}>
          {sub}
        </div>
      ) : null}
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

// Helpers para evitar NaN / undefined en UI
function n(v: any) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

const ZERO_BUYER: CatalogStatsResponse = {
  catalogViews: 0,
  uniqueVisitors: 0,
  productViews: 0,
  productClicks: 0,
  whatsappClicks: 0,
  orderIntent: 0,
  orderSubmitOk: 0,
};

const ZERO_SELLER: SellerFunnelResponse = {
  otpSent: 0,
  otpVerified: 0,
  publishSessionCreated: 0,

  productFormView: 0,
  productDraftRequested: 0,
  productDraftRejected: 0,
  productDraftUploadFailed: 0,
  productUpdated: 0,

  productPublished: 0,
  productPublishFailed: 0,
  noCredits: 0,

  paymentStarted: 0,
  paymentCheckoutCreated: 0,
  paymentConfirmStarted: 0,
  paymentSucceeded: 0,
  paymentFailed: 0,
};

export default function Dashboard() {
  const [mode, setMode] = useState<Mode>("catalog");
  const [catalogId, setCatalogId] = useState("");
  const [days, setDays] = useState(7);

  const [stats, setStats] = useState<AdminFunnelResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  const load = useCallback(async () => {
    const id = catalogId.trim();

    // Reset mensajes
    setErr(null);
    setWarn(null);

    if (mode === "catalog" && !id) {
      setErr("Escribe un catalogId para consultar estadísticas por catálogo.");
      setStats(null);
      return;
    }

    setLoading(true);

    try {
      // URLs según modo
      const buyerUrl =
        mode === "catalog"
          ? `/api/public/v1/stats/catalog/${encodeURIComponent(id)}/summary?days=${days}`
          : `/api/public/v1/stats/summary?days=${days}`; // 👈 crea este endpoint si quieres buyer global

      const sellerUrl =
        mode === "catalog"
          ? `/api/public/v1/stats/catalog/${encodeURIComponent(id)}/seller-funnel?days=${days}`
          : `/api/public/v1/stats/seller-funnel?days=${days}`;

      // Hacemos requests en paralelo
      const [buyerRes, sellerRes] = await Promise.all([
        fetch(buyerUrl, { credentials: "include" }),
        fetch(sellerUrl, { credentials: "include" }),
      ]);

      // Seller es clave para tu admin; buyer global puede no existir aún.
      let buyer: CatalogStatsResponse = ZERO_BUYER;
      let seller: SellerFunnelResponse = ZERO_SELLER;

      // Seller
      if (!sellerRes.ok) {
        const msg =
          sellerRes.status === 401
            ? "Tu sesión expiró."
            : sellerRes.status === 404
            ? "No se encontró (seller funnel)."
            : "No se pudieron cargar estadísticas (seller funnel).";
        throw new Error(msg);
      } else {
        const s = (await sellerRes.json()) as Partial<SellerFunnelResponse>;
        seller = {
          ...ZERO_SELLER,
          otpSent: n(s.otpSent),
          otpVerified: n(s.otpVerified),
          publishSessionCreated: n(s.publishSessionCreated),

          productFormView: n(s.productFormView),
          productDraftRequested: n(s.productDraftRequested),
          productDraftRejected: n(s.productDraftRejected),
          productDraftUploadFailed: n(s.productDraftUploadFailed),
          productUpdated: n(s.productUpdated),

          productPublished: n(s.productPublished),
          productPublishFailed: n(s.productPublishFailed),
          noCredits: n(s.noCredits),

          paymentStarted: n(s.paymentStarted),
          paymentCheckoutCreated: n(s.paymentCheckoutCreated),
          paymentConfirmStarted: n(s.paymentConfirmStarted),
          paymentSucceeded: n(s.paymentSucceeded),
          paymentFailed: n(s.paymentFailed),
        };
      }

      // Buyer
      if (!buyerRes.ok) {
        // En modo catálogo, buyer debería existir -> error
        if (mode === "catalog") {
          const msg =
            buyerRes.status === 401
              ? "Tu sesión expiró."
              : buyerRes.status === 404
              ? "No se encontró ese catálogo."
              : "No se pudieron cargar estadísticas (buyer).";
          throw new Error(msg);
        }

        // En modo global, si no existe aún, solo avisamos y seguimos.
        setWarn("⚠️ Buyer global aún no está disponible (falta endpoint /stats/summary). Mostrando buyer en 0.");
        buyer = ZERO_BUYER;
      } else {
        const b = (await buyerRes.json()) as Partial<CatalogStatsResponse>;
        buyer = {
          catalogViews: n(b.catalogViews),
          uniqueVisitors: n(b.uniqueVisitors),
          productViews: n(b.productViews),
          productClicks: n(b.productClicks),
          whatsappClicks: n(b.whatsappClicks),
          orderIntent: n(b.orderIntent),
          orderSubmitOk: n(b.orderSubmitOk),
        };
      }

      setStats({ buyer, seller });
    } catch (e: any) {
      setErr(e?.message || "No se pudieron cargar estadísticas.");
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [mode, catalogId, days]);

  const buyerFunnel = useMemo(() => {
    if (!stats) return null;
    const b = stats.buyer;
    const c2p = pct(b.productClicks, b.catalogViews);
    const p2i = pct(b.orderIntent, b.productViews);
    const i2o = pct(b.orderSubmitOk, b.orderIntent);
    const c2o = pct(b.orderSubmitOk, b.catalogViews);
    return { c2p, p2i, i2o, c2o };
  }, [stats]);

  const sellerFunnel = useMemo(() => {
    if (!stats) return null;
    const s = stats.seller;

    const otpToVerified = pct(s.otpVerified, s.otpSent);
    const verifiedToSession = pct(s.publishSessionCreated, s.otpVerified);

    const draftOk = Math.max(0, s.productDraftRequested - s.productDraftRejected);
    const formToDraft = pct(s.productDraftRequested, s.productFormView || s.productDraftRequested); // fallback
    const draftOkToPublished = pct(s.productPublished, draftOk);

    const payStartToCheckout = pct(s.paymentCheckoutCreated, s.paymentStarted);
    const checkoutToSuccess = pct(s.paymentSucceeded, s.paymentCheckoutCreated);
    const payFailRate = pct(s.paymentFailed, s.paymentStarted);

    return {
      otpToVerified,
      verifiedToSession,
      formToDraft,
      draftOk,
      draftOkToPublished,
      payStartToCheckout,
      checkoutToSuccess,
      payFailRate,
    };
  }, [stats]);

  return (
    <div>
      <section style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 650, color: "#f5f5f5" }}>
          Dashboard · Admin mínimo (Funnel)
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9b9b9b" }}>
          Buyer funnel + Seller funnel (OTP → Producto → Pago) usando track_events.
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
          {/* Toggle modo */}
          <select
            value={mode}
            onChange={(e) => {
              const m = e.target.value as Mode;
              setMode(m);
              setErr(null);
              setWarn(null);
              setStats(null);
            }}
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
            <option value="catalog">Por catálogo</option>
            <option value="global">Global (todos)</option>
          </select>

          {/* catalogId solo cuando aplica */}
          <input
            value={catalogId}
            onChange={(e) => setCatalogId(e.target.value)}
            placeholder="catalogId (ej: mi-catalogo-ed8x5qf o ObjectId)"
            disabled={mode === "global"}
            style={{
              flex: 1,
              minWidth: 260,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: mode === "global" ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.6)",
              color: mode === "global" ? "rgba(255,255,255,0.5)" : "#fff",
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

        {warn ? (
          <div style={{ fontSize: 13, color: "#ffb86b", fontWeight: 650 }}>{warn}</div>
        ) : null}

        {!stats ? (
          <div style={{ fontSize: 13, color: "#bdbdbd" }}>
            {mode === "catalog" ? (
              <>
                Ingresa un <b>catalogId</b> y presiona <b>Consultar</b>.
              </>
            ) : (
              <>
                Modo <b>Global</b>: presiona <b>Consultar</b> para ver el comportamiento de todos.
              </>
            )}
          </div>
        ) : (
          <>
            {/* KPIs Buyer */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              <KpiCard label="👥 Visitantes únicos" value={stats.buyer.uniqueVisitors} sub={`${days} días`} />
              <KpiCard label="📖 Vistas de catálogo" value={stats.buyer.catalogViews} sub={`${days} días`} />
              <KpiCard label="🖱️ Clicks a producto" value={stats.buyer.productClicks} sub={`${days} días`} />
              <KpiCard label="🧾 Pedidos enviados (OK)" value={stats.buyer.orderSubmitOk} sub={`${days} días`} />
            </div>

            {/* Embudo comprador */}
            <Panel title={`Embudo comprador ${mode === "global" ? "(Global)" : "(Por catálogo)"}`}>
              <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#e3e3e3" }}>
                <div>1) Vistas catálogo: <b style={{ color: "#f2d58b" }}>{stats.buyer.catalogViews}</b></div>
                <div>2) Click producto: <b style={{ color: "#f2d58b" }}>{stats.buyer.productClicks}</b> ({buyerFunnel?.c2p ?? 0}%)</div>
                <div>3) Intento compra (form): <b style={{ color: "#f2d58b" }}>{stats.buyer.orderIntent}</b> (Producto→Intento {buyerFunnel?.p2i ?? 0}%)</div>
                <div>4) Pedido enviado OK: <b style={{ color: "#f2d58b" }}>{stats.buyer.orderSubmitOk}</b> (Intento→OK {buyerFunnel?.i2o ?? 0}%)</div>
                <div>5) Click WhatsApp: <b style={{ color: "#f2d58b" }}>{stats.buyer.whatsappClicks}</b></div>

                <div style={{ marginTop: 8, fontSize: 12, color: "#9b9b9b" }}>
                  Conversión total (Catálogo→Pedido OK): <b style={{ color: "#f2d58b" }}>{buyerFunnel?.c2o ?? 0}%</b>
                </div>
              </div>
            </Panel>

            {/* KPIs Seller */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 14,
              }}
            >
              <KpiCard label="📩 OTP enviados" value={stats.seller.otpSent} sub={`${days} días`} />
              <KpiCard label="✅ OTP verificados" value={stats.seller.otpVerified} sub={`${days} días`} />
              <KpiCard label="🧩 Drafts solicitados" value={stats.seller.productDraftRequested} sub={`${days} días`} />
              <KpiCard label="🟡 Pagos OK" value={stats.seller.paymentSucceeded} sub={`${days} días`} />
            </div>

            {/* Embudo vendedor */}
            <Panel title={`Embudo vendedor (OTP → Producto) ${mode === "global" ? "(Global)" : "(Por catálogo)"}`}>
              <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#e3e3e3" }}>
                <div>1) OTP sent: <b style={{ color: "#f2d58b" }}>{stats.seller.otpSent}</b></div>
                <div>2) OTP verified: <b style={{ color: "#f2d58b" }}>{stats.seller.otpVerified}</b> ({sellerFunnel?.otpToVerified ?? 0}%)</div>
                <div>3) Publish session created: <b style={{ color: "#f2d58b" }}>{stats.seller.publishSessionCreated}</b> ({sellerFunnel?.verifiedToSession ?? 0}%)</div>

                <div style={{ marginTop: 10, fontSize: 12, color: "#9b9b9b" }}>— Producto —</div>

                <div>4) Form view (FE): <b style={{ color: "#f2d58b" }}>{stats.seller.productFormView}</b></div>
                <div>5) Draft requested (BE): <b style={{ color: "#f2d58b" }}>{stats.seller.productDraftRequested}</b> (Form→Draft {sellerFunnel?.formToDraft ?? 0}%)</div>
                <div>6) Draft rejected: <b style={{ color: "#f2d58b" }}>{stats.seller.productDraftRejected}</b></div>
                <div>7) Draft OK: <b style={{ color: "#f2d58b" }}>{sellerFunnel?.draftOk ?? 0}</b></div>
                <div>8) Product published: <b style={{ color: "#f2d58b" }}>{stats.seller.productPublished}</b> (Draft OK→Published {sellerFunnel?.draftOkToPublished ?? 0}%)</div>

                {stats.seller.noCredits ? (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#ffb86b" }}>
                    ⚠️ Sin créditos (NO_CREDITS): <b>{stats.seller.noCredits}</b>
                  </div>
                ) : null}

                {stats.seller.productDraftUploadFailed ? (
                  <div style={{ marginTop: 6, fontSize: 12, color: "#ff6b6b" }}>
                    ⚠️ Fallos upload imágenes: <b>{stats.seller.productDraftUploadFailed}</b>
                  </div>
                ) : null}
              </div>
            </Panel>

            {/* Embudo pago */}
            <Panel title={`Embudo pago (Stripe) ${mode === "global" ? "(Global)" : "(Por catálogo)"}`}>
              <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#e3e3e3" }}>
                <div>1) Payment started: <b style={{ color: "#f2d58b" }}>{stats.seller.paymentStarted}</b></div>
                <div>2) Checkout created: <b style={{ color: "#f2d58b" }}>{stats.seller.paymentCheckoutCreated}</b> ({sellerFunnel?.payStartToCheckout ?? 0}%)</div>
                <div>3) Confirm started: <b style={{ color: "#f2d58b" }}>{stats.seller.paymentConfirmStarted}</b></div>
                <div>4) Payment succeeded: <b style={{ color: "#f2d58b" }}>{stats.seller.paymentSucceeded}</b> (Checkout→OK {sellerFunnel?.checkoutToSuccess ?? 0}%)</div>
                <div>5) Payment failed: <b style={{ color: "#f2d58b" }}>{stats.seller.paymentFailed}</b> (Fail rate {sellerFunnel?.payFailRate ?? 0}%)</div>
              </div>
            </Panel>
          </>
        )}
      </section>
    </div>
  );
}