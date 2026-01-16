// src/publicFlow.ts

export type PublishFlowDraft = {
  phoneE164: string;     // +524771234567
  phoneLocal: string;    // 4771234567
  otpSessionId?: string;

  cooldownSeconds?: number;
  otpRequestedAt?: number; // ✅ para calcular cooldown real tras recargar

  verified?: boolean;
  verifiedAt?: number;  // Date.now()
};

const KEY = "lokaly_publish_flow_v1";

export const VERIFY_TTL_MS = 60 * 60 * 1000; // 60 minutos

export function loadPublishFlow(): PublishFlowDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PublishFlowDraft) : null;
  } catch {
    return null;
  }
}

export function savePublishFlow(draft: PublishFlowDraft) {
  localStorage.setItem(KEY, JSON.stringify(draft));
}

export function patchPublishFlow(patch: Partial<PublishFlowDraft>) {
  const current = loadPublishFlow();
  if (!current) throw new Error("No publish flow yet. Call savePublishFlow() first.");
  const merged: PublishFlowDraft = { ...current, ...patch };
  localStorage.setItem(KEY, JSON.stringify(merged));
}

export function clearPublishFlow() {
  localStorage.removeItem(KEY);
}

export function isPublishVerifiedRecently(flow: PublishFlowDraft | null): boolean {
  if (!flow?.verified || !flow.verifiedAt) return false;
  return Date.now() - flow.verifiedAt < VERIFY_TTL_MS;
}

export function hasPendingOtp(flow: PublishFlowDraft | null): boolean {
  return Boolean(flow && !flow.verified && flow.otpSessionId && flow.phoneE164 && flow.phoneLocal);
}

/** ✅ Cooldown real aunque recargues */
export function getCooldownLeft(flow: PublishFlowDraft | null): number {
  if (!flow?.cooldownSeconds || !flow.otpRequestedAt) return 0;
  const elapsed = Math.floor((Date.now() - flow.otpRequestedAt) / 1000);
  return Math.max(0, flow.cooldownSeconds - elapsed);
}