import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../LandingPage.css";

type SuccessState = {
  catalogUrl?: string;
  amountPaid?: number;
  plan?: "ONE" | "PACK10";
  title?: string;

  // opcional: si quieres permitir "publicar otro" sin pedir OTP otra vez
  phoneE164?: string;
  phoneLocal?: string;
};

function planLabel(plan?: "ONE" | "PACK10") {
  if (plan === "ONE") return "1 publicación · 30 días";
  if (plan === "PACK10") return "10 publicaciones";
  return "Publicación";
}

function buildWhatsAppShareLink(catalogUrl: string) {
  const msg =
    `¡Hola! 👋\n` +
    `Te comparto mi catálogo en Lokaly:\n` +
    `${catalogUrl}\n\n` +
    `Si te interesa algo, escríbeme por aquí.`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
}

export function PublishSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as SuccessState;

  const [copied, setCopied] = useState(false);

  const catalogUrl = state.catalogUrl;

  useEffect(() => {
    if (!catalogUrl) {
      navigate("/", { replace: true });
    }
  }, [catalogUrl, navigate]);

  const shareLink = useMemo(() => {
    if (!catalogUrl) return "";
    return buildWhatsAppShareLink(catalogUrl);
  }, [catalogUrl]);

  async function onCopy() {
    if (!catalogUrl) return;
    try {
      await navigator.clipboard.writeText(catalogUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback simple
      const el = document.createElement("textarea");
      el.value = catalogUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  function onPublishAnother() {
    // si tienes phone en state, puedes enviarlo y saltarte pedir número (si tu backend lo permite)
    if (state.phoneE164 && state.phoneLocal) {
      navigate("/publicar/producto", {
        state: { phoneE164: state.phoneE164, phoneLocal: state.phoneLocal },
      });
      return;
    }
    navigate("/publicar");
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
            <div className="lp__detailKicker">Listo</div>
            <div className="lp__detailTitle">🎉 ¡Tu publicación ya está activa!</div>
            <div className="lp__detailText">
              Comparte tu link para empezar a recibir pedidos por WhatsApp.
            </div>

            {/* Link box */}
            <div
              style={{
                marginTop: 14,
                borderRadius: 18,
                border: "1px solid rgba(15,23,42,0.10)",
                background: "#fff",
                padding: 14,
                boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 950, color: "rgba(15,23,42,0.65)" }}>
                Tu catálogo
              </div>

              <div
                style={{
                  marginTop: 6,
                  fontSize: 14,
                  fontWeight: 900,
                  color: "#0f172a",
                  wordBreak: "break-all",
                  lineHeight: 1.4,
                }}
              >
                {catalogUrl}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  className="lp__btn lp__btn--ghost"
                  type="button"
                  onClick={onCopy}
                  style={{ flex: "1 1 180px" }}
                >
                  {copied ? "✅ Copiado" : "Copiar link"}
                </button>

                <a
                  className="lp__btn lp__btn--primary"
                  href={shareLink}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    textDecoration: "none",
                    display: "inline-flex",
                    justifyContent: "center",
                    alignItems: "center",
                    flex: "1 1 180px",
                  }}
                >
                  Compartir por WhatsApp
                </a>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                Tus clientes te escribirán directo por WhatsApp.
              </div>
            </div>

            {/* Secondary CTA */}
            <button
              className="lp__btn lp__btn--primary"
              type="button"
              onClick={onPublishAnother}
              style={{ marginTop: 14, width: "100%" }}
            >
              ➕ Publicar otro producto
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              style={{
                marginTop: 10,
                width: "100%",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontWeight: 900,
                color: "rgba(15,23,42,0.65)",
              }}
            >
              Volver al inicio
            </button>
          </div>

          {/* Right */}
          <div className="lp__detailRight">
            <div className="lp__detailImgWrap">
              <div style={{ width: "100%" }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>Resumen de tu compra</div>

                <div style={{ fontSize: 13, color: "rgba(15,23,42,0.70)", lineHeight: 1.55 }}>
                  ✅ Producto: <strong>{state.title || "Tu producto"}</strong>
                  <br />
                  ✅ Plan: <strong>{planLabel(state.plan)}</strong>
                  <br />
                  ✅ Pagaste: <strong>${state.amountPaid ?? "-"}</strong>
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
                  Tip: Pega este link en tu “Mensaje fijo” de WhatsApp para que siempre lo vean.
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
                  <div style={{ fontWeight: 950, marginBottom: 6 }}>Ideas para vender más</div>
                  • Publica 3–5 productos primero<br />
                  • Usa fotos claras<br />
                  • Comparte tu link en grupos
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}