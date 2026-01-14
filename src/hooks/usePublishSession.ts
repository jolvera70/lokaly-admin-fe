// src/hooks/usePublishSession.ts
import { useEffect, useState } from "react";

export type PublishSession = {
  phoneE164: string;
  phoneLocal: string;
  expiresAt: string;
  verified: boolean;
};

export function usePublishSession() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<PublishSession | null>(null);

  useEffect(() => {
    fetch("https://lokaly.site/api/public/v1/publish/session", {
      credentials: "include", // 👈 MUY IMPORTANTE
      headers: { Accept: "application/json" },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("NO_SESSION");
        return (await res.json()) as PublishSession;
      })
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  return { loading, session };
}