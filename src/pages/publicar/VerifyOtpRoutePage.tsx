import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { VerifyOtpPage } from "./VerifyOtpPage";
import { usePublishSession } from "../../hooks/usePublishSession";
import { sendPublicOtp, verifyPublicOtp } from "../../api";

type NavState = {
  phoneE164?: string;
  email?: string;
  otpSessionId?: string;
  cooldownSeconds?: number;
};

export default function VerifyOtpRoutePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state || {}) as NavState;

  const { loading, session } = usePublishSession();

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

  const initialEmail = useMemo(
    () => navState.email ?? "",
    [navState.email]
  );

  const [phoneE164, setPhoneE164] = useState(initialPhoneE164);
  const [otpSessionId, setOtpSessionId] = useState(initialOtpSessionId);
  const [cooldownSeconds, setCooldownSeconds] = useState(initialCooldown);
  const [email, setEmail] = useState(initialEmail);

  const otpSessionIdRef = useRef(otpSessionId);
  useEffect(() => {
    otpSessionIdRef.current = otpSessionId;
  }, [otpSessionId]);

  useEffect(() => {
    if (loading) return;

    const p = session?.phoneE164 ?? navState.phoneE164 ?? "";
    const sid = session?.otpSessionId ?? navState.otpSessionId ?? "";
    const em = navState.email ?? "";

    setPhoneE164(p);
    setOtpSessionId(sid);
    setEmail(em);

    if (session?.verified) {
      navigate("/publicar/producto", { replace: true });
      return;
    }

    // ✅ ahora también requerimos email para poder reenviar
    if (!p || !sid || !em) {
      navigate("/publicar", { replace: true });
    }
  }, [
    loading,
    session?.phoneE164,
    session?.otpSessionId,
    session?.verified,
    navState.phoneE164,
    navState.otpSessionId,
    navState.email,
    navigate,
  ]);

  if (loading) return null;
  if (!phoneE164 || !otpSessionId || !email) return null;

  return (
    <VerifyOtpPage
      phoneE164={phoneE164}
      initialCooldownSeconds={cooldownSeconds}
      onVerify={async (code) => {
        const latest = otpSessionIdRef.current;
        await verifyPublicOtp(latest, code);
        navigate("/publicar/producto", { replace: true });
      }}
      onResend={async () => {
        // ✅ ahora requiere email
        const resp = await sendPublicOtp(phoneE164, email);

        setOtpSessionId(resp.otpSessionId);
        setCooldownSeconds(resp.cooldownSeconds ?? 60);

        navigate(".", {
          replace: true,
          state: {
            phoneE164,
            email,
            otpSessionId: resp.otpSessionId,
            cooldownSeconds: resp.cooldownSeconds ?? 60,
          } satisfies NavState,
        });
      }}
      onChangeNumber={() => navigate("/publicar", { replace: true })}
    />
  );
}