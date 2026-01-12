import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../LandingPage.css";

type ProductDraft = {
  phoneE164: string;
  phoneLocal: string;
  imageFile: File;
  imagePreviewUrl: string;
  title: string;
  price: string;
  description: string;
};

type PlanKey = "ONE" | "PACK3" | "PACK5" | "PACK10";
type LocationState = ProductDraft;

function formatMxMoney(n: number) {
  return `$${n}`;
}

function makeCatalogSlugFromPhone(phoneLocal: string) {
  const last4 = phoneLocal.slice(-4);
  return `mi-catalogo-${last4}`;
}

type Plan = {
  key: PlanKey;
  title: string;
  subtitle: string;
  price: number; // lo que paga hoy
  credits: number; // cuántas publicaciones incluye
  highlight?: "MOST_SOLD" | "RECOMMENDED";
  blurb: string;
  bg?: "white" | "blueSoft";
};

const BASE_PRICE = 16;

const PLANS: Plan[] = [
  {
    key: "ONE",
    title: "1 publicación",
    subtitle: "30 días activo",
    price: 16,
    credits: 1,
    blurb: "Ideal para probar con un producto.",
    bg: "white",
  },
  {
    key: "PACK3",
    title: "Paquete 3",
    subtitle: "3 publicaciones",
    price: 39,
    credits: 3,
    blurb: "Para empezar bien: sube tus 3 productos más pedidos y comparte un solo link.",
    bg: "white",
  },
  {
    key: "PACK5",
    title: "Paquete 5",
    subtitle: "5 publicaciones",
    price: 65,
    credits: 5,
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
  if (plan.credits === 1) return "1 publicación · 30 días";
  return `${plan.credits} publicaciones · 30 días`;
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const draft = (location.state || null) as LocationState | null;

  // ✅ default recomendado: PACK10 o PACK5 (aquí pongo PACK10, tú decides)
  const [planKey, setPlanKey] = useState<PlanKey>("PACK10");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!draft?.phoneE164 || !draft?.phoneLocal || !draft?.title || !draft?.price) {
      navigate("/publicar", { replace: true });
    }
  }, [draft, navigate]);

  const selectedPlan = useMemo(() => {
    return PLANS.find((p) => p.key === planKey) ?? PLANS[0];
  }, [planKey]);

  const priceToPay = selectedPlan.price;

  async function onPay() {
    if (!draft) return;

    setLoading(true);
    try {
      // TODO real:
      // 1) createCheckout({ planKey, draftId... })
      // 2) confirmPayment
      // 3) activate credits / publish

      const slug = makeCatalogSlugFromPhone(draft.phoneLocal);
      const link = `https://lokaly.site/catalog/${slug}`;

      navigate("/publicar/listo", {
        state: {
          catalogUrl: link,
          plan: planKey,
          amountPaid: priceToPay,
          title: draft.title,
          phoneE164: draft.phoneE164,
          phoneLocal: draft.phoneLocal,
          credits: selectedPlan.credits,
        },
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lp">
      {/* Header uniforme con landing */}
      <header className="lp__header">
        <div className="lp__headerInner">
          <button className="lp__brand" onClick={() => navigate("/")}>
            <span className="lp__brandText">Lokaly</span>
          </button>

          <nav className="lp__nav">
            <Link className="lp__navLink" to="/ejemplo">
              Ver ejemplo
            </Link>
            <a className="lp__navLink" href="/#faq">
              Preguntas
            </a>
            <button className="lp__navCta" onClick={() => navigate("/publicar")}>
              Publicar
            </button>
          </nav>
        </div>
      </header>

      <main className="lp__main">
        <section className="lp__detail" style={{ marginTop: 18 }}>
          {/* Left */}
          <div className="lp__detailLeft">
            <div className="lp__detailKicker">Pago</div>
            <div className="lp__detailTitle">Elige tu paquete</div>
            <div className="lp__detailText">
              Pagas por publicación. <strong>Sin comisiones por venta.</strong>
              <div style={{ marginTop: 6, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                Tip: La mayoría de vendedores publica más de 1 producto.
              </div>
            </div>

            {/* Plan cards */}
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {PLANS.map((p) => {
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
                    style={{
                      textAlign: "left",
                      borderRadius: 18,
                      border: isActive
                        ? "2px solid rgba(37,99,235,0.55)"
                        : "1px solid rgba(15,23,42,0.10)",
                      background: isBlue ? "rgba(37,99,235,0.06)" : "#fff",
                      padding: 14,
                      cursor: "pointer",
                      boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
                      position: "relative",
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
  }}
>
                        {badge}
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "baseline",
                      }}
                    >
                      <div style={{ fontWeight: 950, fontSize: 15, color: "#0f172a" }}>
                        {p.title} — <span style={{ fontSize: 18 }}>{formatMxMoney(p.price)}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.60)" }}>
                        {p.subtitle}
                      </div>
                    </div>

                    <div style={{ marginTop: 6, fontSize: 13, color: "rgba(15,23,42,0.70)", lineHeight: 1.4 }}>
                      {p.blurb}
                    </div>

                    {savingsText(p) ? (
                      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.62)" }}>
                        {savingsText(p)}
                      </div>
                    ) : null}

                    {/* Empuje suave en PACK5 */}
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

            {/* Pay button */}
            <button
              className="lp__btn lp__btn--primary"
              type="button"
              onClick={onPay}
              disabled={loading || !draft}
              style={{
                marginTop: 14,
                width: "100%",
                opacity: loading || !draft ? 0.7 : 1,
                cursor: loading || !draft ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Procesando pago..." : `Pagar y publicar · ${formatMxMoney(priceToPay)}`}
            </button>

            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
              Pago seguro. No cobramos comisión por venta.
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
              *Precio inicial por lanzamiento. Próximamente sube a $19.
            </div>
          </div>

          {/* Right */}
          <div className="lp__detailRight">
            <div className="lp__detailImgWrap">
              <div style={{ width: "100%" }}>
                <div style={{ fontWeight: 950, marginBottom: 10 }}>Resumen</div>

                {draft?.imagePreviewUrl ? (
                  <div
                    style={{
                      borderRadius: 16,
                      overflow: "hidden",
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "#fff",
                    }}
                  >
                    <img
                      src={draft.imagePreviewUrl}
                      alt={draft.title}
                      style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
                    />
                  </div>
                ) : null}

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 950, fontSize: 14, color: "#0f172a" }}>
                    {draft?.title || "Tu producto"}
                  </div>
                  <div style={{ marginTop: 2, fontSize: 13, color: "rgba(15,23,42,0.65)", fontWeight: 850 }}>
                    ${draft?.price || "0"}
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
                    Tip: Con {selectedPlan.credits > 1 ? `paquete de ${selectedPlan.credits}` : "1 publicación"} armas tu catálogo más rápido.
                  </div>
                </div>

                {/* Extra: mini tabla de precio por producto */}
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "#fff",
                    fontSize: 12,
                    color: "rgba(15,23,42,0.70)",
                    lineHeight: 1.45,
                  }}
                >
                  <div style={{ fontWeight: 950, marginBottom: 6 }}>Precio por publicación</div>
                  {selectedPlan.credits === 1 ? (
                    <div>• {formatMxMoney(BASE_PRICE)} por producto</div>
                  ) : (
                    <div>
                      • {formatMxMoney(Math.round((selectedPlan.price / selectedPlan.credits) * 10) / 10)} por producto aprox.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}