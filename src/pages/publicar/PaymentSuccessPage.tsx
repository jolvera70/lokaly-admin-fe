// src/pages/publicar/PaymentSuccessPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "../LandingPage.css";

import logoMark from "../../assets/brand/lokaly-mark.svg";
import { confirmCheckout, getCheckoutOrder, publishCatalogProduct } from "../../api";

type Status = "loading" | "paid" | "pending" | "error";

function readPendingPayment(): any | null {
  try {
    const raw = localStorage.getItem("lokaly_pending_payment_v1");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function clearPendingPayment() {
  try {
    localStorage.removeItem("lokaly_pending_payment_v1");
  } catch {}
}

export function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  // ✅ vienen del successUrl que ya generas en el BE:
  // /publicar/pago-exito?orderId=...&session_id={CHECKOUT_SESSION_ID}
  const orderId = params.get("orderId") || "";
  const sessionId = params.get("session_id") || "";
  const token = params.get("t") || "";

  const [status, setStatus] = useState<Status>("loading");
  const [credits, setCredits] = useState<number | null>(null);
  const [detail, setDetail] = useState<string | null>(null);

  const pending = useMemo(() => readPendingPayment(), []);
  const hasContext = Boolean(pending?.productId);
  

  useEffect(() => {

    if (!orderId || !sessionId) {
      setStatus("error");
      setDetail("Faltan datos para confirmar el pago (orderId/session_id).");
      return;
    }

    let alive = true;
    let attempts = 0;
    const maxAttempts = 10;

const poll = async () => {
  if (!alive) return;

  try {
    // 1) Intenta confirmar (aplica créditos / idempotente)
    const res = await confirmCheckout(orderId, sessionId);
    if (!alive) return;

    if (res.status === "PAID") {
      setStatus("paid");
      setCredits(res.credits ?? null);
      setDetail(null);
  // ✅ si venías de "pagar para publicar este producto"
  if (pending?.productId) {
    try {
      await publishCatalogProduct(pending.productId);
      clearPendingPayment();
      // opcional: redirigir directo al listado o al dashboard
      navigate("/publicar", { replace: true });
      return;
    } catch (err: any) {
      // OJO: pago OK pero publicar falló
      setDetail(
        "El pago se confirmó, pero no pudimos publicar tu producto automáticamente. " +
        "Vuelve a /publicar e inténtalo otra vez."
      );
      // NO borres el pending, para que el usuario pueda reintentar
      return;
    }
  }      
      clearPendingPayment();
      return;
    }

    if (res.status === "FAILED" || res.status === "CANCELLED" || res.status === "EXPIRED") {
      setStatus("error");
      setDetail(`El pago terminó en estado: ${res.status}`);
      return;
    }

    // sigue pendiente
    attempts++;
    if (attempts < maxAttempts) setTimeout(poll, 2000);
    else {
      setStatus("pending");
      setDetail(null);
    }
    return;
  } catch (e: any) {
    if (!alive) return;

    // 2) Fallback: consulta el estado usando token (?t=...)
    try {
      const order = await getCheckoutOrder(orderId, token);
      if (!alive) return;

      if (order.status === "PAID") {
        setStatus("paid");
        setCredits(order.credits ?? null);
        setDetail(null);
        clearPendingPayment();
        return;
      }

      if (order.status === "FAILED" || order.status === "CANCELLED" || order.status === "EXPIRED") {
        setStatus("error");
        setDetail(`El pago terminó en estado: ${order.status}`);
        return;
      }

      // sigue pendiente
      attempts++;
      if (attempts < maxAttempts) setTimeout(poll, 2000);
      else {
        setStatus("pending");
        setDetail(null);
      }
      return;
    } catch (e2: any) {
      // si ni confirmar ni consultar funcionó
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
        return;
      }

      const httpStatus = e?.status ?? e?.response?.status ?? e2?.status ?? e2?.response?.status;
      const msg = String(e?.message ?? e2?.message ?? "");

      setStatus("error");
      if (httpStatus === 400) setDetail(msg || "No pudimos confirmar el pago (400).");
      else if (httpStatus === 401) setDetail("Sesión expirada. Vuelve a iniciar el flujo de publicación.");
      else setDetail(msg || "No pudimos confirmar tu pago.");
    }
  }
};
    poll();

    return () => {
      alive = false;
    };
  }, [orderId, sessionId, token]);

  // ---------- UI ----------
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
            <button className="lp__navCta" onClick={() => navigate("/publicar")}>
              Publicar
            </button>
          </nav>
        </div>
      </header>

      <main className="lp__main">
        <section className="lp__detail" style={{ marginTop: 18 }}>
          <div className="lp__detailLeft">
            {status === "loading" ? (
              <>
                <div className="lp__detailKicker">Pago</div>
                <div className="lp__detailTitle">Procesando tu pago…</div>
                <div className="lp__detailText">
                  Estamos confirmando tu pago con Stripe. Esto puede tardar unos segundos.
                </div>

                <div style={{ marginTop: 14, fontSize: 12, color: "rgba(15,23,42,0.55)", fontWeight: 800 }}>
                  Orden: <b>{orderId.slice(0, 8)}…</b>
                </div>
              </>
            ) : null}

            {status === "pending" ? (
              <>
                <div className="lp__detailKicker">Pago</div>
                <div className="lp__detailTitle">Pago en proceso ⏳</div>
                <div className="lp__detailText">
                  Tu pago fue recibido. En unos minutos se reflejará. Puedes continuar y volver más tarde si es necesario.
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <button className="lp__btn lp__btn--primary lp__btn--block" onClick={() => navigate("/publicar")}>
                    Volver a publicar
                  </button>

                  <button
                    className="lp__btn lp__btn--block"
                    onClick={() => window.location.reload()}
                    style={{
                      background: "#fff",
                      border: "1px solid rgba(15,23,42,0.12)",
                      color: "rgba(15,23,42,0.85)",
                      fontWeight: 900,
                    }}
                  >
                    Reintentar confirmación
                  </button>
                </div>
              </>
            ) : null}

            {status === "paid" ? (
              <>
                <div className="lp__detailKicker">Pago</div>
                <div className="lp__detailTitle">¡Pago exitoso! 🎉</div>

                <div
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(34,197,94,0.22)",
                    background: "rgba(34,197,94,0.08)",
                    color: "rgba(15,23,42,0.80)",
                    fontSize: 12.5,
                    fontWeight: 850,
                    lineHeight: 1.4,
                  }}
                >
                  Se agregaron <b>{credits ?? "tus"}</b> créditos a tu cuenta.
                </div>

                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <button
                    className="lp__btn lp__btn--primary lp__btn--block"
                    onClick={() => {
                      // si guardaste el contexto, puedes regresar al flujo con más intención
                      if (hasContext) {
                        navigate("/publicar", { replace: true });
                        return;
                      }
                      navigate("/publicar", { replace: true });
                    }}
                  >
                    Publicar ahora
                  </button>

                  <button
                    className="lp__btn lp__btn--block"
                    onClick={() => navigate("/", { replace: true })}
                    style={{
                      background: "#fff",
                      border: "1px solid rgba(15,23,42,0.12)",
                      color: "rgba(15,23,42,0.85)",
                      fontWeight: 900,
                    }}
                  >
                    Ir al Home
                  </button>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                  Orden: <b>{orderId.slice(0, 8)}…</b>
                </div>
              </>
            ) : null}

            {status === "error" ? (
              <>
                <div className="lp__detailKicker">Pago</div>
                <div className="lp__detailTitle">Error en el pago ❌</div>
                <div className="lp__detailText">No pudimos confirmar tu pago.</div>

                {detail ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      borderRadius: 14,
                      border: "1px solid rgba(239,68,68,0.22)",
                      background: "rgba(239,68,68,0.08)",
                      color: "rgba(15,23,42,0.80)",
                      fontSize: 12,
                      fontWeight: 850,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {detail}
                  </div>
                ) : null}

                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <button className="lp__btn lp__btn--primary lp__btn--block" onClick={() => navigate("/publicar")}>
                    Volver
                  </button>

                  <button
                    className="lp__btn lp__btn--block"
                    onClick={() => window.location.reload()}
                    style={{
                      background: "#fff",
                      border: "1px solid rgba(15,23,42,0.12)",
                      color: "rgba(15,23,42,0.85)",
                      fontWeight: 900,
                    }}
                  >
                    Reintentar
                  </button>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                  {orderId ? (
                    <>
                      Orden: <b>{orderId.slice(0, 8)}…</b>
                    </>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          <div className="lp__detailRight">
            <div className="lp__detailImgWrap">
              <div style={{ width: "100%" }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>Tip</div>
                <div style={{ fontSize: 13, color: "rgba(15,23,42,0.68)", lineHeight: 1.45 }}>
                  Si pagaste y no se refleja, normalmente es cuestión de segundos. Si tarda más, intenta reintentar o
                  vuelve a publicar.
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                  <div>
                    <b>orderId:</b> {orderId ? orderId.slice(0, 10) + "…" : "—"}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    <b>session_id:</b> {sessionId ? sessionId.slice(0, 10) + "…" : "—"}
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