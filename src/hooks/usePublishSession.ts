// src/hooks/usePublishSession.ts
import { useEffect, useState } from "react";
import { publicUrl } from "../api";

export type PublishSession = {
  phoneE164: string;
  phoneLocal: string;
  expiresAt: string;
  verified: boolean;
  otpSessionId: string;
};

export function usePublishSession() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PublishSession | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch(publicUrl(`/v1/publish/session`), {
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        // ✅ NO SESSION es normal
        if (res.status === 401 || res.status === 204) {
          if (alive) setSession(null);
          return;
        }

        if (!res.ok) {
          if (alive) setSession(null);
          return;
        }

        const data = (await res.json()) as PublishSession;
        if (alive) setSession(data);
      } catch {
        if (alive) setSession(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { loading, session };
}