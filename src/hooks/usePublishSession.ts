// src/hooks/usePublishSession.ts
import { useEffect, useState } from "react";

export function usePublishSession() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<null | {
    phoneE164: string;
    phoneLocal: string;
    expireAt: string;
  }>(null);

  useEffect(() => {
    fetch("/api/public/v1/publish/session", {
      credentials: "include", // 👈 IMPORTANTE
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("NO_SESSION");
        return res.json();
      })
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  return { loading, session };
}