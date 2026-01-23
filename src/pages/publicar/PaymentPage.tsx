// src/pages/publicar/PaymentPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../LandingPage.css";

import logoMark from "../../assets/brand/lokaly-mark.svg";
import { usePublishGuard } from "../../hooks/usePublishGuard";
import { fetchCatalogPlans, createCatalogCheckout, } from "../../api";

type ProductDraft = {
  phoneE164: string;
  phoneLocal: string;
  images: { file: File; previewUrl: string }[];
  primaryIndex: number;
  title: string;
  price: string;
  description: string;
};

type PlanKey = "ONE" | "PACK3" | "PACK5" | "PACK10";

/** ✅ viene así desde ProductFormPage: navigate("/publicar/pago", { state: { productId, draft } }) */
type LocationState = {
  productId: string;
  draft: ProductDraft;
};

function formatMxMoney(n: number) {
  return `$${n}`;
}


type Plan = {
  key: PlanKey;
  title: string;
  subtitle: string;
  price: number;
  credits: number;
  daysValid?: number;
  highlight?: "MOST_SOLD" | "RECOMMENDED";
  blurb: string;
  bg?: "white" | "blueSoft";
};

const BASE_PRICE = 16;

// Fallback local (si el BE falla o todavía no tienes /plans)
const FALLBACK_PLANS: Plan[] = [
  {
    key: "ONE",
    title: "1 publicación",
    subtitle: "30 días activo",
    price: 16,
    credits: 1,
    daysValid: 30,
    blurb: "Ideal para probar con un producto.",
    bg: "white",
  },
  {
    key: "PACK3",
    title: "Paquete 3",
    subtitle: "3 publicaciones",
    price: 39,
    credits: 3,
    daysValid: 30,
    blurb: "Para empezar bien: sube tus 3 productos más pedidos y comparte un solo link.",
    bg: "white",
  },
  {
    key: "PACK5",
    title: "Paquete 5",
    subtitle: "5 publicaciones",
    price: 65,
    credits: 5,
    daysValid: 30,
    highlight: "RECOMMENDED",
    blurb: "Catálogo real: lo más práctico si vendes seguido (tus más vendidos en un solo link).",
    bg: "blueSoft",
  },
  {
    key: "PACK10",
    title: "Paquete 10",
    subtitle: "10 publicaciones",
    price: 99,
    credits: 10,
    daysValid: 30,
    highlight: "MOST_SOLD",
    blurb: "Todo tu catálogo: publica varios productos y actualiza cuando quieras.",
    bg: "blueSoft",
  },
];

function savingsText(plan: Plan) {
  if (plan.credits <= 1) return "";
  const regular = plan.credits * BASE_PRICE;
  const save = regular - plan.price;
  if (save <= 0) return "";
  return `Ahorras ${formatMxMoney(save)} vs. pagar ${formatMxMoney(BASE_PRICE)} c/u`;
}

function planLabel(plan: Plan) {
  const days = plan.daysValid ?? 30;
  if (plan.credits === 1) return `1 publicación · ${days} días`;
  return `${plan.credits} publicaciones · ${days} días`;
}

function normalizePlans(raw: any): Plan[] | null {
  try {
    const list = Array.isArray(raw) ? raw : Array.isArray(raw?.plans) ? raw.plans : null;
    if (!list) return null;

    const mapped: Plan[] = list
      .map((p: any) => {
        const key = String(p.key ?? p.planKey ?? "").toUpperCase() as PlanKey;
        if (!key) return null;

        const credits = Number(p.credits ?? p.publications ?? 0);
        const price = Number(p.amount ?? p.price ?? 0);
        const daysValid = p.daysValid != null ? Number(p.daysValid) : undefined;

        // si tu BE trae labels, usamos eso; si no, armamos defaults
        const title =
          p.title ??
          (key === "ONE" ? "1 publicación" : key === "PACK3" ? "Paquete 3" : key === "PACK5" ? "Paquete 5" : "Paquete 10");

        const subtitle = p.subtitle ?? (credits === 1 ? `${daysValid ?? 30} días activo` : `${credits} publicaciones`);
        const blurb = p.blurb ?? "Publica tus productos y comparte un solo link.";
        const highlight = (p.highlight as any) ?? undefined;
        const bg = (p.bg as any) ?? (key === "PACK5" || key === "PACK10" ? "blueSoft" : "white");

        if (!credits || !price) return null;

        return {
          key,
          title,
          subtitle,
          price,
          credits,
          daysValid,
          highlight,
          blurb,
          bg,
        } as Plan;
      })
      .filter(Boolean) as Plan[];

    // Validación mínima: que existan planes
    if (!mapped.length) return null;

    // Opcional: ordenar por credits
    mapped.sort((a, b) => a.credits - b.credits);
    return mapped;
  } catch {
    return null;
  }
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state || null) as LocationState | null;
  const productId = state?.productId ?? null;
  const draft = state?.draft ?? null;

  // ✅ Seguridad real: valida contra el BE (cookie lokaly_pub)
  const { loading: guardLoading, ok } = usePublishGuard({
    redirectTo: "/publicar",
  });

  // planes dinámicos (desde BE)
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansErr, setPlansErr] = useState<string | null>(null);

  // selección de plan
  const [planKey, setPlanKey] = useState<PlanKey>("PACK10");

  // loading del flujo de pago
  const [loading, setLoading] = useState(false);

  // opcional: mensaje de error de pago
  const [payErr, setPayErr] = useState<string | null>(null);

  useEffect(() => {
    if (guardLoading) return;
    if (!ok) return; // el guard ya redirigió

    const hasImages = Boolean(draft?.images?.length);
    if (!productId || !draft?.phoneE164 || !draft?.phoneLocal || !draft?.title || !draft?.price || !hasImages) {
      navigate("/publicar/producto", { replace: true });
    }
  }, [guardLoading, ok, draft, productId, navigate]);

  // cargar planes desde BE
  useEffect(() => {
    if (guardLoading) return;
    if (!ok) return;

    let alive = true;

    (async () => {
      try {
        setPlansLoading(true);
        setPlansErr(null);

        const res = await fetchCatalogPlans(); // ✅ /api/public/v1/catalog/plans
        const normalized = normalizePlans(res);

        if (!alive) return;

        if (normalized && normalized.length) {
          setPlans(normalized);

          // si el planKey actual no existe, set al último (el de más créditos)
          const exists = normalized.some((p) => p.key === planKey);
          if (!exists) setPlanKey(normalized[normalized.length - 1].key);
        } else {
          // fallback silencioso
          setPlans(FALLBACK_PLANS);
        }
      } catch (e: any) {
        if (!alive) return;
        setPlans(FALLBACK_PLANS);
        setPlansErr("No pudimos cargar los paquetes. Mostrando precios por defecto.");
      } finally {
        if (alive) setPlansLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardLoading, ok]);

  const selectedPlan = useMemo(() => plans.find((p) => p.key === planKey) ?? plans[0], [plans, planKey]);
  const priceToPay = selectedPlan?.price ?? 0;

  // ✅ imagen principal a mostrar en resumen (usa primaryIndex del form)
  const safePrimaryIndex = useMemo(() => {
    const len = draft?.images?.length ?? 0;
    if (len === 0) return 0;
    const pi = draft?.primaryIndex ?? 0;
    return Math.max(0, Math.min(pi, len - 1));
  }, [draft?.images?.length, draft?.primaryIndex]);

  const primaryPreview = draft?.images?.[safePrimaryIndex]?.previewUrl ?? null;

async function onPay() {
  if (!draft || !productId) return;
  if (!selectedPlan) return;

  setLoading(true);
  setPayErr(null);

  try {
    // 1) crear checkout (order PENDING + checkoutUrl)
    const order = await createCatalogCheckout(planKey);

    const orderId = (order as any)?.orderId as string | undefined;
    const checkoutUrl = (order as any)?.checkoutUrl as string | undefined;

    if (!orderId) throw new Error("ORDER_ID_MISSING");
    if (!checkoutUrl) throw new Error("CHECKOUT_URL_MISSING");

    // 2) guardar contexto para continuar después del redirect
localStorage.setItem("lokaly_pending_payment_v1", JSON.stringify({
  productId,
  planKey,
  orderId,
  title: draft.title,
  phoneE164: draft.phoneE164,
  phoneLocal: draft.phoneLocal,
  amount: order.amount ?? priceToPay,
  currency: order.currency ?? "MXN",
  credits: order.credits ?? selectedPlan.credits,
  daysValid: order.daysValid ?? selectedPlan.daysValid ?? 30,
  createdAt: Date.now(),
}));

    // 3) redirigir a Stripe
    window.location.href = checkoutUrl;
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status;
    const msgRaw = String(err?.message ?? "");

    if (status === 401) {
      setPayErr("Tu sesión expiró. Vuelve a verificar tu número.");
    } else if (msgRaw.includes("ORDER_ID_MISSING")) {
      setPayErr("No pudimos iniciar el pago. Intenta nuevamente.");
    } else if (msgRaw.includes("CHECKOUT_URL_MISSING")) {
      setPayErr("No se pudo abrir el pago. Intenta nuevamente.");
    } else {
      setPayErr("No se pudo iniciar el pago. Intenta nuevamente.");
    }
  } finally {
    setLoading(false);
  }
}

  if (guardLoading) return null;
  if (!ok) return null;
  if (!draft || !productId) return null;

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
            <a className="lp__navLink" href="/#how">
              Cómo funciona
            </a>
            <a className="lp__navLink" href="/#contact">
              Contacto
            </a>
            <button className="lp__navCta" onClick={() => navigate("/publicar")}>
              Publicar
            </button>
          </nav>
        </div>
      </header>

      <main className="lp__main">
        <section className="lp__detail" style={{ marginTop: 18 }}>
          <div className="lp__detailLeft">
            <div className="lp__detailKicker">Pago</div>
            <div className="lp__detailTitle">Elige tu paquete</div>

            <div className="lp__detailText">
              Pagas por publicación. <strong>Sin comisiones por venta.</strong>
              <div style={{ marginTop: 6, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                Tip: La mayoría de vendedores publica más de 1 producto.
              </div>
            </div>

            {plansErr ? (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 14,
                  border: "1px solid rgba(245,158,11,0.25)",
                  background: "rgba(245,158,11,0.10)",
                  color: "rgba(15,23,42,0.78)",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {plansErr}
              </div>
            ) : null}

            <div style={{ marginTop: 14, display: "grid", gap: 10, opacity: plansLoading ? 0.85 : 1 }}>
              {plans.map((p) => {
                const isActive = p.key === planKey;
                const isBlue = p.bg === "blueSoft";

                const badge =
                  p.highlight === "MOST_SOLD"
                    ? "⭐ Más vendido"
                    : p.highlight === "RECOMMENDED"
                    ? "Recomendado"
                    : "";

                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPlanKey(p.key)}
                    disabled={loading}
                    style={{
                      textAlign: "left",
                      borderRadius: 18,
                      border: isActive ? "2px solid rgba(37,99,235,0.55)" : "1px solid rgba(15,23,42,0.10)",
                      background: isBlue ? "rgba(37,99,235,0.06)" : "#fff",
                      padding: 14,
                      cursor: loading ? "not-allowed" : "pointer",
                      boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
                      position: "relative",
                      opacity: loading ? 0.8 : 1,
                    }}
                  >
                    {badge ? (
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 950,
                          padding: "5px 9px",
                          borderRadius: 999,
                          background: "rgba(37,99,235,0.14)",
                          border: "1px solid rgba(37,99,235,0.20)",
                          color: "rgba(15,23,42,0.80)",
                          whiteSpace: "nowrap",
                          display: "inline-block",
                          marginBottom: 8,
                        }}
                      >
                        {badge}
                      </div>
                    ) : null}

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                      <div style={{ fontWeight: 950, fontSize: 15, color: "#0f172a" }}>
                        {p.title} — <span style={{ fontSize: 18 }}>{formatMxMoney(p.price)}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.60)" }}>
                        {p.credits} publicaciones
                      </div>
                    </div>

                    {savingsText(p) ? (
                      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.62)" }}>
                        {savingsText(p)}
                      </div>
                    ) : null}

                    {p.key === "PACK5" ? (
                      <div
                        style={{
                          marginTop: 10,
                          padding: 10,
                          borderRadius: 14,
                          border: "1px solid rgba(37,99,235,0.18)",
                          background: "rgba(255,255,255,0.7)",
                          fontSize: 12,
                          fontWeight: 850,
                          color: "rgba(15,23,42,0.72)",
                        }}
                      >
                        💡 Si tienes varios productos, este es el más práctico.
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {payErr ? (
              <div
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(239,68,68,0.22)",
                  background: "rgba(239,68,68,0.08)",
                  color: "rgba(15,23,42,0.80)",
                  fontSize: 12,
                  fontWeight: 800,
                  lineHeight: 1.4,
                }}
              >
                {payErr}
              </div>
            ) : null}

            <button
              className="lp__btn lp__btn--primary"
              type="button"
              onClick={onPay}
              disabled={loading || plansLoading}
              style={{
                marginTop: 14,
                width: "100%",
                opacity: loading || plansLoading ? 0.7 : 1,
                cursor: loading || plansLoading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Procesando..." : `Pagar y publicar · ${formatMxMoney(priceToPay)}`}
            </button>

            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
              Pago seguro. No cobramos comisión por venta.
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
              *Precio inicial por lanzamiento. Próximamente sube a $19.
            </div>
          </div>

          <div className="lp__detailRight">
            <div className="lp__detailImgWrap">
              <div style={{ width: "100%" }}>
                <div style={{ fontWeight: 950, marginBottom: 10 }}>Resumen</div>

                {primaryPreview ? (
                  <div
                    style={{
                      borderRadius: 16,
                      overflow: "hidden",
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "#fff",
                    }}
                  >
                    <img
                      src={primaryPreview}
                      alt={draft.title}
                      style={{ width: "100%", height: 170, objectFit: "cover", display: "block" }}
                    />
                  </div>
                ) : null}

                {draft.images?.length > 1 ? (
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 10,
                      overflowX: "auto",
                      paddingBottom: 6,
                    }}
                    aria-label="Fotos del producto"
                  >
                    {draft.images.map((img, idx) => {
                      const active = idx === safePrimaryIndex;
                      return (
                        <div
                          key={idx}
                          style={{
                            minWidth: 64,
                            width: 64,
                            height: 64,
                            borderRadius: 14,
                            overflow: "hidden",
                            border: active ? "2px solid rgba(245,158,11,0.95)" : "1px solid rgba(15,23,42,0.12)",
                            boxShadow: active ? "0 0 0 4px rgba(245,158,11,0.14)" : "none",
                            background: "#fff",
                            flex: "0 0 auto",
                          }}
                          title={active ? "Principal" : `Foto ${idx + 1}`}
                        >
                          <img
                            src={img.previewUrl}
                            alt={`Foto ${idx + 1}`}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 950, fontSize: 14, color: "#0f172a" }}>{draft.title || "Tu producto"}</div>
                  <div style={{ marginTop: 2, fontSize: 13, color: "rgba(15,23,42,0.65)", fontWeight: 850 }}>
                    ${draft.price || "0"}
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      padding: 12,
                      borderRadius: 14,
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "#fff",
                      color: "rgba(15,23,42,0.75)",
                      fontSize: 12,
                      fontWeight: 800,
                      lineHeight: 1.45,
                    }}
                  >
                    <div style={{ fontWeight: 950, marginBottom: 6 }}>Incluye</div>
                    ✅ {planLabel(selectedPlan)}
                    <br />
                    ✅ Un solo link listo para WhatsApp
                    <br />
                    ✅ Sin comisiones por venta
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)", fontWeight: 800 }}>
                    📷 Fotos: {draft.images?.length ?? 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}