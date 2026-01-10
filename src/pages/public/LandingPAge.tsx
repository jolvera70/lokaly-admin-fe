import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../LandingPage.css";


// ✅ Imagen principal del hero (grande a la derecha)
import heroImg from "../../assets/mock/hero-illustration.png";
import logoMark from "../../assets/brand/lokaly-mark.svg";

// ✅ Imágenes pequeñas por step (pueden ser PNG/SVG)
// Si no tienes 3 aún, puedes repetir heroImg por ahora.
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

export default function LandingPage() {
  const navigate = useNavigate();

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

    // umbral de swipe
    if (dx > 45) next(); // swipe left
    if (dx < -45) prev(); // swipe right
  }

  // ✅ Teclas (opcional desktop)
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
            <Link className="lp__navLink" to="/">
              Home
            </Link>
            <a className="lp__navLink" href="#how">
              Cómo funciona
            </a>
            <a className="lp__navLink" href="#contact">
              Contacto
            </a>
            <button className="lp__navCta" onClick={() => navigate("/publicar")}>
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
              <div className="lp__priceCard">
                <div className="lp__priceBig">$14</div>
                <div className="lp__priceMeta">1 publicación · 30 días</div>
              </div>

              <div className="lp__priceCard lp__priceCard--featured">
                <div className="lp__badge">Más vendido</div>
                <div className="lp__priceBig">$99</div>
                <div className="lp__priceMeta">10 publicaciones</div>
                <div className="lp__priceHint">Ahorra vs. pagar $14 c/u</div>
              </div>
            </div>

            <div className="lp__ctaRow">
              <button className="lp__btn lp__btn--primary" onClick={() => navigate("/publicar")}>
                Publicar mi producto
              </button>
              <button className="lp__btn lp__btn--ghost" onClick={() => navigate("/ejemplo")}>
                Ver ejemplo
              </button>
            </div>

            <div className="lp__micro">
              ✓ Sin apps <span className="lp__dot">·</span> ✓ Sin mensualidades{" "}
              <span className="lp__dot">·</span> ✓ 30 días activo
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
          {/* Panel que cambia texto/imagen */}
          <div
            className="lp__detail"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="lp__detailLeft">
              <div className="lp__detailKicker">Cómo funciona</div>
              <div className="lp__detailTitle">{current.detailTitle}</div>
              <div className="lp__detailText">{current.detailText}</div>

              <div className="lp__detailCtas">
                <button className="lp__btn lp__btn--primary" onClick={() => navigate("/publicar")}>
                  Publicar ahora
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

          {/* Step bar */}
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

              {/* Flechas: solo desktop (CSS las oculta en móvil) */}
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

        {/* Footer mini */}
        <footer className="lp__footer" id="contact">
          <div className="lp__footerInner">
            <div>
              <div className="lp__footerBrand">Lokaly</div>
              <div className="lp__footerMuted">Soporte por WhatsApp</div>
            </div>
            <div className="lp__footerLinks">
              <Link to="/terminos">Términos</Link>
              <Link to="/privacidad">Privacidad</Link>
              <Link to="/soporte">Soporte</Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}