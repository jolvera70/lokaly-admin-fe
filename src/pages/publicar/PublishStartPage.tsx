import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../LandingPage.css";

import { sendPublicOtp, getPublishSession } from "../../api";
import {
  clearPublishFlow,
  getCooldownLeft,
  hasPendingOtp,
  loadPublishFlow,
  savePublishFlow,
} from "../../publicFlow";

function onlyDigits(v: string) {
  return v.replace(/\D+/g, "");
}

function normalizeMxPhone(raw: string) {
  const d = onlyDigits(raw);
  if (d.length === 12 && d.startsWith("52")) return d.slice(2);
  return d;
}

function formatMxPhone(digits: string) {
  const d = onlyDigits(digits).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
}

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim().toLowerCase());
}

function maskEmail(email: string) {
  const e = email.trim();
  const [u, d] = e.split("@");
  if (!u || !d) return e;
  const uMasked = u.length <= 2 ? `${u[0]}*` : `${u.slice(0, 2)}***`;
  const dParts = d.split(".");
  const first = dParts[0] ?? "";
  const rest = dParts.slice(1).join(".");
  const firstMasked = first.length <= 2 ? `${first[0]}*` : `${first.slice(0, 2)}***`;
  return `${uMasked}@${firstMasked}${rest ? "." + rest : ""}`;
}

function mapOtpSendError(err: any): { message: string; cooldownSeconds?: number } {
  const raw = err?.message ?? err?.toString?.() ?? "";
  let msg: any = raw;

  try {
    if (typeof raw === "string" && raw.trim().startsWith("{")) {
      const parsed = JSON.parse(raw);
      msg = parsed?.message ?? raw;
    }
  } catch {}

  const text = String(msg ?? "");
  const m = text.match(/COOLDOWN_(\d+)/);
  if (m) {
    const seconds = Number(m[1]);
    return {
      message: `Espera ${seconds}s para volver a solicitar el código.`,
      cooldownSeconds: seconds,
    };
  }

  return { message: "No se pudo enviar el código. Intenta de nuevo." };
}

export function PublishStartPage() {
  const navigate = useNavigate();

  // 👇 hoy el canal real será EMAIL (phone lo guardas para WhatsApp/SMS futuro)
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState(""); // 0-10 dígitos

  const [touched, setTouched] = useState<{ phone: boolean; email: boolean }>({
    phone: false,
    email: false,
  });

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // ✅ Boot: si hay sesión => /producto
  // si hay OTP pendiente => /verificar
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const session = await getPublishSession();
        if (!alive) return;

        if (session) {
          clearPublishFlow();
          navigate("/publicar/producto", { replace: true });
          return;
        }

        const flow = loadPublishFlow();
        if (flow?.email) setEmail(flow.email);
        if (flow?.phoneLocal) setPhone(flow.phoneLocal);

const otpPending = hasPendingOtp(flow);

// Ajusta este TTL a lo que uses en backend (ej 10 min)
const OTP_TTL_MS = 10 * 60 * 1000;

const otpFresh =
  !!flow?.otpSessionId &&
  !!flow?.otpRequestedAt &&
  (Date.now() - Number(flow.otpRequestedAt)) < OTP_TTL_MS;

if (otpPending && !otpFresh) {
  clearPublishFlow(); // 🔥 rompe loops por OTP viejo
}

        if (hasPendingOtp(flow)) {
          navigate("/publicar/verificar", {
            state: {
              phoneE164: flow!.phoneE164,
              phoneLocal: flow!.phoneLocal,
              email: flow!.email,
              otpSessionId: flow!.otpSessionId,
              cooldownSeconds: getCooldownLeft(flow),
              channel: flow!.channel ?? "email",
            },
          });
          return;
        }

        setCooldown(getCooldownLeft(flow));
      } finally {
        if (alive) setCheckingSession(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [navigate]);

  // countdown UI
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const normalizedPhone = useMemo(() => normalizeMxPhone(phone), [phone]);
  const phoneValid = normalizedPhone.length === 10;
  const emailValid = isValidEmail(email);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ phone: true, email: true });
    setErr(null);

    if (!phoneValid || !emailValid || loading || cooldown > 0) return;

    const phoneE164 = `+52${normalizedPhone}`;
    const emailNorm = email.trim().toLowerCase();

    setLoading(true);

    try {
      // ✅ Hoy: envías OTP por EMAIL (aunque tu función se llame sendPublicOtp)
      // Ideal: cambiar el backend para aceptar (phoneE164 + email) y decidir canal.
      // Ejemplo:
      // const resp = await sendPublicOtp({ phoneE164, email: emailNorm, channel: "email" });
      //
      // Por ahora: mantengo tu llamada actual para no romper (pero el flujo/UX ya asume email)
      const resp = await sendPublicOtp(phoneE164, emailNorm);

      const nextCooldown = resp.cooldownSeconds ?? 60;

      savePublishFlow({
        phoneE164: resp.phoneE164 ?? phoneE164,
        phoneLocal: normalizedPhone,
        email: emailNorm,
        otpSessionId: resp.otpSessionId,
        cooldownSeconds: nextCooldown,
        otpRequestedAt: Date.now(),
        verified: false,
        channel: "email",
      });

      navigate("/publicar/verificar", {
        replace: true,
        state: {
          phoneE164: resp.phoneE164 ?? phoneE164,
          phoneLocal: normalizedPhone,
          email: emailNorm,
          otpSessionId: resp.otpSessionId,
          cooldownSeconds: nextCooldown,
          channel: "email",
        },
      });
    } catch (e: any) {
      const mapped = mapOtpSendError(e);
      setErr(mapped.message);
      if (mapped.cooldownSeconds) setCooldown(mapped.cooldownSeconds);
    } finally {
      setLoading(false);
    }
  }

  const disabled = checkingSession || !phoneValid || !emailValid || loading || cooldown > 0;

  return (
    <div className="lp">
      <header className="lp__header">
        <div className="lp__headerInner">
          <div className="lp__brand">
            <div className="lp__brandText">Lokaly</div>
          </div>
        </div>
      </header>

      <main className="lp__main">
        <section className="lp__detail lp__detail--publish">
          <div className="lp__detailLeft">
            <div className="lp__detailKicker">Publica tu producto</div>
            <div className="lp__detailTitle">Verifica tu cuenta</div>
            <div className="lp__detailText">
              Te enviaremos un código a tu correo para continuar.
            </div>

            <form onSubmit={onSubmit} className="lp__form">
              {/* ✅ EMAIL (obligatorio) — compacto y con mejor copy */}
              <label className="lp__label lp__label--muted">
                Correo para recibir el código
              </label>

              <input
                id="email"
                className="lp__input lp__input--compact"
                inputMode="email"
                autoComplete="email"
                placeholder="tucorreo@dominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              />

              <div className="lp__hint">
                Ahí te llegará el código de verificación.
              </div>

              {/* 📱 PHONE (lo conservas para WhatsApp futuro / identidad) */}
              <label className="lp__label lp__label--muted" htmlFor="phone" style={{ marginTop: 12 }}>
                WhatsApp (México)
              </label>

              <div className="lp__phoneRow">
                <div className="lp__countryChip" aria-label="México +52">
                  <span className="lp__flag" aria-hidden="true">
                    🇲🇽
                  </span>
                  <span className="lp__dial">+52</span>
                </div>

                <input
                  id="phone"
                  className="lp__input lp__input--phone"
                  inputMode="tel"
                  autoComplete="tel"
                  value={formatMxPhone(phone)}
                  onChange={(e) => setPhone(onlyDigits(e.target.value).slice(0, 10))}
                  onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
                />
              </div>

              <div className="lp__hint lp__hint--tight">Ejemplo: 477 123 4567</div>

              {/* Estados */}
              {checkingSession ? (
                <div className="lp__meta">Verificando sesión…</div>
              ) : err ? (
                <div className="lp__error">⚠️ {err}</div>
              ) : touched.email && !emailValid ? (
                <div className="lp__error">Ingresa un correo válido.</div>
              ) : touched.phone && !phoneValid ? (
                <div className="lp__error">Ingresa un número válido de 10 dígitos.</div>
              ) : cooldown > 0 ? (
                <div className="lp__meta">⏳ Puedes solicitar otro código en {cooldown}s.</div>
              ) : (
                <div className="lp__meta">
                  🔒 Enviaremos el código a{" "}
                  <strong>{emailValid ? maskEmail(email) : "tu correo"}</strong>.
                </div>
              )}

              <button
                className="lp__btn lp__btn--primary lp__btn--block"
                type="submit"
                disabled={disabled}
              >
                {checkingSession
                  ? "Verificando…"
                  : loading
                  ? "Enviando código..."
                  : cooldown > 0
                  ? `Reintenta en ${cooldown}s`
                  : "Continuar"}
              </button>

              <div className="lp__hint" style={{ marginTop: 10 }}>
                Al continuar, aceptas recibir un código de verificación para completar tu registro.
              </div>
            </form>
          </div>

          <div className="lp__detailRight" />
        </section>
      </main>
    </div>
  );
}