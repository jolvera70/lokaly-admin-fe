import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../LandingPage.css";
import logoMark from "../../assets/brand/lokaly-mark.svg";

import { sendPublicOtp, verifyPublicOtp } from "../../api";
import { loadPublishFlow, savePublishFlow, clearPublishFlow } from "../../publicFlow";

type LocationState = {
  phoneE164?: string;
  phoneLocal?: string;
  otpSessionId?: string;
  cooldownSeconds?: number;
};

function onlyDigits(v: string) {
  return v.replace(/\D+/g, "");
}

function maskPhoneE164(phoneE164: string) {
  const d = phoneE164.replace("+", "");
  if (d.length < 12) return phoneE164;
  const local = d.slice(2);
  return `+52 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 8)}${local.slice(8)}`;
}

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as LocationState;

  const [phoneE164, setPhoneE164] = useState<string | undefined>(state.phoneE164);
  const [phoneLocal, setPhoneLocal] = useState<string | undefined>(state.phoneLocal);
  const [otpSessionId, setOtpSessionId] = useState<string | undefined>(state.otpSessionId);
  const [cooldown, setCooldown] = useState<number>(state.cooldownSeconds ?? 60);

  const [code, setCode] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const codeDigits = useMemo(() => onlyDigits(code).slice(0, 6), [code]);
  const isValid = codeDigits.length === 6;

  // ✅ INIT: resolver datos desde storage/state y si falta otpSessionId pedir uno
  useEffect(() => {
    const flow = loadPublishFlow();

    const resolvedPhoneE164 = phoneE164 ?? flow?.phoneE164;
    const resolvedPhoneLocal = phoneLocal ?? flow?.phoneLocal;
    const resolvedSessionId = otpSessionId ?? flow?.otpSessionId;
    const resolvedCooldown = state.cooldownSeconds ?? flow?.cooldownSeconds ?? cooldown;

    // sin teléfono => volver al inicio
    if (!resolvedPhoneE164 || !resolvedPhoneLocal) {
      navigate("/publicar", { replace: true });
      return;
    }

    // sync estado
    if (!phoneE164) setPhoneE164(resolvedPhoneE164);
    if (!phoneLocal) setPhoneLocal(resolvedPhoneLocal);
    if (cooldown !== resolvedCooldown) setCooldown(resolvedCooldown);

    // si NO hay otpSessionId -> pedir uno (refresh raro)
    if (!resolvedSessionId) {
      (async () => {
        try {
          setLoading(true);
          setError(null);

          const resp = await sendPublicOtp(resolvedPhoneE164);

          setOtpSessionId(resp.otpSessionId);
          setCooldown(resp.cooldownSeconds ?? 60);

          // ✅ solo UX
          savePublishFlow({
            phoneE164: resp.phoneE164 ?? resolvedPhoneE164,
            phoneLocal: resolvedPhoneLocal,
            otpSessionId: resp.otpSessionId,
            cooldownSeconds: resp.cooldownSeconds ?? 60,
            verified: false,
          });
        } catch (e: any) {
          setError(e?.message || "No se pudo iniciar verificación");
        } finally {
          setLoading(false);
        }
      })();
    } else {
      if (!otpSessionId) setOtpSessionId(resolvedSessionId);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // ✅ contador
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);

    if (!isValid || loading) return;
    if (!otpSessionId || !phoneE164 || !phoneLocal) {
      setError("No hay sesión OTP. Reenvía el código.");
      return;
    }

    setLoading(true);
    try {
      // ✅ Esto debe setear cookie lokaly_pub en el BE (Set-Cookie)
      await verifyPublicOtp(otpSessionId, codeDigits);

      // ✅ solo UX (NO seguridad)
      savePublishFlow({
        phoneE164,
        phoneLocal,
        otpSessionId,
        cooldownSeconds: cooldown,
        verified: false,
      });

      // ✅ ahora el acceso real lo hace usePublishGuard/usePublishSession en /publicar/producto
      navigate("/publicar/producto", { replace: true });
    } catch (e: any) {
      setError(e?.message || "OTP inválido o expirado");
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (cooldown > 0 || loading) return;
    if (!phoneE164 || !phoneLocal) return;

    setLoading(true);
    setError(null);

    try {
      const resp = await sendPublicOtp(phoneE164);

      setOtpSessionId(resp.otpSessionId);
      setCooldown(resp.cooldownSeconds ?? 60);
      setCode("");
      setTouched(false);

      // ✅ solo UX
      savePublishFlow({
        phoneE164: resp.phoneE164 ?? phoneE164,
        phoneLocal,
        otpSessionId: resp.otpSessionId,
        cooldownSeconds: resp.cooldownSeconds ?? 60,
        verified: false,
      });
    } catch (e: any) {
      setError(e?.message || "No se pudo reenviar el código");
    } finally {
      setLoading(false);
    }
  }

  function onChangeNumber() {
    clearPublishFlow();
    navigate("/publicar", { replace: true });
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
            <Link className="lp__navLink" to="/">Home</Link>
            <a className="lp__navLink" href="/#how">Cómo funciona</a>
            <a className="lp__navLink" href="/#contact">Contacto</a>
            <button className="lp__navCta" onClick={() => navigate("/publicar")}>Publicar</button>
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
              <label style={{ display: "block", fontSize: 13, fontWeight: 900, color: "rgba(15, 23, 42, 0.75)", marginBottom: 8 }}>
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
                  background: "#fff",
                  color: "#0f172a",
                  WebkitTextFillColor: "#0f172a",
                  appearance: "none",
                }}
              />

              {error ? (
                <div style={{ marginTop: 8, fontSize: 12, color: "rgba(220,38,38,0.95)", fontWeight: 800 }}>
                  {error}
                </div>
              ) : touched && !isValid ? (
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
                disabled={!isValid || loading || !otpSessionId}
                style={{
                  marginTop: 14,
                  width: "100%",
                  opacity: !isValid || loading || !otpSessionId ? 0.7 : 1,
                  cursor: !isValid || loading || !otpSessionId ? "not-allowed" : "pointer",
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
                  onClick={onChangeNumber}
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
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}