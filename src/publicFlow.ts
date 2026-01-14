// src/publicFlow.ts

/**
 * Estado persistido del flujo público de publicación
 * Vive en localStorage para sobrevivir recargas / nuevas pestañas
 */
export type PublishFlowDraft = {
  phoneE164: string;     // +524771234567
  phoneLocal: string;    // 4771234567
  otpSessionId?: string;
  cooldownSeconds?: number;
  verified?: boolean;
  verifiedAt?: number;  // Date.now()
};

const KEY = "lokaly_publish_flow_v1";

/**
 * Tiempo máximo para considerar válida una verificación
 * (después de esto se vuelve a pedir OTP)
 */
export const VERIFY_TTL_MS = 60 * 60 * 1000; // 60 minutos

// ======================================================
// Storage helpers
// ======================================================

export function loadPublishFlow(): PublishFlowDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PublishFlowDraft) : null;
  } catch {
    return null;
  }
}

/**
 * Guarda un flow COMPLETO.
 * Úsalo cuando:
 * - se envía OTP
 * - se verifica OTP
 */
export function savePublishFlow(draft: PublishFlowDraft) {
  localStorage.setItem(KEY, JSON.stringify(draft));
}

/**
 * Aplica cambios parciales SOLO si ya existe un flow válido.
 * Evita guardar undefined por error.
 */
export function patchPublishFlow(patch: Partial<PublishFlowDraft>) {
  const current = loadPublishFlow();
  if (!current) {
    throw new Error("No publish flow yet. Call savePublishFlow() first.");
  }

  const merged: PublishFlowDraft = {
    ...current,
    ...patch,
  };

  localStorage.setItem(KEY, JSON.stringify(merged));
}

/**
 * Borra completamente el flujo (cambiar número, expirar sesión, etc)
 */
export function clearPublishFlow() {
  localStorage.removeItem(KEY);
}

// ======================================================
// Validaciones de sesión
// ======================================================

/**
 * Devuelve true si:
 * - está verificado
 * - NO ha expirado el TTL
 */
export function isPublishVerifiedRecently(flow: PublishFlowDraft | null): boolean {
  if (!flow?.verified || !flow.verifiedAt) return false;
  return Date.now() - flow.verifiedAt < VERIFY_TTL_MS;
}

/**
 * Devuelve true si hay una sesión OTP pendiente (sin reenviar)
 */
export function hasPendingOtp(flow: PublishFlowDraft | null): boolean {
  return Boolean(
    flow &&
      !flow.verified &&
      flow.otpSessionId &&
      flow.phoneE164 &&
      flow.phoneLocal
  );
}