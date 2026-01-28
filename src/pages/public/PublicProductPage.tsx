// src/pages/public/PublicProductPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PUBLIC_BASE_URL } from "../../api";

/* =======================
   Types
======================= */

type CatalogImageDto = {
  originalUrl: string;
  mediumUrl: string;
  thumbUrl: string;
};

type PublicProductDetail = {
  id: string;
  name: string;
  price: number;
  description?: string;
  images: CatalogImageDto[]; // ✅ BE nuevo: images como objetos
  featured?: boolean;

  // ✅ sin cobro, solo disponibilidad
  availableQuantity?: number | null;

  seller: {
    id: string;
    name: string;
    slug: string;
    whatsapp?: string;
    clusterName?: string;
  };
};

type OrderRequestPayload = {
  productId: string;
  quantity: number;
  note?: string | null;
  buyerName: string;
  buyerWhatsapp: string;
};


// =======================
// Analytics (public)
// =======================

const ANALYTICS_BASE = `${PUBLIC_BASE_URL}/v1/analytics`;
const REPORTS_BASE = `${PUBLIC_BASE_URL}/v1/reports`;

async function submitReport(payload: {
  targetType: "PRODUCT";
  productId: string;
  catalogSlug?: string | null;
  path?: string;
  reason: string;
  details?: string | null;
  visitorId?: string;
}) {
  const res = await fetch(`${REPORTS_BASE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let msg = "No se pudo enviar el reporte.";
    try {
      const j = await res.json();
      msg = j?.message || j?.error || msg;
    } catch { }
    throw new Error(msg);
  }
}

function getVisitorId(): string {
  try {
    const key = "lokaly_visitor_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `vid_${Math.random().toString(16).slice(2)}_${Date.now()}`;

    localStorage.setItem(key, id);
    return id;
  } catch {
    // si localStorage está bloqueado, igual mandamos algo
    return `vid_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
}

function shouldSendOnce(key: string, ttlMs: number): boolean {
  try {
    const raw = localStorage.getItem(key);
    const now = Date.now();
    if (raw) {
      const last = Number(raw);
      if (Number.isFinite(last) && now - last < ttlMs) return false;
    }
    localStorage.setItem(key, String(now));
    return true;
  } catch {
    return true; // si no hay storage, mandamos siempre
  }
}

async function trackEvent(payload: {
  name: string;
  domain: string;
  visitorId?: string;
  catalogId?: string;
  productId?: string;
  path?: string;
  props?: Record<string, any>;
}) {
  try {
    await fetch(`${ANALYTICS_BASE}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    // no rompemos UX por analytics
  }
}

/* =======================
   Helpers
======================= */
function pickSellerWhatsapp(raw: any): string | undefined {
  // 1) directo / legacy
  const direct =
    raw?.sellerWhatsapp ||
    raw?.seller?.whatsapp ||
    raw?.seller?.phoneE164 ||
    raw?.seller?.phone ||
    raw?.whatsapp;

  if (direct) return String(direct);

  // 2) nuevo: publisher catalog (lo más confiable en tu caso)
  const pc =
    raw?.publisherCatalog ||
    raw?.catalog ||
    raw?.publisherCatalogInfo ||
    raw?.catalogOwner;

  const fromCatalog = pc?.phoneE164 || pc?.phoneLocal;
  if (fromCatalog) return String(fromCatalog);

  // 3) fallback plano
  const plain = raw?.phoneE164 || raw?.phoneLocal;
  return plain ? String(plain) : undefined;
}

// Útil para armar URLs de assets que vienen como path.
// - Si ya es http(s) => la deja
// - Si empieza con /api => la deja (proxy en local)
// - Si es /uploads o similar => en local la manda a https://lokaly.site, en prod al mismo origin
export function resolveImageUrl(rawUrl?: string | null): string | undefined {
  if (!rawUrl) return undefined;

  // ya absoluta
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

  const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;

  // si ya viene con /api, en local lo resuelve el proxy, en prod es same-origin
  if (path.startsWith("/api/")) return path;

  // otros paths (ej. /uploads/.., /media/..) => en local prefijamos al server real
  const isLocal =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const origin = isLocal ? "https://lokaly.site" : window.location.origin;

  return `${origin}${path}`;
}

function imagesToUrls(
  images: CatalogImageDto[] | undefined | null,
  size: "thumb" | "medium" | "original"
): string[] {
  const list = Array.isArray(images) ? images : [];
  return list
    .map((img) => {
      const raw =
        size === "thumb"
          ? img.thumbUrl
          : size === "medium"
            ? img.mediumUrl
            : img.originalUrl;

      return resolveImageUrl(raw);
    })
    .filter(Boolean) as string[];
}

function cleanPhone(phone: string) {
  return (phone || "").replace(/[^\d]/g, "");
}

function openWhatsApp(phone: string, message: string) {
  const p = cleanPhone(phone);
  if (!p) {
    alert("Este vendedor no tiene WhatsApp configurado.");
    return;
  }
  const url = `https://wa.me/${p}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function moneyMXN(value: number) {
  return `$${(value ?? 0).toLocaleString("es-MX")} MXN`;
}

function useIsMobile(breakpointPx = 520) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia(`(max-width: ${breakpointPx}px)`).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const handler = () => setIsMobile(mq.matches);
    handler();

    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, [breakpointPx]);

  return isMobile;
}

function clamp(lines: number): React.CSSProperties {
  return {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: lines as any,
    overflow: "hidden",
  };
}

/* =======================
   Image carousel with zoom
======================= */

function ProductImageCarousel({
  images,
  alt,
  isMobile,
}: {
  images: string[];
  alt: string;
  isMobile: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  if (!images || images.length === 0) return null;

  const total = images.length;
  const current = images[index];

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + total) % total);
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % total);
  };

  const mediaHeight = isMobile ? "clamp(260px, 44vh, 360px)" : "360px";

  return (
    <>
      <div style={{ ...s.media, height: mediaHeight as any }} onClick={() => setIsOpen(true)}>
        <img
          src={current}
          alt={alt}
          loading="lazy"
          decoding="async"
          style={{ ...s.mediaImg, height: mediaHeight as any }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />

        {total > 1 && (
          <>
            <button onClick={goPrev} style={s.mediaNavLeft} aria-label="Anterior">
              ‹
            </button>
            <button onClick={goNext} style={s.mediaNavRight} aria-label="Siguiente">
              ›
            </button>

            <div style={s.dots}>
              {images.map((_, i) => (
                <div
                  key={i}
                  style={{
                    ...s.dot,
                    width: i === index ? 12 : 7,
                    opacity: i === index ? 1 : 0.6,
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {isOpen && (
        <div onClick={() => setIsOpen(false)} style={s.modalBackdrop}>
          <div onClick={(e) => e.stopPropagation()} style={s.modalFrame}>
            <img src={current} alt={alt} style={s.modalImg} />
            <button onClick={() => setIsOpen(false)} style={s.modalClose} aria-label="Cerrar">
              ✕
            </button>

            {total > 1 && (
              <>
                <button onClick={goPrev} style={s.modalNavLeft} aria-label="Anterior">
                  ‹
                </button>
                <button onClick={goNext} style={s.modalNavRight} aria-label="Siguiente">
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* =======================
   Tiny toast (sin libs)
======================= */

let toastTimer: any = null;
function toast(msg: string) {
  const elId = "lokaly-toast";
  let el = document.getElementById(elId);
  if (!el) {
    el = document.createElement("div");
    el.id = elId;
    document.body.appendChild(el);
  }
  el.textContent = msg;
  Object.assign(el.style, s.toast);
  el.style.opacity = "1";

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (el) el.style.opacity = "0";
  }, 1100);
}

/* =======================
   Professional Bottom Sheet
======================= */

function OrderSheet({
  open,
  onClose,
  productName,
  availableQty,
  buyerName,
  setBuyerName,
  buyerWhatsapp,
  setBuyerWhatsapp,
  qty,
  setQty,
  note,
  setNote,
  submitting,
  canSubmit,
  onSubmit,
  orderOk,
  onOpenWhats,
}: {
  open: boolean;
  onClose: () => void;
  productName: string;
  availableQty?: number | null;
  buyerName: string;
  setBuyerName: (v: string) => void;
  buyerWhatsapp: string;
  setBuyerWhatsapp: (v: string) => void;
  qty: number;
  setQty: (v: number) => void;
  note: string;
  setNote: (v: string) => void;
  submitting: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  orderOk: { id?: string } | null;
  onOpenWhats: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    // lock scroll behind
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxQty = availableQty == null ? 99 : Math.max(0, Number(availableQty));
  const stockLabel =
    availableQty == null
      ? "Disponibilidad por confirmar"
      : availableQty === 0
        ? "Agotado"
        : `Quedan ${availableQty} disponibles`;

  return (
    <div style={s.sheetBackdrop} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        <div style={s.sheetHeaderPro}>
          <div style={{ minWidth: 0 }}>
            <div style={s.sheetTitle}>Solicitar pedido</div>
            <div style={s.sheetPillsRow}>
              <span style={availableQty === 0 ? s.sheetPillOut : s.sheetPill}>{stockLabel}</span>
            </div>
          </div>

          <button onClick={onClose} style={s.sheetClosePro} aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div style={s.sheetBody}>
          {/* Product summary */}
          <div style={s.productCard}>
            <div style={s.productCardLabel}>Producto</div>
            <div style={s.productCardName}>{productName}</div>
          </div>

          {!orderOk ? (
            <>
              <div style={s.formGridPro}>
                <div style={s.fieldPro}>
                  <label style={s.labelPro}>Tu nombre</label>
                  <input
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    placeholder="Ej. Jorge"
                    style={s.inputPro}
                    autoComplete="name"
                  />
                </div>

                <div style={s.fieldPro}>
                  <label style={s.labelPro}>Tu WhatsApp</label>
                  <input
                    value={buyerWhatsapp}
                    onChange={(e) => setBuyerWhatsapp(e.target.value)}
                    placeholder="10 dígitos"
                    inputMode="numeric"
                    style={s.inputPro}
                    autoComplete="tel"
                  />
                  <div style={s.helperPro}>Solo para que el vendedor pueda contactarte.</div>
                </div>

                <div style={s.fieldPro}>
                  <label style={s.labelPro}>Cantidad</label>

                  <div style={s.qtyRowPro}>
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      style={s.qtyBtnPro}
                      disabled={qty <= 1}
                      aria-label="Disminuir"
                    >
                      −
                    </button>

                    <input
                      value={String(qty)}
                      onChange={(e) => {
                        const raw = (e.target.value || "").replace(/[^\d]/g, "");
                        const n = Number(raw || "1");
                        const cap = availableQty == null ? 99 : maxQty;
                        const capped = Math.max(1, Math.min(Number.isFinite(n) ? n : 1, cap));
                        setQty(capped);
                      }}
                      inputMode="numeric"
                      style={s.qtyInputPro}
                      aria-label="Cantidad"
                    />

                    <button
                      onClick={() => setQty(Math.min(qty + 1, availableQty == null ? 99 : maxQty))}
                      style={s.qtyBtnPro}
                      disabled={availableQty != null && qty >= maxQty}
                      aria-label="Aumentar"
                    >
                      +
                    </button>
                  </div>

                  {availableQty != null && qty > availableQty ? (
                    <div style={s.errorPro}>No hay suficiente stock disponible.</div>
                  ) : null}
                </div>

                <div style={s.fieldPro}>
                  <label style={s.labelPro}>Nota (opcional)</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ej. ¿Entregas hoy? / Paso en la tarde"
                    style={s.textareaPro}
                  />
                </div>

                <div style={s.tipCardPro}>
                  <div style={s.tipIconPro}>i</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={s.tipTitlePro}>Tip</div>
                    <div style={s.tipTextPro}>
                      Esto no cobra. Solo envía una solicitud al vendedor para que te contacte.
                    </div>
                  </div>
                </div>
              </div>

              <div style={s.sheetActionsPro}>
                <button onClick={onClose} style={s.sheetGhostPro}>
                  Cancelar
                </button>

                <button
                  onClick={onSubmit}
                  style={{
                    ...s.sheetPrimaryPro,
                    ...(canSubmit ? null : s.sheetPrimaryDisabledPro),
                  }}
                  disabled={!canSubmit}
                >
                  {submitting ? "Enviando…" : "Enviar solicitud"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={s.okBox}>
                <div style={{ fontWeight: 1000, fontSize: 16 }}>✅ Solicitud enviada</div>
                <div style={{ marginTop: 6, color: "#6B7280", fontSize: 13, lineHeight: 1.45 }}>
                  El vendedor recibió tu pedido. Te contactará por WhatsApp.
                  {orderOk.id ? (
                    <>
                      {" "}
                      ID: <b>{orderOk.id}</b>
                    </>
                  ) : null}
                </div>
              </div>

              <div style={s.sheetActionsPro}>
                <button onClick={onClose} style={s.sheetGhostPro}>
                  Cerrar
                </button>
                <button onClick={onOpenWhats} style={s.sheetPrimaryGreenPro}>
                  Abrir WhatsApp
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


type ReportReason =
  | "ILLEGAL_ITEM"
  | "ABUSE_OR_EXPLOITATION"
  | "NON_CONSENSUAL_INTIMATE"
  | "HATE_OR_HARASSMENT"
  | "SCAM_OR_FRAUD"
  | "OTHER";

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "ILLEGAL_ITEM", label: "🚫 Producto ilegal o prohibido" },
  { value: "ABUSE_OR_EXPLOITATION", label: "🛑 Abuso / explotación" },
  { value: "NON_CONSENSUAL_INTIMATE", label: "⚠️ Contenido íntimo no consensuado" },
  { value: "HATE_OR_HARASSMENT", label: "😠 Odio / acoso" },
  { value: "SCAM_OR_FRAUD", label: "🎭 Estafa / fraude" },
  { value: "OTHER", label: "❓ Otro" },
];

function ReportModal({
  open,
  onClose,
  productId,
  catalogSlug,
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  catalogSlug?: string | null;
}) {
  const [reason, setReason] = useState<ReportReason>("ILLEGAL_ITEM");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const left = 500 - details.length;

  return (
    <div style={sr.backdrop} onClick={onClose}>
      <div style={sr.card} onClick={(e) => e.stopPropagation()}>
        <div style={sr.topRow}>
          <div style={sr.title}>🚩 Reportar publicación</div>
          <button style={sr.closeBtn} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {!done ? (
          <>
            <div style={sr.help}>
              Usa esta opción si el producto tiene imágenes ilegales, abuso o contenido no permitido.
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={sr.label}>Motivo</div>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as ReportReason)}
                style={sr.select}
                disabled={sending}
              >
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value} style={{ color: "#111827", background: "#fff" }}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={sr.label}>
                Comentario (opcional){" "}
                <span style={{ opacity: 0.55, fontWeight: 900 }}>{left}</span>
              </div>
              <textarea
                value={details}
                onChange={(e) => {
                  const v = e.target.value || "";
                  setDetails(v.length > 500 ? v.slice(0, 500) : v);
                }}
                style={sr.textarea}
                placeholder="Describe brevemente qué ocurre…"
                disabled={sending}
              />
            </div>

            <div style={sr.actions}>
              <button onClick={onClose} style={sr.btnGhost} disabled={sending}>
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    setSending(true);

                    await submitReport({
                      targetType: "PRODUCT",
                      productId,
                      catalogSlug: catalogSlug ?? null,
                      path: window.location.pathname,
                      reason,
                      details: details.trim() ? details.trim() : null,
                      visitorId: getVisitorId(),
                    });

                    // opcional: track event de reporte (si quieres)
                    try {
                      trackEvent({
                        name: "REPORT_SUBMIT_OK",
                        domain: "report",
                        visitorId: getVisitorId(),
                        catalogId: catalogSlug ?? "unknown",
                        productId,
                        path: window.location.pathname,
                        props: { reason },
                      });
                    } catch { }

                    setDone(true);
                    toast("Reporte enviado ✅");
                  } catch (e: any) {
                    alert(e?.message || "No se pudo enviar el reporte.");
                  } finally {
                    setSending(false);
                  }
                }}
                style={sr.btnPrimary}
                disabled={sending}
              >
                {sending ? "Enviando…" : "Enviar reporte"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={sr.okBox}>
              <div style={{ fontWeight: 1000, fontSize: 16 }}>✅ Gracias</div>
              <div style={{ marginTop: 6, color: "#6B7280", fontSize: 13, lineHeight: 1.45 }}>
                Revisaremos este reporte lo antes posible.
              </div>
            </div>

            <div style={sr.actions}>
              <button onClick={onClose} style={sr.btnPrimary}>
                Cerrar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const sr: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(15,23,42,0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  card: {
    width: "min(560px, 100%)",
    background: "#fff",
    borderRadius: 18,
    border: "1px solid #E5E7EB",
    boxShadow: "0 24px 90px rgba(0,0,0,0.25)",
    padding: 14,
    color: "#111827", // ✅ fuerza texto modal
  },
  topRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  title: { fontWeight: 1000, fontSize: 16, color: "#111827" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 1000,
    color: "#111827",
  },
  help: { marginTop: 8, fontSize: 12.5, fontWeight: 800, color: "rgba(15,23,42,0.65)", lineHeight: 1.4 },
  label: { fontSize: 12, fontWeight: 900, color: "#111827" },

  select: {
    marginTop: 6,
    width: "100%",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    padding: "12px 12px",
    fontWeight: 900,
    outline: "none",
    background: "#fff",
    color: "#111827",     // ✅
    appearance: "auto",   // ✅
  },

  textarea: {
    marginTop: 6,
    width: "100%",
    minHeight: 98,
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    padding: "12px 12px",
    fontSize: 13,
    fontWeight: 750,
    outline: "none",
    resize: "vertical",
    background: "#fff",
    color: "#111827",     // ✅
  },

  actions: { marginTop: 12, display: "flex", gap: 10, justifyContent: "flex-end" },
  btnGhost: {
    height: 44,
    padding: "0 14px",
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 1000,
    color: "#111827",
  },
  btnPrimary: {
    height: 44,
    padding: "0 14px",
    borderRadius: 999,
    border: "none",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 1000,
  },
  okBox: { marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid #E5E7EB", background: "#F9FAFB" },
};
/* =======================
   Page
======================= */

export function PublicProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile(520);

  const [data, setData] = useState<PublicProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ bottom sheet
  const [orderOpen, setOrderOpen] = useState(false);
  const [buyerName, setBuyerName] = useState("");
  const [buyerWhatsapp, setBuyerWhatsapp] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderOk, setOrderOk] = useState<{ id?: string } | null>(null);

  const productUrl = useMemo(() => window.location.href, []);
  const [reportOpen, setReportOpen] = useState(false);

  // remember buyer info (pro UX)
  useEffect(() => {
    const n = localStorage.getItem("lokaly_buyer_name") || "";
    const w = localStorage.getItem("lokaly_buyer_whatsapp") || "";
    if (n) setBuyerName(n);
    if (w) setBuyerWhatsapp(w);
  }, []);

  useEffect(() => {
    localStorage.setItem("lokaly_buyer_name", buyerName);
  }, [buyerName]);

  useEffect(() => {
    localStorage.setItem("lokaly_buyer_whatsapp", buyerWhatsapp);
  }, [buyerWhatsapp]);

  const loadProduct = useCallback(async () => {
    if (!productId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${PUBLIC_BASE_URL}/products/${productId}`);
      if (!res.ok) throw new Error("No se pudo cargar el producto");

      const raw = await res.json();

      const pick = (x: any): CatalogImageDto[] => {
        if (!Array.isArray(x)) return [];

        // objects [{thumbUrl, mediumUrl, originalUrl}]
        if (x.length === 0) return [];
        if (typeof x[0] === "object" && x[0] !== null) {
          return x as CatalogImageDto[];
        }

        // legacy strings ["/api/.../t.jpg", ...]
        if (typeof x[0] === "string") {
          return (x as string[])
            .map((u) => {
              const url = resolveImageUrl(u);
              if (!url) return null;
              return { thumbUrl: url, mediumUrl: url, originalUrl: url };
            })
            .filter(Boolean) as CatalogImageDto[];
        }

        return [];
      };

      const imgObjects: CatalogImageDto[] = pick(raw.imageUrls).length
        ? pick(raw.imageUrls)
        : pick(raw.images);

      // compat legacy single
      const single = (raw.imageUrl as string | undefined) || (raw.image as string | undefined);
      if (single) {
        const url = resolveImageUrl(single);
        if (url) imgObjects.unshift({ originalUrl: url, mediumUrl: url, thumbUrl: url });
      }

      const sellerWhatsapp = pickSellerWhatsapp(raw);

      const normalized: PublicProductDetail = {
        id: raw.id,
        name: raw.title ?? raw.name,
        price: Number(raw.price ?? 0),
        description: raw.description ?? raw.shortDescription ?? raw.longDescription,
        images: imgObjects,
        featured: !!raw.featured,
        availableQuantity: raw.availableQuantity ?? null,
        seller: {
          id: raw.sellerId ?? raw.publisherCatalogId ?? "",
          name: raw.sellerName ?? raw.catalogName ?? "Vendedor",
          slug: raw.sellerSlug ?? raw.catalogSlug ?? raw.slug ?? "",
          whatsapp: sellerWhatsapp,
          clusterName: raw.clusterName ?? raw.sellerClusterName ?? raw.catalogClusterName ?? undefined,
        },
      };

      setData(normalized);

      setData(normalized);

      // ✅ Analytics: PRODUCT_VIEW (1 vez cada 10 min por producto)
      const visitorId = getVisitorId();
      const catalogId = normalized.seller?.id || normalized.seller?.slug || "unknown";
      const pid = normalized.id;

      const onceKey = `lokaly_evt_product_view_${pid}`;
      if (shouldSendOnce(onceKey, 10 * 60 * 1000)) {
        trackEvent({
          name: "PRODUCT_VIEW",
          domain: "catalog",
          visitorId,
          catalogId,
          productId,
          path: window.location.pathname,
          props: {
            sellerName: normalized.seller?.name,
            sellerSlug: normalized.seller?.slug,
            productName: normalized.name,
            price: normalized.price,
            featured: !!normalized.featured,
            ua: navigator.userAgent,
          },
        });
      }

    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error cargando producto");
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

async function copyLink() {
  try {
    const { origin, pathname } = window.location;

    // Quita /app del path si existe
    const cleanPath = pathname.startsWith("/app")
      ? pathname.replace("/app", "")
      : pathname;

    const canonicalUrl = origin + cleanPath;

    await navigator.clipboard.writeText(canonicalUrl);

    toast("Link copiado ✅");
  } catch {
    alert("No se pudo copiar el link");
  }
}

  const whatsappMessage = useMemo(() => {
    if (!data) return "";
    return `Hola! Me interesa ${data.name} (${moneyMXN(data.price)}). Lo vi aquí: ${productUrl}`;
  }, [data, productUrl]);

  const available = data?.availableQuantity;
  const isOutOfStock = available === 0;
  const maxQty = available == null ? 99 : Math.max(0, Number(available));

  function openOrderModal() {
    // ✅ Analytics: ORDER_INTENT (cada click cuenta)
    try {
      const visitorId = getVisitorId();
      const catalogId = data?.seller?.id || data?.seller?.slug || "unknown";
      const pid = data?.id;

      if (pid) {
        trackEvent({
          name: "ORDER_INTENT",
          domain: "order",
          visitorId,
          catalogId,
          productId: pid,
          path: window.location.pathname,
          props: {
            sellerName: data?.seller?.name,
            sellerSlug: data?.seller?.slug,
            productName: data?.name,
            price: data?.price,
            availableQuantity: data?.availableQuantity ?? null,
            featured: !!data?.featured,
          },
        });
      }
    } catch { }

    setOrderOk(null);
    setQty(1);
    setNote("");
    setOrderOpen(true);
  }

  const canSubmit = useMemo(() => {
    if (!data) return false;
    if (isOutOfStock) return false;

    const nameOk = buyerName.trim().length >= 2;
    const wa = cleanPhone(buyerWhatsapp);
    const waOk = wa.length >= 10;
    const qtyOk = qty >= 1 && qty <= (available == null ? 99 : maxQty);

    return nameOk && waOk && qtyOk && !submitting;
  }, [available, buyerName, buyerWhatsapp, data, isOutOfStock, maxQty, qty, submitting]);

  async function submitOrderRequest() {
    if (!data) return;
    if (!canSubmit) return;

    try {
      setSubmitting(true);

      const payload: OrderRequestPayload = {
        productId: data.id,
        quantity: qty,
        note: note?.trim() || null,
        buyerName: buyerName.trim(),
        buyerWhatsapp: cleanPhone(buyerWhatsapp),
      };

      // ✅ Analytics: ORDER_SUBMIT (cada click cuenta)
      try {
        const visitorId = getVisitorId();
        const catalogId = data?.seller?.id || data?.seller?.slug || "unknown";

        trackEvent({
          name: "ORDER_SUBMIT",
          domain: "order",
          visitorId,
          catalogId,
          productId: data.id,
          path: window.location.pathname,
          props: {
            qty,
            hasNote: !!(payload.note && payload.note.length > 0),
            availableQuantity: data.availableQuantity ?? null,
            price: data.price,
          },
        });
      } catch { }


      // Nota: este endpoint es "placeholder" (ajústalo a tu BE real)
      const res = await fetch(`${PUBLIC_BASE_URL}/order-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "No se pudo enviar la solicitud.";
        try {
          const err = await res.json();
          msg = err?.message || err?.error || msg;
        } catch { }
        throw new Error(msg);
      }

      const saved = await res.json().catch(() => ({}));
      setOrderOk({ id: saved?.id });
      toast("Solicitud enviada ✅");

      // ✅ Analytics: OK
      try {
        const visitorId = getVisitorId();
        const catalogId = data?.seller?.id || data?.seller?.slug || "unknown";

        trackEvent({
          name: "ORDER_SUBMIT_OK",
          domain: "order",
          visitorId,
          catalogId,
          productId: data.id,
          path: window.location.pathname,
          props: {
            qty,
            orderId: saved?.id ?? null,
          },
        });
      } catch { }
    } catch (e: any) {
      // ✅ Analytics: FAIL
      try {
        const visitorId = getVisitorId();
        const catalogId = data?.seller?.id || data?.seller?.slug || "unknown";

        trackEvent({
          name: "ORDER_SUBMIT_FAIL",
          domain: "order",
          visitorId,
          catalogId,
          productId: data?.id,
          path: window.location.pathname,
          props: {
            qty,
            error: e?.message ? String(e.message).slice(0, 180) : "unknown",
          },
        });
      } catch { }

      alert(e?.message || "Error enviando solicitud");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={s.page}>
        <div style={{ ...s.container, padding: isMobile ? "12px 12px 0" : "14px 14px 0" }}>
          <div style={s.skeletonTop} />
          <div style={s.skeletonBody} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={s.page}>
        <div style={{ ...s.container, padding: isMobile ? "12px 12px 0" : "14px 14px 0" }}>
          <div style={s.errorCard}>
            <div style={s.errorTitle}>Error</div>
            <div style={s.errorText}>{error}</div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={() => navigate(-1)} style={s.btnGhostDark}>
                Volver
              </button>
              <button onClick={loadProduct} style={s.btnBlack}>
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stockLabel = available == null ? "Disponible" : available === 0 ? "Agotado" : `Quedan ${available}`;

  // ✅ URL list para el carousel
  const gallery = imagesToUrls(data.images, "medium");

  const amzCss = `
:root{
  --bg:#EAEDED;
  --card:#FFFFFF;
  --border:rgba(15,23,42,.12);
  --text:#0F1111;
  --muted:#565959;
  --nav:#131921;
  --nav2:#232F3E;
  --accent:#F3A847;
  --accent2:#F7D27A;
  --shadow:0 10px 18px rgba(15,23,42,.08);
}

.amzPage{ min-height:100vh; background:var(--bg); color:var(--text); }
.amzWrap{ max-width: 820px; margin:0 auto; padding: 12px 12px 0; }

.amzTopbar{
  position: sticky; top:0; z-index: 30;
  background: var(--nav);
  border-bottom: 1px solid rgba(255,255,255,.10);
  border-radius: 14px;
  padding: 10px 12px;
  box-shadow: 0 10px 20px rgba(0,0,0,.18);
}
.amzTopRow{ display:flex; gap:10px; align-items:center; }
.amzBack{
  width: 40px; height: 40px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.06);
  cursor:pointer;
  display:flex; align-items:center; justify-content:center;
}
.amzBack:hover{ background: rgba(255,255,255,.10); }

.amzBrand{ min-width:0; }
.amzBrandTitle{ font-weight:1000; font-size:18px; line-height:1.1; color:#fff; }
.amzBrandSub{ margin-top:2px; font-size:12px; font-weight:800; color: rgba(255,255,255,.72); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.amzTopActions{ margin-left:auto; display:flex; gap:8px; }
.amzIcon{
  width: 40px; height: 40px; border-radius: 12px;
  border: 1px solid rgba(255,255,255,.14);
  background: rgba(255,255,255,.06);
  cursor:pointer;
  display:flex; align-items:center; justify-content:center;
}
.amzIcon:hover{ background: rgba(255,255,255,.10); }

.amzCard{
  margin-top: 10px;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow);
}

.amzBody{ padding: 14px; }

.amzTitleRow{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
.amzH1{
  margin:0;
  font-size: 20px;
  font-weight: 1000;
  line-height: 1.15;
  color: var(--text);
  flex: 1 1 240px;
  min-width: 0;
}
.amzPrice{ font-size: 18px; font-weight: 1000; margin-top: 8px; color: var(--text); }

.amzPills{ display:flex; gap:8px; flex-wrap:wrap; margin-top: 8px; }
.amzPill{
  display:inline-flex; align-items:center; gap:6px;
  padding: 7px 10px;
  border-radius: 999px;
  border: 1px solid rgba(15,23,42,.12);
  background: rgba(15,23,42,.03);
  font-size: 12px;
  font-weight: 900;
}
.amzPillGreen{ border-color: rgba(34,197,94,.22); background: rgba(34,197,94,.10); color:#0f5132; }
.amzPillOut{ border-color: rgba(185,28,28,.18); background: rgba(185,28,28,.08); color:#991b1b; }
.amzPillFeatured{ border-color: rgba(243,168,71,.35); background: rgba(243,168,71,.18); color:#7c5a00; }

.amzDesc{ margin: 10px 0 0; color: #374151; font-size: 14px; line-height: 1.55; }
.amzDescMuted{ margin: 10px 0 0; color: #9CA3AF; font-size: 14px; line-height: 1.55; }

.amzReportRow{ margin-top: 12px; display:flex; justify-content:flex-end; }
.amzReportBtn{
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(15,23,42,.12);
  background:#fff;
  cursor:pointer;
  font-weight: 900;
  font-size: 12px;
  color: var(--text);
}
.amzReportBtn:hover{ box-shadow: 0 10px 18px rgba(15,23,42,.08); }

.amzCta{
  margin-top: 14px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(15,23,42,.12);
  background: #FAFAF9;
  display:flex;
  gap:10px;
  align-items:center;
}
.amzBtnGhost{
  flex:1;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(15,23,42,.14);
  background:#fff;
  cursor:pointer;
  font-weight: 1000;
  font-size: 12px;
  color: var(--text);
}
.amzBtnGhost:hover{ box-shadow: 0 10px 18px rgba(15,23,42,.08); }

.amzBtnWhats{
  flex:1;
  padding: 12px 14px;
  border-radius: 12px;
  border: none;
  background: #22C55E;
  color: #fff;
  cursor:pointer;
  font-weight: 1000;
  font-size: 12px;
}
.amzBtnPrimary{
  flex:1.1;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid rgba(0,0,0,.18);
  background: linear-gradient(180deg, var(--accent2), var(--accent));
  color: #111827;
  cursor:pointer;
  font-weight: 1000;
  font-size: 12px;
}
.amzBtnDisabled{ background: #9CA3AF !important; border-color: transparent !important; cursor:not-allowed !important; color:#fff !important; }

.amzSeller{
  margin-top: 12px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid rgba(15,23,42,.12);
  background: #fff;
  display:flex;
  gap:10px;
  align-items:center;
  justify-content:space-between;
}
.amzSellerName{ font-weight: 1000; font-size: 13px; color: var(--text); }
.amzSellerZone{ margin-top:2px; font-size: 12px; color: var(--muted); font-weight: 800; }
.amzSellerBtn{
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(15,23,42,.12);
  background: #fff;
  cursor:pointer;
  font-weight: 1000;
  font-size: 12px;
  color: var(--text);
}
.amzSellerBtn:hover{ box-shadow: 0 10px 18px rgba(15,23,42,.08); }

`;

return (
  <div className="amzPage">
    <style>{amzCss}</style>

    <div className="amzWrap">
      {/* Top bar */}
      <div className="amzTopbar">
        <div className="amzTopRow">
          <button onClick={() => navigate(-1)} className="amzBack" aria-label="Volver">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="amzBrand">
            <div className="amzBrandTitle">Lokaly</div>
            <div className="amzBrandSub">
              {data.seller.clusterName ? (
                <>
                  {data.seller.clusterName} <span style={{ opacity: 0.75 }}>· {data.seller.name}</span>
                </>
              ) : (
                <span style={{ opacity: 0.9 }}>{data.seller.name}</span>
              )}
            </div>
          </div>

          <div className="amzTopActions">
            {data.seller.slug ? (
              <button
                onClick={() => navigate(`/catalog/${data.seller.slug}`)}
                className="amzIcon"
                aria-label="Ver catálogo"
                title="Ver catálogo"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l1-5h16l1 5" />
                  <path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
                  <path d="M9 21V12h6v9" />
                </svg>
              </button>
            ) : null}

            <button onClick={copyLink} className="amzIcon" aria-label="Copiar link" title="Copiar link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Product */}
      <section className="amzCard">
        {gallery.length > 0 ? (
          <ProductImageCarousel images={gallery} alt={data.name} isMobile={isMobile} />
        ) : (
          <div style={{ ...s.noImg, height: isMobile ? 280 : 360 }}>Sin imagen</div>
        )}

        <div className="amzBody">
          <div className="amzTitleRow">
            <h1 className="amzH1" style={{ fontSize: isMobile ? 18 : 20 }}>{data.name}</h1>
          </div>

          <div className="amzPills">
            {data.featured && <span className="amzPill amzPillFeatured">⭐ Destacado</span>}
            <span className={`amzPill ${isOutOfStock ? "amzPillOut" : "amzPillGreen"}`}>{stockLabel}</span>
            <span className="amzPill">📍 Local</span>
          </div>

          <div className="amzPrice" style={{ fontSize: isMobile ? 16 : 18 }}>{moneyMXN(data.price)}</div>

          {data.description ? (
            <p className="amzDesc">{data.description}</p>
          ) : (
            <p className="amzDescMuted">Este producto no tiene descripción.</p>
          )}

          <div className="amzReportRow">
            <button
              onClick={() => {
                try {
                  trackEvent({
                    name: "REPORT_OPEN",
                    domain: "report",
                    visitorId: getVisitorId(),
                    catalogId: data?.seller?.slug || data?.seller?.id || "unknown",
                    productId: data?.id,
                    path: window.location.pathname,
                  });
                } catch {}
                setReportOpen(true);
              }}
              className="amzReportBtn"
            >
              🚩 Reportar
            </button>
          </div>

          {/* CTA */}
          <div className="amzCta">
            <button onClick={copyLink} className="amzBtnGhost">Copiar link</button>

            <button
              onClick={() => {
                try {
                  const visitorId = getVisitorId();
                  const catalogId = data?.seller?.id || data?.seller?.slug || "unknown";
                  trackEvent({
                    name: "WHATSAPP_CLICK",
                    domain: "whatsapp",
                    visitorId,
                    catalogId,
                    productId: data?.id,
                    path: window.location.pathname,
                    props: {
                      source: "product_cta",
                      sellerName: data?.seller?.name,
                      sellerSlug: data?.seller?.slug,
                      productName: data?.name,
                      price: data?.price,
                    },
                  });
                } catch {}
                openWhatsApp(data.seller.whatsapp ?? "", whatsappMessage);
              }}
              className="amzBtnWhats"
            >
              WhatsApp
            </button>

            <button
              onClick={openOrderModal}
              className={`amzBtnPrimary ${isOutOfStock ? "amzBtnDisabled" : ""}`}
              disabled={isOutOfStock}
              title={isOutOfStock ? "Producto agotado" : "Enviar solicitud al vendedor"}
            >
              {isOutOfStock ? "Agotado" : "Comprar"}
            </button>
          </div>

          {/* Seller */}
          <div className="amzSeller">
            <div style={{ minWidth: 0 }}>
              <div className="amzSellerName" style={clamp(1)}>{data.seller.name}</div>
              <div className="amzSellerZone" style={clamp(1)}>
                {data.seller.clusterName ? data.seller.clusterName : "Vendedor en Lokaly"}
              </div>
            </div>

            <button
              onClick={() => navigate(`/catalog/${data.seller.slug}`)}
              className="amzSellerBtn"
              disabled={!data.seller.slug}
              title={!data.seller.slug ? "Catálogo no disponible" : "Ver catálogo"}
            >
              Ver catálogo del vendedor
            </button>
          </div>
        </div>
      </section>
    </div>

    {/* ✅ Pro sheet + report modal igual */}
    <OrderSheet
      open={orderOpen}
      onClose={() => setOrderOpen(false)}
      productName={data.name}
      availableQty={available}
      buyerName={buyerName}
      setBuyerName={setBuyerName}
      buyerWhatsapp={buyerWhatsapp}
      setBuyerWhatsapp={setBuyerWhatsapp}
      qty={qty}
      setQty={setQty}
      note={note}
      setNote={setNote}
      submitting={submitting}
      canSubmit={canSubmit}
      onSubmit={submitOrderRequest}
      orderOk={orderOk}
      onOpenWhats={() => {
        try {
          const visitorId = getVisitorId();
          const catalogId = data?.seller?.id || data?.seller?.slug || "unknown";
          trackEvent({
            name: "WHATSAPP_CLICK",
            domain: "whatsapp",
            visitorId,
            catalogId,
            productId: data?.id,
            path: window.location.pathname,
            props: {
              source: "order_success",
              sellerName: data?.seller?.name,
              sellerSlug: data?.seller?.slug,
              productName: data?.name,
              price: data?.price,
              orderId: orderOk?.id ?? null,
            },
          });
        } catch {}
        openWhatsApp(data.seller.whatsapp ?? "", whatsappMessage);
      }}
    />

    <ReportModal
      open={reportOpen}
      onClose={() => setReportOpen(false)}
      productId={data.id}
      catalogSlug={data.seller.slug || null}
    />
  </div>
);
    
}

/* =======================
   Styles (mobile-first)
======================= */

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#F6F6F4", color: "#111827" },
  container: { maxWidth: 720, margin: "0 auto", padding: "14px 14px 0" },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "#F6F6F4",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 0 10px",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
  },
  brandTitle: { fontWeight: 1000, fontSize: 18, lineHeight: 1.1 },
  brandSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  headerRight: { marginLeft: "auto", display: "flex", gap: 8, flex: "0 0 auto" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  card: {
    background: "#fff",
    borderRadius: 18,
    border: "1px solid #E5E7EB",
    overflow: "hidden",
    boxShadow: "0 14px 30px rgba(17,24,39,0.08)",
  },
  cardBody: { padding: 14 },

  titleRow: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 8 },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 1000,
    lineHeight: 1.15,
    flex: "1 1 220px",
    minWidth: 0,
  },
  price: { fontSize: 18, fontWeight: 1000, marginBottom: 10 },

  pillFeatured: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    background: "#F5E7B6",
    border: "1px solid #E7D28A",
    color: "#7C5A00",
    whiteSpace: "nowrap",
  },
  pillAvailable: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    background: "#DCFCE7",
    color: "#16A34A",
    whiteSpace: "nowrap",
  },
  pillOut: {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    background: "#FEE2E2",
    color: "#B91C1C",
    whiteSpace: "nowrap",
  },

  desc: { margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.55 },
  descMuted: { margin: 0, fontSize: 14, color: "#9CA3AF", lineHeight: 1.55 },

  sellerCTA: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    background: "#cacfdaff",
    color: "#F9FAFB",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  sellerStrip: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    background: "#111827",
    color: "#F9FAFB",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sellerName: { fontWeight: 1000, fontSize: 13, ...clamp(1) },
  sellerZone: { fontSize: 12, opacity: 0.85, marginTop: 2, ...clamp(1) },

  btnGhost: {
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid rgba(249,250,251,0.35)",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    color: "#F9FAFB",
    whiteSpace: "nowrap",
  },

  btnGhostDark: {
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    color: "#111827",
  },
  btnBlack: {
    padding: "10px 12px",
    borderRadius: 999,
    border: "none",
    background: "#111827",
    color: "#F9FAFB",
    cursor: "pointer",
    fontWeight: 950,
  },

  /* carousel */
  media: { position: "relative", width: "100%", backgroundColor: "#F3F4F6", cursor: "zoom-in" },
  mediaImg: { width: "100%", objectFit: "cover", display: "block" },
  mediaNavLeft: {
    position: "absolute",
    top: "50%",
    left: 10,
    transform: "translateY(-50%)",
    width: 32,
    height: 32,
    borderRadius: 999,
    border: "none",
    backgroundColor: "rgba(17,24,39,0.55)",
    color: "#F9FAFB",
    cursor: "pointer",
    fontSize: 18,
  },
  mediaNavRight: {
    position: "absolute",
    top: "50%",
    right: 10,
    transform: "translateY(-50%)",
    width: 32,
    height: 32,
    borderRadius: 999,
    border: "none",
    backgroundColor: "rgba(17,24,39,0.55)",
    color: "#F9FAFB",
    cursor: "pointer",
    fontSize: 18,
  },
  dots: {
    position: "absolute",
    bottom: 10,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.45)",
  },
  dot: { height: 7, borderRadius: 999, backgroundColor: "#FACC15" },

  noImg: {
    height: 360,
    background: "#F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9CA3AF",
    fontWeight: 900,
  },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    backgroundColor: "rgba(15,23,42,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalFrame: {
    position: "relative",
    maxWidth: "min(980px, 100%)",
    maxHeight: "90vh",
    width: "100%",
  },
  modalImg: {
    width: "100%",
    maxHeight: "90vh",
    objectFit: "contain",
    borderRadius: 18,
    backgroundColor: "#000",
  },
  modalClose: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "none",
    backgroundColor: "rgba(15,23,42,0.9)",
    color: "#F9FAFB",
    fontSize: 18,
    cursor: "pointer",
  },
  modalNavLeft: {
    position: "absolute",
    top: "50%",
    left: 10,
    transform: "translateY(-50%)",
    width: 44,
    height: 44,
    borderRadius: 999,
    border: "none",
    backgroundColor: "rgba(15,23,42,0.9)",
    color: "#F9FAFB",
    fontSize: 22,
    cursor: "pointer",
  },
  modalNavRight: {
    position: "absolute",
    top: "50%",
    right: 10,
    transform: "translateY(-50%)",
    width: 44,
    height: 44,
    borderRadius: 999,
    border: "none",
    backgroundColor: "rgba(15,23,42,0.9)",
    color: "#F9FAFB",
    fontSize: 22,
    cursor: "pointer",
  },

  bottomBar: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    background: "rgba(246,246,244,0.94)",
    backdropFilter: "blur(10px)",
    borderTop: "1px solid #E5E7EB",
    padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
    display: "flex",
    gap: 10,
    justifyContent: "center",
  },
  bottomGhost: {
    flex: 1,
    maxWidth: 220,
    padding: "12px 14px",
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    color: "#111827",
  },
  bottomWhats: {
    flex: 1,
    maxWidth: 260,
    padding: "12px 14px",
    borderRadius: 999,
    border: "none",
    background: "#22C55E",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 12,
  },
  bottomBlack: {
    flex: 1,
    maxWidth: 260,
    padding: "12px 14px",
    borderRadius: 999,
    border: "none",
    background: "#111827",
    color: "#fff",
    fontWeight: 950,
    fontSize: 12,
  },
  bottomDisabled: {
    background: "#9CA3AF",
    cursor: "not-allowed",
  },

  errorCard: { background: "#fff", border: "1px solid #FCA5A5", borderRadius: 18, padding: 14 },
  errorTitle: { fontWeight: 1000, color: "#991B1B" },
  errorText: { marginTop: 6, color: "#6B7280" },

  skeletonTop: { height: 380, borderRadius: 18, background: "#ECECEC", border: "1px solid #E5E7EB" },
  skeletonBody: {
    marginTop: 12,
    height: 280,
    borderRadius: 18,
    background: "#ECECEC",
    border: "1px solid #E5E7EB",
  },

  toast: {
    position: "fixed",
    left: "50%",
    bottom: "calc(90px + env(safe-area-inset-bottom))",
    transform: "translateX(-50%)",
    zIndex: 99999,
    padding: "10px 14px",
    borderRadius: 999,
    background: "rgba(17,24,39,0.9)",
    color: "#fff",
    fontWeight: "900",
    fontSize: "12px",
    boxShadow: "0 22px 60px rgba(0,0,0,0.25)",
    transition: "opacity 0.2s ease",
    opacity: "0",
    pointerEvents: "none",
  },

  /* ===== Pro bottom sheet ===== */
  sheetBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    background: "rgba(15,23,42,0.45)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    padding: 12,
  },
  sheet: {
    width: "min(720px, 100%)",
    background: "#fff",
    borderRadius: 18,
    border: "1px solid #E5E7EB",
    boxShadow: "0 24px 90px rgba(0,0,0,0.25)",
    overflow: "hidden",
    maxHeight: "88vh",
    display: "flex",
    flexDirection: "column",
  },
  sheetHeaderPro: {
    padding: "14px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderBottom: "1px solid #E5E7EB",
    background: "#fff",
  },
  sheetTitle: { fontWeight: 1000, fontSize: 16, color: "#111827" },
  sheetPillsRow: { marginTop: 6 },
  sheetPill: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    background: "#F5F1EA",
    border: "1px solid #E7E2D8",
    color: "#111827",
  },
  sheetPillOut: {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    background: "#FEE2E2",
    border: "1px solid #FCA5A5",
    color: "#B91C1C",
  },
  sheetClosePro: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 1000,
    color: "#111827",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
  },
  sheetBody: { padding: 14, overflow: "auto", display: "grid", gap: 12 },

  productCard: {
    borderRadius: 14,
    border: "1px solid #E5E7EB",
    background: "#FAFAF9",
    padding: 12,
  },
  productCardLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  productCardName: { marginTop: 4, fontSize: 14, fontWeight: 1000, color: "#111827" },

  formGridPro: { display: "grid", gap: 12 },
  fieldPro: { display: "grid", gap: 6 },
  labelPro: { fontSize: 12, fontWeight: 900, color: "#111827" },
  inputPro: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    padding: "12px 12px",
    fontSize: 14,
    outline: "none",
    background: "#fff",
    color: "#111827",
  },
  helperPro: { fontSize: 12, color: "#6B7280" },

  qtyRowPro: {
    display: "grid",
    gridTemplateColumns: "44px 1fr 44px",
    gap: 10,
    alignItems: "center",
  },
  qtyBtnPro: {
    width: 44,
    height: 44,
    borderRadius: 14,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 1000,
    fontSize: 18,
    color: "#111827",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
  },
  qtyInputPro: {
    width: "100%",
    height: 44,
    borderRadius: 14,
    border: "1px solid #E5E7EB",
    background: "#fff",
    color: "#111827",
    textAlign: "center",
    fontWeight: 1000,
    fontSize: 14,
    outline: "none",
  },
  textareaPro: {
    width: "100%",
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    padding: "12px 12px",
    fontSize: 14,
    minHeight: 96,
    outline: "none",
    resize: "vertical",
    background: "#fff",
    color: "#111827",
  },
  errorPro: { fontSize: 12, color: "#B91C1C", fontWeight: 900 },

  tipCardPro: {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    borderRadius: 14,
    border: "1px dashed #E5E7EB",
    background: "#FAFAF9",
    padding: 12,
  },
  tipIconPro: {
    width: 26,
    height: 26,
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 1000,
    color: "#111827",
    flex: "0 0 auto",
  },
  tipTitlePro: { fontWeight: 1000, fontSize: 12, color: "#111827" },
  tipTextPro: { marginTop: 2, fontSize: 12, color: "#6B7280", lineHeight: 1.35 },

  sheetActionsPro: {
    position: "sticky",
    bottom: 0,
    background: "rgba(255,255,255,0.96)",
    backdropFilter: "blur(10px)",
    borderTop: "1px solid #E5E7EB",
    padding: "12px 14px calc(12px + env(safe-area-inset-bottom))",
    display: "grid",
    gridTemplateColumns: "1fr 1.35fr",
    gap: 10,
  },
  sheetGhostPro: {
    height: 44,
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 1000,
    color: "#111827",
  },
  sheetPrimaryPro: {
    height: 44,
    borderRadius: 999,
    border: "none",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 1000,
  },
  sheetPrimaryDisabledPro: {
    background: "#9CA3AF",
    cursor: "not-allowed",
  },
  sheetPrimaryGreenPro: {
    height: 44,
    borderRadius: 999,
    border: "none",
    background: "#22C55E",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 1000,
  },

  okBox: { padding: 12, borderRadius: 14, border: "1px solid #E5E7EB", background: "#F9FAFB" },
};