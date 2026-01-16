import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../LandingPage.css";
import logoMark from "../../assets/brand/lokaly-mark.svg";

type Props = {
  phoneE164: string;
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onChangeNumber: () => void;
  initialCooldownSeconds?: number;
};

export function VerifyOtpPage({
  phoneE164,
  onVerify,
  onResend,
  onChangeNumber,
  initialCooldownSeconds = 50,
}: Props) {
  const navigate = useNavigate();

  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(initialCooldownSeconds);

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const code = useMemo(() => digits.join(""), [digits]);
  const canVerify = code.length === 6 && !digits.includes("") && !loading;

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  useEffect(() => {
  setResendIn(initialCooldownSeconds);
}, [initialCooldownSeconds]);

  const maskPhone = (p: string) => {
    const last4 = p.replace(/\D/g, "").slice(-4);
    return `•••• •••• ${last4}`;
  };

  const focusIndex = (i: number) => inputsRef.current[i]?.focus();

  const setDigitAt = (i: number, val: string) => {
    setDigits((prev) => {
      const next = [...prev];
      next[i] = val;
      return next;
    });
  };

  const handleChange = (i: number, raw: string) => {
    setErrorMsg(null);

    const onlyNums = raw.replace(/\D/g, "");
    // paste 6 digits
    if (onlyNums.length > 1) {
      const next = Array(6).fill("");
      for (let k = 0; k < 6; k++) next[k] = onlyNums[k] ?? "";
      setDigits(next);
      focusIndex(Math.min(5, onlyNums.length - 1));
      return;
    }

    const d = onlyNums.slice(0, 1);
    setDigitAt(i, d);
    if (d && i < 5) focusIndex(i + 1);
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      setErrorMsg(null);
      if (digits[i]) {
        setDigitAt(i, "");
      } else if (i > 0) {
        setDigitAt(i - 1, "");
        focusIndex(i - 1);
      }
    }
    if (e.key === "ArrowLeft" && i > 0) focusIndex(i - 1);
    if (e.key === "ArrowRight" && i < 5) focusIndex(i + 1);
  };

  const submit = async () => {
    if (!canVerify) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      await onVerify(code);
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      setErrorMsg(
        status === 400
          ? "El código es incorrecto o ya expiró. Intenta nuevamente."
          : "No pudimos verificar el código. Intenta otra vez."
      );
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0 || loading) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      await onResend();
      setDigits(Array(6).fill(""));
      focusIndex(0);
    } catch {
      setErrorMsg("No pudimos reenviar el código. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lp">
      {/* Header consistente */}
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
            <div className="lp__detailTitle">Ingresa el código</div>
            <div className="lp__detailText">
              Enviamos un código a <b>{maskPhone(phoneE164)}</b>
            </div>

            {errorMsg && (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(220,38,38,0.06)",
                  border: "1px solid rgba(220,38,38,0.18)",
                  color: "rgba(127,29,29,0.95)",
                  fontSize: 12.5,
                  fontWeight: 800,
                }}
                role="alert"
              >
                <span aria-hidden>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: 10,
                }}
                aria-label="Código de verificación"
              >
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => {
                      inputsRef.current[i] = el;
                    }}
                    value={d}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    aria-label={`Dígito ${i + 1}`}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    style={{
                      height: 52,
                      borderRadius: 14,
                      border: errorMsg
                        ? "1px solid rgba(220,38,38,0.35)"
                        : "1px solid rgba(15,23,42,0.14)",
                      background: "#fff",
                      color: "#0f172a",
                      fontSize: 20,
                      fontWeight: 900,
                      textAlign: "center",
                      outline: "none",
                      boxShadow: d ? "0 0 0 4px rgba(37,99,235,0.10)" : "none",
                    }}
                  />
                ))}
              </div>

              <button
                className="lp__btn lp__btn--primary"
                onClick={submit}
                disabled={!canVerify}
                style={{
                  marginTop: 14,
                  width: "100%",
                  opacity: canVerify ? 1 : 0.7,
                  cursor: canVerify ? "pointer" : "not-allowed",
                }}
              >
                {loading ? "Verificando..." : "Verificar"}
              </button>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 12.5,
                  color: "rgba(15,23,42,0.65)",
                  fontWeight: 800,
                }}
              >
                <button
                  type="button"
                  onClick={resend}
                  disabled={resendIn > 0 || loading}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "rgba(37,99,235,0.95)",
                    fontWeight: 900,
                    cursor: resendIn > 0 || loading ? "not-allowed" : "pointer",
                    padding: 6,
                  }}
                >
                  {resendIn > 0 ? `Reenviar en ${resendIn}s` : "Reenviar código"}
                </button>

                <span style={{ opacity: 0.5 }}>•</span>

                <button
                  type="button"
                  onClick={onChangeNumber}
                  disabled={loading}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "rgba(15,23,42,0.8)",
                    fontWeight: 900,
                    cursor: loading ? "not-allowed" : "pointer",
                    padding: 6,
                  }}
                >
                  Cambiar número
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                🔒 Seguro y rápido · No compartimos tu código
              </div>
            </div>
          </div>

          <div className="lp__detailRight">
            <div className="lp__detailImgWrap">
              <div style={{ width: "100%" }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>Tip</div>
                <div style={{ fontSize: 13, color: "rgba(15,23,42,0.68)", lineHeight: 1.45 }}>
                  Si no llega, revisa tu conexión de WhatsApp o intenta reenviar.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}