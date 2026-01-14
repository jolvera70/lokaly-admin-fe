import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loadPublishFlow, isPublishVerifiedRecently } from "../publicFlow";

type Options = {
  verifiedTo?: string;
  pendingOtpTo?: string;
};

export function usePublishSmartRedirect(options?: Options) {
  const navigate = useNavigate();

  const verifiedTo = options?.verifiedTo ?? "/publicar/producto";
  const pendingOtpTo = options?.pendingOtpTo ?? "/publicar/verificar";

  useEffect(() => {
    const flow = loadPublishFlow();
    if (!flow?.phoneE164 || !flow?.phoneLocal) return;

    // ✅ ya verificado (y no expirado)
    if (isPublishVerifiedRecently(flow)) {
      navigate(verifiedTo, { replace: true });
      return;
    }

    // ✅ OTP pendiente
    if (!flow.verified && flow.otpSessionId) {
      navigate(pendingOtpTo, {
        replace: true,
        state: {
          phoneE164: flow.phoneE164,
          phoneLocal: flow.phoneLocal,
          otpSessionId: flow.otpSessionId,
          cooldownSeconds: flow.cooldownSeconds ?? 30,
        },
      });
    }
  }, [navigate, verifiedTo, pendingOtpTo]);
}