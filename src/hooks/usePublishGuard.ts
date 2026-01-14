// src/hooks/usePublishGuard.ts
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePublishSession } from "./usePublishSession";

export type PublishGuardOptions = {
  /** A dónde mandar si NO hay sesión válida */
  redirectTo?: string; // default "/publicar"
};

function isSessionValid(session: { phoneE164: string; phoneLocal: string; expireAt: string } | null) {
  if (!session) return false;
  if (!session.phoneE164 || !session.phoneLocal) return false;

  const t = new Date(session.expireAt).getTime();
  if (Number.isNaN(t)) return false;

  return Date.now() < t;
}

export function usePublishGuard(options: PublishGuardOptions = {}) {
  const navigate = useNavigate();

  const { redirectTo = "/publicar" } = options;

  const { loading, session } = usePublishSession();

  const ok = useMemo(() => isSessionValid(session), [session]);

  useEffect(() => {
    if (loading) return;

    // ❌ No hay cookie / sesión válida (o expirada)
    if (!ok) {
      navigate(redirectTo, { replace: true });
    }

    // ✅ ok → no hace nada
  }, [loading, ok, navigate, redirectTo]);

  return {
    loading,
    ok, // <- equivalente a "verifiedOk" en tu flujo actual
    session, // phoneE164, phoneLocal, expireAt
    phoneE164: session?.phoneE164 ?? null,
    phoneLocal: session?.phoneLocal ?? null,
  };
}