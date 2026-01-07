import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PUBLIC_BASE_URL, PUBLIC_ORIGIN } from "../../api";

type PublicProductDetail = {
  id: string;
  name: string;
  price: number;
  description?: string;
  imageUrls: string[];
  featured?: boolean;
  seller: {
    id: string;
    name: string;
    slug: string;
    whatsapp?: string;
    clusterName?: string;
  };
};

function resolveImageUrl(rawUrl?: string | null): string | undefined {
  if (!rawUrl) return undefined;
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;
  const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  return `${PUBLIC_ORIGIN}${path}`;
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

    // safari compatibility
    if (mq.addEventListener) mq.addEventListener("change", handler);
    else mq.addListener(handler);

    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", handler);
      else mq.removeListener(handler);
    };
  }, [breakpointPx]);

  return isMobile;
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
   Page
======================= */

export function PublicProductPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile(520);

  const [data, setData] = useState<PublicProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const productUrl = useMemo(() => window.location.href, []);

  const loadProduct = useCallback(async () => {
    if (!productId) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${PUBLIC_BASE_URL}/products/${productId}`);
      if (!res.ok) throw new Error("No se pudo cargar el producto");

      const raw = await res.json();

      const rawImages: string[] = Array.isArray(raw.imageUrls)
        ? raw.imageUrls
        : Array.isArray(raw.images)
        ? raw.images
        : [];

      const single = (raw.imageUrl as string | undefined) || (raw.image as string | undefined);

      const resolvedImages: string[] = rawImages
        .map((u) => resolveImageUrl(u))
        .filter(Boolean) as string[];

      if (single) {
        const s = resolveImageUrl(single);
        if (s) resolvedImages.push(s);
      }

      const normalized: PublicProductDetail = {
        id: raw.id,
        name: raw.title ?? raw.name,
        price: Number(raw.price ?? 0),
        description: raw.description ?? raw.shortDescription ?? raw.longDescription,
        imageUrls: resolvedImages,
        featured: !!raw.featured,
        seller: {
          id: raw.seller?.id ?? raw.sellerId,
          name: raw.seller?.fullName ?? raw.seller?.name ?? "Vendedor",
          slug: raw.seller?.slug ?? raw.sellerSlug ?? "",
          whatsapp: raw.seller?.whatsapp ?? undefined,
          clusterName: raw.seller?.clusterName ?? raw.seller?.colonyName,
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

  const whatsappMessage =
    `Hola! Me interesa ${data.name} (${moneyMXN(data.price)}). ` + `Lo vi aquí: ${productUrl}`;

  return (
    <div style={s.page}>
      <div style={{ ...s.container, padding: isMobile ? "12px 12px 0" : "14px 14px 0" }}>
        {/* Header like app */}
        <header style={s.header}>
          <button onClick={() => navigate(-1)} style={s.backBtn} aria-label="Volver">
            ←
          </button>

          <div style={{ minWidth: 0 }}>
            <div style={s.brandTitle}>Lokaly</div>
            <div style={s.brandSub}>
              {data.seller.clusterName || "Tu zona"}{" "}
              <span style={{ opacity: 0.55 }}>· {data.seller.name}</span>
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
                🏬
              </button>
            ) : null}

            <button onClick={copyLink} style={s.iconBtn} aria-label="Copiar link" title="Copiar link">
                <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="gray"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
            </button>
          </div>
        </header>

        {/* Product card */}
        <section style={s.card}>
          {data.imageUrls.length > 0 ? (
            <ProductImageCarousel images={data.imageUrls} alt={data.name} isMobile={isMobile} />
          ) : (
            <div style={{ ...s.noImg, height: isMobile ? 280 : 360 }}>Sin imagen</div>
          )}

          <div style={{ ...s.cardBody, padding: isMobile ? 12 : 14 }}>
            <div style={s.titleRow}>
              <h1 style={{ ...s.title, fontSize: isMobile ? 18 : 20 }}>{data.name}</h1>

              {data.featured && <span style={s.pillFeatured}>Destacado ✨</span>}
              <span style={s.pillAvailable}>Disponible</span>
            </div>

            <div style={{ ...s.price, fontSize: isMobile ? 16 : 18 }}>{moneyMXN(data.price)}</div>

            {data.description ? (
              <p style={s.desc}>{data.description}</p>
            ) : (
              <p style={s.descMuted}>Este producto no tiene descripción.</p>
            )}

            {/* Seller strip */}
            <div style={s.sellerStrip}>
              <div style={{ minWidth: 0 }}>
                <div style={s.sellerName}>{data.seller.name}</div>
                <div style={s.sellerZone}>{data.seller.clusterName || "Tu zona"}</div>
              </div>

              <button
                onClick={() => navigate(`/catalog/${data.seller.slug}`)}
                style={s.btnGhost}
                disabled={!data.seller.slug}
                title={!data.seller.slug ? "Catálogo no disponible" : "Ver catálogo"}
              >
                Ver catálogo
              </button>
            </div>
          </div>
        </section>

        {/* Spacer para que el CTA sticky no tape contenido */}
        <div style={{ height: 92 }} />
      </div>

      {/* Sticky CTA bottom (like app) */}
      <div style={s.bottomBar}>
        <button onClick={copyLink} style={s.bottomGhost}>
          Copiar link
        </button>
        <button
          onClick={() => openWhatsApp(data.seller.whatsapp ?? "", whatsappMessage)}
          style={s.bottomWhats}
        >
          Pedir por WhatsApp
        </button>
      </div>
    </div>
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
   Styles (mobile-first)
======================= */

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#F6F6F4",
    color: "#111827",
  },
  container: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "14px 14px 0",
  },

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
    fontSize: 16,
    fontWeight: 900,
    flex: "0 0 auto",
  },
  brandTitle: { fontWeight: 1000, fontSize: 18, lineHeight: 1.1 },
  brandSub: { fontSize: 12, color: "#6B7280", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },

  headerRight: { marginLeft: "auto", display: "flex", gap: 8, flex: "0 0 auto" },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontSize: 16,
  },

  card: {
    background: "#fff",
    borderRadius: 18,
    border: "1px solid #E5E7EB",
    overflow: "hidden",
    boxShadow: "0 14px 30px rgba(17,24,39,0.08)",
  },
  cardBody: { padding: 14 },

  titleRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginBottom: 8,
  },
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

  desc: { margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.55 },
  descMuted: { margin: 0, fontSize: 14, color: "#9CA3AF", lineHeight: 1.55 },

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
    flex: 1.2,
    maxWidth: 320,
    padding: "12px 14px",
    borderRadius: 999,
    border: "none",
    background: "#22C55E",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 12,
  },

  errorCard: {
    background: "#fff",
    border: "1px solid #FCA5A5",
    borderRadius: 18,
    padding: 14,
  },
  errorTitle: { fontWeight: 1000, color: "#991B1B" },
  errorText: { marginTop: 6, color: "#6B7280" },

  skeletonTop: {
    height: 380,
    borderRadius: 18,
    background: "#ECECEC",
    border: "1px solid #E5E7EB",
  },
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
};

function clamp(lines: number): React.CSSProperties {
  return {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: lines as any,
    overflow: "hidden",
  };
}