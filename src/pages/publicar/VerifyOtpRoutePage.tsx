import { useNavigate } from "react-router-dom";
import { VerifyOtpPage } from "./VerifyOtpPage";
import { verifyPublicOtp, sendPublicOtp } from "../../api";
import { usePublishSession } from "../../hooks/usePublishSession";

export default function VerifyOtpRoutePage() {
  const navigate = useNavigate();
  const { loading, session } = usePublishSession();

  // ⏳ Mientras carga sesión
  if (loading) {
    return <div style={{ color: "#fff", textAlign: "center" }}>Cargando…</div>;
  }

  // 🚫 No hay sesión → vuelve al inicio
  if (!session) {
    navigate("/publicar", { replace: true });
    return null;
  }

  // ✅ Ya verificado → siguiente paso
  if (session.verified) {
    navigate("/publicar/producto", { replace: true });
    return null;
  }

  return (
    <VerifyOtpPage
      phoneE164={session.phoneE164}
      onVerify={async (code) => {
        await verifyPublicOtp(session.otpSessionId,code); // 👈 SOLO code, backend usa cookie
        navigate("/publicar/producto", { replace: true });
      }}
      onResend={async () => {
        await sendPublicOtp(session.phoneE164);
      }}
      onChangeNumber={() => {
        navigate("/publicar", { replace: true });
      }}
    />
  );
}