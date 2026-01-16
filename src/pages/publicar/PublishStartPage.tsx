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
    return { message: `Espera ${seconds}s para volver a solicitar el código.`, cooldownSeconds: seconds };
  }

  return { message: "No se pudo enviar el código. Intenta de nuevo." };
}

export function PublishStartPage() {
  const navigate = useNavigate();

  const [phone, setPhone] = useState(""); // guardamos SOLO dígitos (0-10)
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [err, setErr] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // ✅ Boot: si hay sesión => /producto
  // si hay OTP pendiente => /verificar
  // si no => deja pedir OTP y muestra cooldown real
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
        if (flow?.phoneLocal) setPhone(flow.phoneLocal);

        if (hasPendingOtp(flow)) {
          navigate("/publicar/verificar", {
            replace: true,
            state: {
              phoneE164: flow!.phoneE164,
              phoneLocal: flow!.phoneLocal,
              otpSessionId: flow!.otpSessionId,
              cooldownSeconds: getCooldownLeft(flow),
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

  const normalized = useMemo(() => normalizeMxPhone(phone), [phone]);
  const isValid = normalized.length === 10;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setErr(null);

    if (!isValid || loading || cooldown > 0) return;

    const phoneE164 = `+52${normalized}`;
    setLoading(true);

    try {
      const resp = await sendPublicOtp(phoneE164);
      const nextCooldown = resp.cooldownSeconds ?? 60;

      savePublishFlow({
        phoneE164: resp.phoneE164 ?? phoneE164,
        phoneLocal: normalized,
        otpSessionId: resp.otpSessionId,
        cooldownSeconds: nextCooldown,
        otpRequestedAt: Date.now(),
        verified: false,
      });

      navigate("/publicar/verificar", {
        replace: true,
        state: {
          phoneE164: resp.phoneE164 ?? phoneE164,
          phoneLocal: normalized,
          otpSessionId: resp.otpSessionId,
          cooldownSeconds: nextCooldown,
        },
      });
    } catch (e: any) {
      const mapped = mapOtpSendError(e);
      setErr(mapped.message);

      if (mapped.cooldownSeconds) {
        setCooldown(mapped.cooldownSeconds);
      }
    } finally {
      setLoading(false);
    }
  }

  const disabled = checkingSession || !isValid || loading || cooldown > 0;

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
            <div className="lp__detailTitle">Ingresa tu WhatsApp</div>
            <div className="lp__detailText">Te enviaremos un código para confirmar tu número.</div>

            <form onSubmit={onSubmit} className="lp__form">
              <label className="lp__label" htmlFor="phone">Número (México)</label>

              <div className="lp__phoneRow">
                <div className="lp__countryChip" aria-label="México +52">
                  <span className="lp__flag" aria-hidden="true">🇲🇽</span>
                  <span className="lp__dial">+52</span>
                </div>

                <input
                  id="phone"
                  className="lp__input lp__input--phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="123 456 7890"
                  value={formatMxPhone(phone)}
                  onChange={(e) => setPhone(onlyDigits(e.target.value).slice(0, 10))}
                  onBlur={() => setTouched(true)}
                />
              </div>

              <div className="lp__hint">Ejemplo: 4771234567</div>

              {checkingSession ? (
                <div className="lp__meta">Verificando sesión…</div>
              ) : err ? (
                <div className="lp__error">⚠️ {err}</div>
              ) : touched && !isValid ? (
                <div className="lp__error">Ingresa un número válido de 10 dígitos.</div>
              ) : cooldown > 0 ? (
                <div className="lp__meta">⏳ Puedes solicitar otro código en {cooldown}s.</div>
              ) : (
                <div className="lp__meta">🔒 Te enviaremos un código por WhatsApp.</div>
              )}

              <button className="lp__btn lp__btn--primary lp__btn--block" type="submit" disabled={disabled}>
                {checkingSession ? "Verificando…" : loading ? "Enviando código..." : cooldown > 0 ? `Reintenta en ${cooldown}s` : "Continuar"}
              </button>
            </form>
          </div>

          <div className="lp__detailRight" />
        </section>
      </main>
    </div>
  );
}