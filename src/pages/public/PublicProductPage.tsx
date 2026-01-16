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

/* =======================
   Helpers
======================= */

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

      const normalized: PublicProductDetail = {
        id: raw.id,
        name: raw.title ?? raw.name,
        price: Number(raw.price ?? 0),
        description: raw.description ?? raw.shortDescription ?? raw.longDescription,
        images: imgObjects,
        featured: !!raw.featured,
        availableQuantity: raw.availableQuantity ?? null,
        seller: {
          id: raw.sellerId ?? "",
          name: raw.sellerName ?? "Vendedor",
          slug: raw.sellerSlug ?? "",
          whatsapp: raw.sellerWhatsapp ?? undefined,
          clusterName: raw.clusterName ?? raw.sellerClusterName ?? undefined,
        },
      };

      setData(normalized);
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
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copiado ✅");
    } catch {
      alert("No se pudo copiar. Copia manual: " + window.location.href);
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
        } catch {}
        throw new Error(msg);
      }

      const saved = await res.json().catch(() => ({}));
      setOrderOk({ id: saved?.id });
      toast("Solicitud enviada ✅");
    } catch (e: any) {
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

  return (
    <div style={s.page}>
      <div style={{ ...s.container, padding: isMobile ? "12px 12px 0" : "14px 14px 0" }}>
        {/* Header */}
        <header style={s.header}>
          <button onClick={() => navigate(-1)} style={s.backBtn} aria-label="Volver">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#111827"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ display: "block" }}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div style={{ minWidth: 0 }}>
            <div style={s.brandTitle}>Lokaly</div>
            <div style={s.brandSub}>
              {data.seller.clusterName ? (
                <>
                  {data.seller.clusterName}{" "}
                  <span style={{ opacity: 0.55 }}>· {data.seller.name}</span>
                </>
              ) : (
                <span style={{ opacity: 0.75 }}>{data.seller.name}</span>
              )}
            </div>
          </div>

          <div style={s.headerRight}>
            {data.seller.slug ? (
              <button
                onClick={() => navigate(`/catalog/${data.seller.slug}`)}
                style={s.iconBtn}
                aria-label="Ver catálogo"
                title="Ver catálogo"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#111827"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "block" }}
                >
                  <path d="M3 9l1-5h16l1 5" />
                  <path d="M5 9v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9" />
                  <path d="M9 21V12h6v9" />
                </svg>
              </button>
            ) : null}

            <button onClick={copyLink} style={s.iconBtn} aria-label="Copiar link" title="Copiar link">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#111827"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: "block" }}
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
        </header>

        {/* Product card */}
        <section style={s.card}>
          {gallery.length > 0 ? (
            <ProductImageCarousel images={gallery} alt={data.name} isMobile={isMobile} />
          ) : (
            <div style={{ ...s.noImg, height: isMobile ? 280 : 360 }}>Sin imagen</div>
          )}

          <div style={{ ...s.cardBody, padding: isMobile ? 12 : 14 }}>
            <div style={s.titleRow}>
              <h1 style={{ ...s.title, fontSize: isMobile ? 18 : 20 }}>{data.name}</h1>
              {data.featured && <span style={s.pillFeatured}>Destacado ✨</span>}
              <span style={isOutOfStock ? s.pillOut : s.pillAvailable}>{stockLabel}</span>
            </div>

            <div style={{ ...s.price, fontSize: isMobile ? 16 : 18 }}>{moneyMXN(data.price)}</div>

            {data.description ? (
              <p style={s.desc}>{data.description}</p>
            ) : (
              <p style={s.descMuted}>Este producto no tiene descripción.</p>
            )}

            {/* Sticky CTA */}
            <div style={s.sellerCTA}>
              <button onClick={copyLink} style={s.bottomGhost}>
                Copiar link
              </button>

              <button
                onClick={() => openWhatsApp(data.seller.whatsapp ?? "", whatsappMessage)}
                style={s.bottomWhats}
              >
                WhatsApp
              </button>

              <button
                onClick={openOrderModal}
                style={{ ...s.bottomBlack, ...(isOutOfStock ? s.bottomDisabled : null) }}
                disabled={isOutOfStock}
                title={isOutOfStock ? "Producto agotado" : "Enviar solicitud al vendedor"}
              >
                {isOutOfStock ? "Agotado" : "Comprar"}
              </button>
            </div>

            {/* Seller strip */}
            <div style={s.sellerStrip}>
              <div style={{ minWidth: 0 }}>
                <div style={s.sellerName}>{data.seller.name}</div>
                <div style={s.sellerZone}>
                  {data.seller.clusterName ? data.seller.clusterName : "Vendedor en Lokaly"}
                </div>
              </div>

              <button
                onClick={() => navigate(`/catalog/${data.seller.slug}`)}
                style={s.btnGhost}
                disabled={!data.seller.slug}
                title={!data.seller.slug ? "Catálogo no disponible" : "Ver catálogo"}
              >
                Ver catálogo del vendedor
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* ✅ Pro sheet */}
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
        onOpenWhats={() => openWhatsApp(data.seller.whatsapp ?? "", whatsappMessage)}
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