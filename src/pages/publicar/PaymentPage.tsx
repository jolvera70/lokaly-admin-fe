import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../LandingPage.css";

type ProductDraft = {
  phoneE164: string;
  phoneLocal: string;
  imageFile: File; // no lo usamos aquí para UI, pero viene del flujo
  imagePreviewUrl: string;
  title: string;
  price: string;
  description: string;
};

type PlanKey = "ONE" | "PACK10";

type LocationState = ProductDraft;

function formatMxMoney(n: number) {
  // sin Intl para evitar inconsistencias, simple:
  return `$${n}`;
}

function makeCatalogSlugFromPhone(phoneLocal: string) {
  // simple: ultimos 4
  const last4 = phoneLocal.slice(-4);
  return `mi-catalogo-${last4}`;
}

export default function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const draft = (location.state || null) as LocationState | null;

  const [plan, setPlan] = useState<PlanKey>("PACK10");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!draft?.phoneE164 || !draft?.phoneLocal || !draft?.title || !draft?.price) {
      navigate("/publicar", { replace: true });
    }
  }, [draft, navigate]);

  const priceToPay = useMemo(() => {
    return plan === "ONE" ? 14 : 99;
  }, [plan]);

  const planLabel = useMemo(() => {
    return plan === "ONE" ? "1 publicación · 30 días" : "10 publicaciones";
  }, [plan]);

  const savingsText = useMemo(() => {
    // 10 x 14 = 140 vs 99 => ahorro 41
    if (plan !== "PACK10") return "";
    const save = 140 - 99;
    return `Ahorras ${formatMxMoney(save)} vs. pagar $14 c/u`;
  }, [plan]);

  async function onPay() {
    if (!draft) return;

    setLoading(true);
    try {
      // Aquí iría tu integración real (Stripe, etc):
      // 1) createCheckout(plan, draft)
      // 2) confirmPayment
      // 3) create publication(s)

      // Mock de éxito:
      const slug = makeCatalogSlugFromPhone(draft.phoneLocal);
      const link = `https://lokaly.site/catalog/${slug}`;

      navigate("/publicar/listo", {
        state: {
          catalogUrl: link,
          plan,
          amountPaid: priceToPay,
          title: draft.title,
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
            <div className="lp__detailTitle">Elige tu opción</div>
            <div className="lp__detailText">
              Pagas por publicación. <strong>Sin comisiones por venta.</strong>
            </div>

            {/* Plan cards */}
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {/* Plan 1 */}
              <button
                type="button"
                onClick={() => setPlan("ONE")}
                style={{
                  textAlign: "left",
                  borderRadius: 18,
                  border: plan === "ONE" ? "2px solid rgba(37,99,235,0.55)" : "1px solid rgba(15,23,42,0.10)",
                  background: "#fff",
                  padding: 14,
                  cursor: "pointer",
                  boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 950, fontSize: 15, color: "#0f172a" }}>
                    1 publicación — <span style={{ fontSize: 18 }}>{formatMxMoney(14)}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.60)" }}>
                    30 días
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: "rgba(15,23,42,0.65)", lineHeight: 1.4 }}>
                  Ideal para probar. Publica un producto y compártelo por WhatsApp.
                </div>
              </button>

              {/* Plan 10 */}
              <button
                type="button"
                onClick={() => setPlan("PACK10")}
                style={{
                  textAlign: "left",
                  borderRadius: 18,
                  border: plan === "PACK10" ? "2px solid rgba(37,99,235,0.55)" : "1px solid rgba(15,23,42,0.10)",
                  background: "rgba(37,99,235,0.06)",
                  padding: 14,
                  cursor: "pointer",
                  boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    fontSize: 12,
                    fontWeight: 950,
                    padding: "5px 9px",
                    borderRadius: 999,
                    background: "rgba(37,99,235,0.14)",
                    border: "1px solid rgba(37,99,235,0.20)",
                    color: "rgba(15,23,42,0.80)",
                  }}
                >
                  ⭐ Más vendido
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
                  <div style={{ fontWeight: 950, fontSize: 15, color: "#0f172a" }}>
                    10 publicaciones — <span style={{ fontSize: 18 }}>{formatMxMoney(99)}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.60)" }}>
                    Paquete
                  </div>
                </div>

                <div style={{ marginTop: 6, fontSize: 13, color: "rgba(15,23,42,0.70)", lineHeight: 1.4 }}>
                  Publica varios productos y comparte un solo link.
                </div>

                <div style={{ marginTop: 8, fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.62)" }}>
                  {savingsText}
                </div>
              </button>
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
                    ✅ {planLabel}
                    <br />
                    ✅ Link listo para WhatsApp
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
                    Tip: Con paquete de 10 puedes armar tu catálogo completo más rápido.
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