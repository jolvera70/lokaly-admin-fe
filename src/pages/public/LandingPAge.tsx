// src/pages/public/LandingPage.tsx
import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../LandingPage.css";

// ✅ Imagen principal del hero (grande a la derecha)
import heroImg from "../../assets/mock/hero-illustration.png";
import logoMark from "../../assets/brand/lokaly-mark.svg";

// ✅ Imágenes pequeñas por step
import step1Img from "../../assets/mock/step-1.png";
import step2Img from "../../assets/mock/step-2.png";
import step3Img from "../../assets/mock/step-3.png";

type Step = {
  key: "publish" | "share" | "sell";
  title: string;
  desc: string;
  detailTitle: string;
  detailText: string;
  img: string;
};

type Plan = {
  key: "ONE" | "PACK3" | "PACK5" | "PACK10";
  title: string;
  price: number;
  products: number;
  badge?: string;
  tone?: "plain" | "soft" | "featured";
};

function formatMxMoney(n: number) {
  return `$${n}`;
}

export default function LandingPage() {
  const navigate = useNavigate();

  // ✅ un solo destino para “Publicar” y “Administrar”
  // PublishStartPage decidirá: sesión -> entra, sin sesión -> OTP
  const goPublishStart = useCallback(() => navigate("/publicar"), [navigate]);

  const steps: Step[] = useMemo(
    () => [
      {
        key: "publish",
        title: "Step 1",
        desc: "Publica tu producto (30 días)",
        detailTitle: "Publica en 1 minuto",
        detailText:
          "Sube una foto, pon el precio y queda visible por 30 días. Puedes pausar, editar o renovar cuando quieras.",
        img: step1Img,
      },
      {
        key: "share",
        title: "Step 2",
        desc: "Comparte tu link por WhatsApp",
        detailTitle: "Comparte un solo link",
        detailText:
          "Envía tu catálogo por WhatsApp a tus clientes. Tus productos quedan ordenados y con el precio claro.",
        img: step2Img,
      },
      {
        key: "sell",
        title: "Step 3",
        desc: "Recibe pedidos directo",
        detailTitle: "Recibe pedidos por WhatsApp",
        detailText:
          "Tus clientes te escriben directo para comprar. Sin comisiones por venta, tú controlas todo.",
        img: step3Img,
      },
    ],
    []
  );

  const BASE_PRICE = 16;

  const plans: Plan[] = useMemo(
    () => [
      { key: "ONE", title: "Probar Lokaly", price: 16, products: 1, tone: "plain" },
      { key: "PACK3", title: "Para empezar bien", price: 39, products: 3, tone: "soft" },
      { key: "PACK5", title: "Catálogo real", price: 65, products: 5, badge: "Recomendado", tone: "featured" },
      { key: "PACK10", title: "Todo tu catálogo", price: 99, products: 10, badge: "⭐ Más vendido", tone: "featured" },
    ],
    []
  );

  function savingsText(products: number, price: number) {
    const full = products * BASE_PRICE;
    const save = full - price;
    if (save <= 0) return "";
    return `Ahorras ${formatMxMoney(save)} vs pagar ${formatMxMoney(BASE_PRICE)} c/u`;
  }

  const [activeStep, setActiveStep] = useState(0);

  const prev = useCallback(() => {
    setActiveStep((s) => (s - 1 + steps.length) % steps.length);
  }, [steps.length]);

  const next = useCallback(() => {
    setActiveStep((s) => (s + 1) % steps.length);
  }, [steps.length]);

  // ✅ Swipe simple para móvil (touch)
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    touchEndX.current = null;
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchMove(e: React.TouchEvent) {
    touchEndX.current = e.touches[0].clientX;
  }

  function onTouchEnd() {
    if (touchStartX.current == null || touchEndX.current == null) return;
    const dx = touchStartX.current - touchEndX.current;
    if (dx > 45) next();
    if (dx < -45) prev();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  const current = steps[activeStep];

  return (
    <div className="lp">
      {/* Header */}
      <header className="lp__header">
        <div className="lp__headerInner">
          <button className="lp__brand" onClick={() => navigate("/")}>
            <img className="lp__logoImg" src={logoMark} alt="Lokaly" />
            <span className="lp__brandText">Lokaly</span>
          </button>

          <nav className="lp__nav">
            <Link className="lp__navLink" to="#how">
              Cómo funciona
            </Link>
            <a className="lp__navLink" href="#contact">
              Contacto
            </a>

            {/* ✅ NUEVO: administrar productos (visible) */}
            <button
              className="lp__navLink"
              type="button"
              onClick={goPublishStart}
              style={{
                fontWeight: 900,
                color: "rgba(15,23,42,0.78)",
              }}
              aria-label="Administrar mis productos"
              title="Editar, pausar o eliminar publicaciones"
            >
              Administrar
            </button>

            {/* CTA principal */}
            <button className="lp__navCta" onClick={goPublishStart}>
              Publicar
            </button>
          </nav>
        </div>
      </header>

      <main className="lp__main">
        {/* Hero */}
        <section className="lp__hero">
          <div className="lp__heroLeft">
            <div className="lp__kicker">Catálogo para vender por WhatsApp</div>

            <h1 className="lp__h1">
              Vende por WhatsApp con un <span className="lp__h1Em">solo link</span>
            </h1>

            <p className="lp__subtitle">
              Publica tu producto en 1 minuto, compártelo en WhatsApp y recibe pedidos directo.
              Sin apps, sin comisiones.
            </p>

            <div className="lp__prices">
              {plans.map((p) => {
                const isFeatured = p.key === "PACK10" || p.key === "PACK5";
                const save = savingsText(p.products, p.price);

                return (
                  <div
                    key={p.key}
                    className={["lp__priceCard", isFeatured ? "lp__priceCard--featured" : ""].join(" ")}
                    style={{
                      background:
                        p.key === "ONE"
                          ? "#fff"
                          : p.key === "PACK3"
                          ? "rgba(37,99,235,0.05)"
                          : "rgba(37,99,235,0.07)",
                      borderColor:
                        p.key === "ONE" ? "rgba(15, 23, 42, 0.09)" : "rgba(37,99,235,0.18)",
                    }}
                  >
                    {p.badge ? <div className="lp__badge">{p.badge}</div> : null}

                    <div style={{ fontWeight: 950, fontSize: 14, color: "rgba(15,23,42,0.88)" }}>
                      {p.title}
                    </div>

                    <div className="lp__priceBig" style={{ marginTop: 6 }}>
                      {formatMxMoney(p.price)}
                    </div>

                    <div className="lp__priceMeta">
                      {p.products === 1 ? "1 publicación" : `${p.products} publicaciones`} · 30 días
                    </div>

                    <div className="lp__priceHint" style={{ marginTop: 8 }}>
                      {p.products === 1
                        ? "Ideal para probar con un producto."
                        : "Publica varios productos y compártelos con un solo link."}
                    </div>

                    {save ? (
                      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.70)" }}>
                        {save}
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
                        💡 La mayoría publica más de 1 producto.
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="lp__ctaRow">
              <button className="lp__btn lp__btn--primary" onClick={goPublishStart}>
                Publicar mi producto
              </button>

              {/* ✅ NUEVO: CTA secundario muy visible */}
              <button
                className="lp__btn lp__btn--ghost"
                onClick={goPublishStart}
                title="Editar, pausar o eliminar tus publicaciones"
              >
                Administrar mis productos
              </button>

              <button className="lp__btn lp__btn--ghost" onClick={() => navigate("https://lokaly.site/app/catalog/mi-catalogo-1dm0gqx")}>
                Ver ejemplo de catalogo
              </button>
            </div>

            <div className="lp__micro">
              ✓ Sin apps <span className="lp__dot">·</span> ✓ Sin comisiones <span className="lp__dot">·</span> ✓ 30 días activo
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
              *Precio inicial por lanzamiento. Próximamente sube a $19.
            </div>
          </div>

          <div className="lp__heroRight" aria-label="Ilustración">
            <div className="lp__heroArt">
              <img className="lp__heroImg" src={heroImg} alt="Ilustración Lokaly" />
            </div>
          </div>
        </section>

        {/* Step section */}
        <section className="lp__how" id="how">
          <div className="lp__detail" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
            <div className="lp__detailLeft">
              <div className="lp__detailKicker">Cómo funciona</div>
              <div className="lp__detailTitle">{current.detailTitle}</div>
              <div className="lp__detailText">{current.detailText}</div>

              <div className="lp__detailCtas">
                <button className="lp__btn lp__btn--primary" onClick={goPublishStart}>
                  Publicar ahora
                </button>

                {/* ✅ NUEVO: administrar desde aquí también */}
                <button className="lp__btn lp__btn--ghost" onClick={goPublishStart}>
                  Administrar mis productos
                </button>

                <div className="lp__hint">Tip: En celular puedes deslizar ↔️</div>
              </div>
            </div>

            <div className="lp__detailRight">
              <div className="lp__detailImgWrap">
                <img className="lp__detailImg" src={current.img} alt={current.detailTitle} />
              </div>
            </div>
          </div>

          <div className="lp__stepBar">
            <div className="lp__stepBarInner">
              <div className="lp__steps">
                {steps.map((st, idx) => (
                  <button
                    key={st.key}
                    className={`lp__step ${idx === activeStep ? "is-active" : ""}`}
                    onClick={() => setActiveStep(idx)}
                    type="button"
                  >
                    <div className="lp__stepTitle">{st.title}</div>
                    <div className="lp__stepDesc">{st.desc}</div>
                  </button>
                ))}
              </div>

              <div className="lp__stepNav" aria-label="Navegación de pasos">
                <button className="lp__circleBtn" onClick={prev} aria-label="Anterior">
                  ‹
                </button>
                <button className="lp__circleBtn" onClick={next} aria-label="Siguiente">
                  ›
                </button>
              </div>
            </div>
          </div>
        </section>

{/* Footer */}
<footer className="lp__footer" id="contact">
  <div className="lp__footerInner">
    {/* Brand */}
    <div className="lp__footerLeft">
      <div className="lp__footerBrand">Lokaly</div>

      <a
        className="lp__footerWhatsapp"
        href="https://wa.me/528182082264?text=Hola%20necesito%20soporte%20con%20Lokaly"
        target="_blank"
        rel="noreferrer"
      >
        Soporte por WhatsApp
      </a>
    </div>

    {/* Links */}
<div className="lp__footerLinks">
  <a href="/terms.html" target="_blank" rel="noopener noreferrer">
    Términos
  </a>
  <a href="/privacy.html" target="_blank" rel="noopener noreferrer">
    Privacidad
  </a>
  <a href="mailto:soporte@lokaly.site">
    Soporte
  </a>
</div>
  </div>
</footer>
      </main>
    </div>
  );
}