// src/pages/publicar/PublishSuccessPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../LandingPage.css";
import logoMark from "../../assets/brand/lokaly-mark.svg";
import { usePublishGuard } from "../../hooks/usePublishGuard";
import { getMyPublisherCatalog } from "../../api"; // ✅ ADD

type PlanKey = "ONE" | "PACK3" | "PACK5" | "PACK10";

type SuccessState = {
  catalogUrl?: string;
  amountPaid?: number;
  plan?: PlanKey;
  title?: string;

  credits?: number;
  creditsUsed?: number;
  creditsLeft?: number;

  imagesCount?: number;

  phoneE164?: string;
  phoneLocal?: string;
};

function planLabel(plan?: PlanKey) {
  if (plan === "ONE") return "1 publicación · 30 días";
  if (plan === "PACK3") return "3 publicaciones · 30 días";
  if (plan === "PACK5") return "5 publicaciones · 30 días";
  if (plan === "PACK10") return "10 publicaciones · 30 días";
  return "Publicación";
}

function planCreditsFallback(plan?: PlanKey) {
  if (plan === "ONE") return 1;
  if (plan === "PACK3") return 3;
  if (plan === "PACK5") return 5;
  if (plan === "PACK10") return 10;
  return 1;
}

export default function PublishSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as SuccessState;

  const { ok, phoneE164, phoneLocal, loading } = usePublishGuard({
    redirectTo: "/publicar",
  });

  const [copied, setCopied] = useState(false);

  // ✅ ahora catalogUrl es “resuelto”, no solo state
  const [catalogUrl, setCatalogUrl] = useState<string>(state.catalogUrl || "");
  const [resolving, setResolving] = useState(false);

  // ✅ Resolver catalogUrl real desde BE si falta o está mal
  useEffect(() => {
    if (loading) return;
    if (!ok) return;

    let alive = true;

    (async () => {
      try {
        setResolving(true);

        // (opcional) log para ver qué trae el state
        console.log("state.catalogUrl =>", state.catalogUrl);

        const catalog = await getMyPublisherCatalog().catch(() => null);
        console.log("getMyPublisherCatalog() =>", catalog);

        const c: any = catalog;

        const slug =
          c?.catalogSlug ??
          c?.publicSlug ??
          c?.slug ??
          null;

        if (!slug) throw new Error("CATALOG_SLUG_MISSING");

        const url = `https://lokaly.site/catalog/${slug}`;

        if (!alive) return;
        setCatalogUrl(url);
      } catch (e) {
        console.log("error resolving catalog url", e);
        if (!alive) return;
        navigate("/publicar/mis-productos", { replace: true });
      } finally {
        if (alive) setResolving(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [loading, ok, state.catalogUrl, navigate]);

  const creditsPurchased = useMemo(() => {
    if (typeof state.credits === "number") return state.credits;
    return planCreditsFallback(state.plan);
  }, [state.credits, state.plan]);

  const creditsLeft = useMemo(() => {
    if (typeof state.creditsLeft === "number") return Math.max(0, state.creditsLeft);
    if (typeof state.creditsUsed === "number") return Math.max(0, creditsPurchased - state.creditsUsed);
    return Math.max(0, creditsPurchased - 1);
  }, [state.creditsLeft, state.creditsUsed, creditsPurchased]);

  const isPack = creditsPurchased > 1;

  async function onCopy() {
    if (!catalogUrl) return;
    try {
      await navigator.clipboard.writeText(catalogUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
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
    if (phoneE164 && phoneLocal) {
      navigate("/publicar/producto", { state: { phoneE164, phoneLocal } });
      return;
    }
    navigate("/publicar");
  }

  if (loading) return null;
  if (!ok) return null;

  // ✅ mientras resolvemos el link real (cuando state venía mal)
  if (!catalogUrl || resolving) {
    return (
      <div className="lp">
        <div style={{ maxWidth: 900, margin: "0 auto", padding: 24, fontWeight: 900 }}>
          Preparando tu link…
        </div>
      </div>
    );
  }

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
          {/* Left */}
          <div className="lp__detailLeft">
            <div className="lp__detailKicker">Listo</div>
            <div className="lp__detailTitle">🎉 ¡Tu publicación ya está activa!</div>
            <div className="lp__detailText">Comparte tu link para empezar a recibir pedidos por WhatsApp.</div>

            {/* ✅ Credits banner */}
            <div
              style={{
                marginTop: 12,
                padding: 12,
                borderRadius: 16,
                border: "1px solid rgba(15,23,42,0.10)",
                background: "rgba(37,99,235,0.06)",
                color: "rgba(15,23,42,0.78)",
                fontSize: 12,
                fontWeight: 900,
                lineHeight: 1.45,
              }}
            >
              {isPack ? (
                <>
                  ✅ Te quedan <span style={{ color: "#0f172a" }}>{creditsLeft}</span>{" "}
                  {creditsLeft === 1 ? "publicación" : "publicaciones"} en tu paquete.
                  <br />
                  Tip: aprovecha y sube tus productos más vendidos hoy.
                </>
              ) : (
                <>
                  ✅ Tu publicación quedará activa <strong>30 días</strong>.
                  <br />
                  Tip: si vas a subir varios productos, conviene un paquete.
                </>
              )}
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
              <div style={{ fontSize: 12, fontWeight: 950, color: "rgba(15,23,42,0.65)" }}>Tu catálogo</div>

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
                <button className="lp__btn lp__btn--ghost" type="button" onClick={onCopy} style={{ flex: "1 1 180px" }}>
                  {copied ? "✅ Copiado" : "Copiar link"}
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                Tus clientes te escribirán directo por WhatsApp.
              </div>
            </div>

            {/* Primary CTA */}
            <button className="lp__btn lp__btn--primary" type="button" onClick={onPublishAnother} style={{ marginTop: 14, width: "100%" }}>
              ➕ {creditsLeft > 0 ? "Publicar otro producto" : "Publicar otro producto (comprar paquete)"}
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
                  <br />
                  {typeof state.imagesCount === "number" ? (
                    <>
                      ✅ Fotos: <strong>{state.imagesCount}</strong>
                      <br />
                    </>
                  ) : null}
                  {isPack ? (
                    <>
                      ✅ Créditos comprados: <strong>{creditsPurchased}</strong>
                      <br />
                      ✅ Te quedan: <strong>{creditsLeft}</strong>
                    </>
                  ) : null}
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
                  • Publica 3–5 productos primero
                  <br />
                  • Usa fotos claras
                  <br />
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