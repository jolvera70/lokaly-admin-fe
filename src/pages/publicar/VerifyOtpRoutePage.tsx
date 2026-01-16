import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { VerifyOtpPage } from "./VerifyOtpPage";
import { usePublishSession } from "../../hooks/usePublishSession";
import { sendPublicOtp, verifyPublicOtp } from "../../api";

type NavState = {
  phoneE164?: string;
  otpSessionId?: string;
  cooldownSeconds?: number;
};

export default function VerifyOtpRoutePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state || {}) as NavState;

  const { loading, session } = usePublishSession();

  // Fuente de verdad inicial: session si existe; si no, state
  const initialPhoneE164 = useMemo(
    () => session?.phoneE164 ?? navState.phoneE164 ?? "",
    [session?.phoneE164, navState.phoneE164]
  );

  const initialOtpSessionId = useMemo(
    () => session?.otpSessionId ?? navState.otpSessionId ?? "",
    [session?.otpSessionId, navState.otpSessionId]
  );

  const initialCooldown = useMemo(
    () => navState.cooldownSeconds ?? 0,
    [navState.cooldownSeconds]
  );

  // ✅ Ahora sí: state local (se actualiza en resend)
  const [phoneE164, setPhoneE164] = useState(initialPhoneE164);
  const [otpSessionId, setOtpSessionId] = useState(initialOtpSessionId);
  const [cooldownSeconds, setCooldownSeconds] = useState(initialCooldown);

  // ✅ Para evitar “closure viejo” en onVerify
  const otpSessionIdRef = useRef(otpSessionId);
  useEffect(() => {
    otpSessionIdRef.current = otpSessionId;
  }, [otpSessionId]);

  // ✅ Cuando llega session del backend (si existe), sincroniza
  useEffect(() => {
    if (loading) return;

    const p = session?.phoneE164 ?? navState.phoneE164 ?? "";
    const sid = session?.otpSessionId ?? navState.otpSessionId ?? "";

    setPhoneE164(p);
    setOtpSessionId(sid);

    // si backend ya verified, avanza
    if (session?.verified) {
      navigate("/publicar/producto", { replace: true });
    }

    // si no hay nada, regresa
    if (!p || !sid) {
      navigate("/publicar", { replace: true });
    }
  }, [loading, session?.phoneE164, session?.otpSessionId, session?.verified, navState.phoneE164, navState.otpSessionId, navigate]);

  if (loading) return null;
  if (!phoneE164 || !otpSessionId) return null;

  return (
    <VerifyOtpPage
      phoneE164={phoneE164}
      initialCooldownSeconds={cooldownSeconds}
      onVerify={async (code) => {
        // ✅ SIEMPRE usa el último sessionId (aunque acabes de reenviar)
        const latest = otpSessionIdRef.current;
        await verifyPublicOtp(latest, code);
        navigate("/publicar/producto", { replace: true });
      }}
      onResend={async () => {
        const resp = await sendPublicOtp(phoneE164);

        // ✅ CLAVE: actualizar al nuevo otpSessionId
        setOtpSessionId(resp.otpSessionId);
        setCooldownSeconds(resp.cooldownSeconds ?? 60);

        // ✅ también actualiza el history state para refresh
        navigate(".", {
          replace: true,
          state: {
            phoneE164,
            otpSessionId: resp.otpSessionId,
            cooldownSeconds: resp.cooldownSeconds ?? 60,
          } satisfies NavState,
        });
      }}
      onChangeNumber={() => navigate("/publicar", { replace: true })}
    />
  );
}