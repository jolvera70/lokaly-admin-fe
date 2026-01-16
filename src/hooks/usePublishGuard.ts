// src/hooks/usePublishGuard.ts
import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePublishSession, type PublishSession } from "./usePublishSession";

export type PublishGuardOptions = {
  /** A dónde mandar si NO hay sesión válida */
  redirectTo?: string; // default "/publicar"
};

function isSessionValid(session: PublishSession | null) {
  if (!session) return false;
  if (!session.phoneE164 || !session.phoneLocal) return false;

  // ✅ debe estar verificado
  if (session.verified === false) return false;

  // ✅ expiresAt (del BE) debe ser futuro
  const t = new Date(session.expiresAt).getTime();
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

    if (!ok) {
      navigate(redirectTo, { replace: true });
    }
  }, [loading, ok, navigate, redirectTo]);

  return {
    loading,
    ok, // ✅ este es el "verifiedOk" real
    session,
    phoneE164: session?.phoneE164 ?? null,
    phoneLocal: session?.phoneLocal ?? null,
  };
}