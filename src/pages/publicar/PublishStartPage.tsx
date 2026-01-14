import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../LandingPage.css";
import logoMark from "../../assets/brand/lokaly-mark.svg";

import { sendPublicOtp } from "../../api";
import { loadPublishFlow, savePublishFlow } from "../../publicFlow";

function onlyDigits(v: string) {
  return v.replace(/\D+/g, "");
}

function normalizeMxPhone(raw: string) {
  const d = onlyDigits(raw);
  if (d.length === 12 && d.startsWith("52")) return d.slice(2);
  return d;
}

function prettyPhone(d10: string) {
  const d = onlyDigits(d10).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

export function PublishStartPage() {
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ✅ solo UX: precargar input
  useEffect(() => {
    const flow = loadPublishFlow();
    if (flow?.phoneLocal) setPhone(flow.phoneLocal);
  }, []);

  const normalized = useMemo(() => normalizeMxPhone(phone), [phone]);
  const isValid = normalized.length === 10;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setErr(null);
    if (!isValid || loading) return;

    const phoneE164 = `+52${normalized}`;

    setLoading(true);
    try {
      // ✅ IMPORTANTE: sendPublicOtp debe usar credentials: "include"
      const resp = await sendPublicOtp(phoneE164);

      // ✅ solo UX (precarga y cache de cooldown), NO seguridad
      savePublishFlow({
        phoneE164: resp.phoneE164 ?? phoneE164,
        phoneLocal: normalized,
        otpSessionId: resp.otpSessionId,
        cooldownSeconds: resp.cooldownSeconds ?? 60,
        verified: false,
      });

      navigate("/publicar/verificar", {
        replace: true,
        state: {
          phoneE164: resp.phoneE164 ?? phoneE164,
          phoneLocal: normalized,
          otpSessionId: resp.otpSessionId,
          cooldownSeconds: resp.cooldownSeconds ?? 60,
        },
      });
    } catch (e: any) {
      setErr(e?.message || "No se pudo enviar el código. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
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
            <div className="lp__detailKicker">Publica tu producto</div>
            <div className="lp__detailTitle">Ingresa tu WhatsApp</div>
            <div className="lp__detailText">
              Te enviaremos un código para confirmar tu número. No necesitas contraseña.
            </div>

            <form onSubmit={onSubmit} style={{ marginTop: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 900,
                  color: "rgba(15, 23, 42, 0.75)",
                  marginBottom: 8,
                }}
              >
                WhatsApp
              </label>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  border: "1px solid rgba(15,23,42,0.14)",
                  borderRadius: 14,
                  padding: "10px 12px",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    fontWeight: 900,
                    color: "rgba(15,23,42,0.75)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    paddingRight: 8,
                    borderRight: "1px solid rgba(15,23,42,0.10)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span aria-hidden>🇲🇽</span>
                  <span>+52</span>
                </div>

                <input
                  value={prettyPhone(phone)}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => setTouched(true)}
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Ej. 477 123 4567"
                  style={{
                    flex: 1,
                    border: "none",
                    outline: "none",
                    fontSize: 16,
                    fontWeight: 800,
                    color: "#0f172a",
                    background: "transparent",
                  }}
                />
              </div>

              {err ? (
                <div style={{ marginTop: 8, fontSize: 12, color: "rgba(220,38,38,0.95)", fontWeight: 800 }}>
                  {err}
                </div>
              ) : touched && !isValid ? (
                <div style={{ marginTop: 8, fontSize: 12, color: "rgba(220,38,38,0.95)", fontWeight: 800 }}>
                  Ingresa un número válido de 10 dígitos (México).
                </div>
              ) : (
                <div style={{ marginTop: 8, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                  🔒 Te enviaremos un código por WhatsApp.
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
                {loading ? "Enviando código..." : "Continuar"}
              </button>

              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                ✨ No necesitas contraseña · Es rápido y seguro
              </div>
            </form>
          </div>

          <div className="lp__detailRight">
            <div className="lp__detailImgWrap">
              <div style={{ width: "100%" }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>¿Qué sigue?</div>
                <div style={{ fontSize: 13, color: "rgba(15,23,42,0.68)", lineHeight: 1.45 }}>
                  1) Confirmas tu WhatsApp <br />
                  2) Subes foto + precio <br />
                  3) Pagas y publicas (30 días)
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
                  Tip: Usa un número que sí tenga WhatsApp.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}