import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  phoneE164: string; // "+52 123 456 7117"
  onVerify: (code: string) => Promise<void>;
  onResend: () => Promise<void>;
  onChangeNumber: () => void;
};

export function VerifyOtpPage({
  phoneE164,
  onVerify,
  onResend,
  onChangeNumber,
}: Props) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [resendIn, setResendIn] = useState(50); // segundos

  // ✅ Tipado recomendado
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const code = useMemo(() => digits.join(""), [digits]);
  const canVerify = code.length === 6 && !digits.includes("") && !loading;

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const maskPhone = (p: string) => {
    const last4 = p.replace(/\D/g, "").slice(-4);
    return p.startsWith("+")
      ? p.replace(/\d(?=\d{4})/g, "•")
      : `•••• ${last4}`;
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
    if (onlyNums.length > 1) {
      const next = Array(6).fill("");
      for (let k = 0; k < 6; k++) next[k] = onlyNums[k] ?? "";
      setDigits(next);
      const last = Math.min(5, onlyNums.length - 1);
      focusIndex(last);
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
      const msg =
        status === 400
          ? "El código es incorrecto o ya expiró. Intenta nuevamente."
          : "No pudimos verificar el código. Intenta otra vez.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (resendIn > 0) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      await onResend();
      setResendIn(50);
      setDigits(Array(6).fill(""));
      focusIndex(0);
    } catch {
      setErrorMsg("No pudimos reenviar el código. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.brandRow}>
          <div style={styles.brandDot} />
          <div>
            <div style={styles.brandName}>Lokaly</div>
            <div style={styles.brandTag}>Confirmación</div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.title}>Ingresa el código</div>
          <div style={styles.subtitle}>
            Enviamos un código a <b>{maskPhone(phoneE164)}</b>
          </div>

          {errorMsg && (
            <div style={styles.errorBox} role="alert" aria-live="polite">
              <span style={{ fontWeight: 700 }}>❌</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <div style={styles.otpRow} aria-label="Código de verificación">
            {digits.map((d, i) => (
              <input
                key={i}
                // ✅ FIX: callback ref NO debe retornar nada
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
                  ...styles.otpBox,
                  borderColor: errorMsg ? "#fca5a5" : "#e5e7eb",
                  boxShadow: d ? "0 0 0 4px rgba(59,130,246,0.12)" : "none",
                }}
              />
            ))}
          </div>

          <button
            onClick={submit}
            disabled={!canVerify}
            style={{
              ...styles.primaryBtn,
              opacity: canVerify ? 1 : 0.55,
              cursor: canVerify ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Verificando…" : "Verificar"}
          </button>

          <div style={styles.actionsRow}>
            <button
              onClick={resend}
              disabled={resendIn > 0 || loading}
              style={styles.linkBtn}
            >
              {resendIn > 0 ? `Reenviar en ${resendIn}s` : "Reenviar código"}
            </button>

            <span style={styles.dotSep}>•</span>

            <button
              onClick={onChangeNumber}
              disabled={loading}
              style={styles.linkBtn}
            >
              Cambiar número
            </button>
          </div>

          <div style={styles.tip}>
            Tip: Si no llega, revisa tu conexión de WhatsApp o intenta reenviar.
          </div>
        </div>

        <div style={styles.footer}>
          <span style={styles.footerText}>Seguro y rápido • No compartimos tu código</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background:
      "radial-gradient(1200px 600px at 50% -10%, rgba(59,130,246,0.18), transparent 60%), linear-gradient(#0b1220, #070b12)",
    padding: 18,
  },
  shell: { width: "100%", maxWidth: 420 },
  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    paddingLeft: 6,
  },
  brandDot: {
    width: 38,
    height: 38,
    borderRadius: 12,
    background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
    boxShadow: "0 10px 30px rgba(245,158,11,0.25)",
  },
  brandName: { color: "white", fontWeight: 800, fontSize: 18, lineHeight: 1.1 },
  brandTag: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },
  card: {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 18,
    padding: 18,
    boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
    backdropFilter: "blur(10px)",
  },
  title: { color: "white", fontSize: 22, fontWeight: 900, letterSpacing: -0.3 },
  subtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    marginTop: 6,
    marginBottom: 14,
    lineHeight: 1.45,
  },
  errorBox: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(239,68,68,0.14)",
    border: "1px solid rgba(239,68,68,0.35)",
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    marginBottom: 12,
  },
  otpRow: {
    display: "grid",
    gridTemplateColumns: "repeat(6, 1fr)",
    gap: 10,
    marginBottom: 14,
  },
  otpBox: {
    height: 52,
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "rgba(255,255,255,0.92)",
    color: "#0b1220",
    fontSize: 20,
    fontWeight: 800,
    textAlign: "center",
    outline: "none",
  },
  primaryBtn: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    border: "none",
    fontWeight: 800,
    fontSize: 16,
    color: "#0b1220",
    background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
    boxShadow: "0 16px 40px rgba(245,158,11,0.20)",
  },
  actionsRow: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
  },
  linkBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.80)",
    fontSize: 13,
    cursor: "pointer",
    padding: 6,
  },
  dotSep: { color: "rgba(255,255,255,0.35)" },
  tip: {
    marginTop: 14,
    padding: "10px 12px",
    borderRadius: 12,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.10)",
    color: "rgba(255,255,255,0.72)",
    fontSize: 12.5,
    lineHeight: 1.4,
  },
  footer: { textAlign: "center", marginTop: 12 },
  footerText: { color: "rgba(255,255,255,0.45)", fontSize: 12 },
};