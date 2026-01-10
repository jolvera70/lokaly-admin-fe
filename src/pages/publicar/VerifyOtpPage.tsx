import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../LandingPage.css";

type LocationState = {
  phoneE164?: string;   // +524771234567
  phoneLocal?: string;  // 4771234567
};

function onlyDigits(v: string) {
  return v.replace(/\D+/g, "");
}

function maskPhoneE164(phoneE164: string) {
  // +52XXXXXXXXXX -> +52 XXX XXX XX67
  const d = phoneE164.replace("+", "");
  if (d.length < 12) return phoneE164;
  const local = d.slice(2); // 10
  return `+52 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)}${local.slice(8)}`;
}

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const phoneE164 = state.phoneE164;
  const phoneLocal = state.phoneLocal;

  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);

  // reenviar
  const [cooldown, setCooldown] = useState(30);

  const codeDigits = useMemo(() => onlyDigits(code).slice(0, 6), [code]);
  const isValid = codeDigits.length === 6;

  useEffect(() => {
    // Si alguien entra directo sin pasar por /publicar
    if (!phoneE164 || !phoneLocal) {
      navigate("/publicar", { replace: true });
      return;
    }
  }, [phoneE164, phoneLocal, navigate]);

  useEffect(() => {
    // countdown
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!isValid || loading) return;

    setLoading(true);
    try {
      // Aquí llamas tu API real:
      // await api.verifyOtp({ phone: phoneE164!, code: codeDigits })

      // Si OK -> siguiente pantalla:
      navigate("/publicar/producto", {
        state: { phoneE164, phoneLocal },
      });
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (cooldown > 0) return;

    setLoading(true);
    try {
      // Aquí llamas tu API real:
      // await api.sendOtp({ phone: phoneE164! })

      setCooldown(30);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="lp">
      {/* Header igual al landing */}
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
          <div className="lp__detailLeft">
            <div className="lp__detailKicker">Confirma tu WhatsApp</div>
            <div className="lp__detailTitle">Ingresa el código</div>
            <div className="lp__detailText">
              Te enviamos un código a <strong>{phoneE164 ? maskPhoneE164(phoneE164) : ""}</strong>.
            </div>

            <form onSubmit={onVerify} style={{ marginTop: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 900,
                  color: "rgba(15, 23, 42, 0.75)",
                  marginBottom: 8,
                }}
              >
                Código de verificación
              </label>

              <input
                value={codeDigits}
                onChange={(e) => setCode(e.target.value)}
                onBlur={() => setTouched(true)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="000000"
                style={{
                  width: "100%",
                  border: "1px solid rgba(15,23,42,0.14)",
                  borderRadius: 14,
                  padding: "12px 14px",
                  fontSize: 18,
                  fontWeight: 900,
                  letterSpacing: "0.18em",
                  outline: "none",
                }}
              />

              {touched && !isValid ? (
                <div style={{ marginTop: 8, fontSize: 12, color: "rgba(220,38,38,0.95)", fontWeight: 800 }}>
                  Ingresa el código de 6 dígitos.
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                  🔒 Código de 6 dígitos.
                </div>
              )}

              <button
                className="lp__btn lp__btn--primary"
                type="submit"
                disabled={!isValid || loading}
                style={{
                  marginTop: 14,
                  width: "100%",
                  opacity: !isValid || loading ? 0.7 : 1,
                  cursor: !isValid || loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Verificando..." : "Verificar"}
              </button>

              <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={onResend}
                  disabled={cooldown > 0 || loading}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: cooldown > 0 || loading ? "not-allowed" : "pointer",
                    fontWeight: 900,
                    color: cooldown > 0 ? "rgba(15,23,42,0.45)" : "rgba(37,99,235,0.95)",
                  }}
                >
                  Reenviar código{cooldown > 0 ? ` (${cooldown}s)` : ""}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/publicar")}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    fontWeight: 900,
                    color: "rgba(15,23,42,0.70)",
                  }}
                >
                  Cambiar número
                </button>
              </div>
            </form>
          </div>

          <div className="lp__detailRight">
            <div className="lp__detailImgWrap">
              <div style={{ width: "100%" }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>Siguiente paso</div>
                <div style={{ fontSize: 13, color: "rgba(15,23,42,0.68)", lineHeight: 1.45 }}>
                  Cuando confirmes tu WhatsApp podrás:
                  <br />
                  1) Subir foto + precio
                  <br />
                  2) Pagar y publicar 30 días
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
                  Tip: Si no llega, revisa tu conexión de WhatsApp.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}