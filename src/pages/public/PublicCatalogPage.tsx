// src/pages/catalog/PublicCatalogPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PUBLIC_BASE_URL } from "../../api";

/* =======================
   Types
======================= */
export type CatalogImageDto = {
  originalUrl: string;
  mediumUrl: string;
  thumbUrl: string;
};

type PublicProduct = {
  id: string;
  name: string;
  price: number;
  images: CatalogImageDto[]; // ✅ antes: imageUrls
  shortDescription?: string;
  featured?: boolean;
  active?: boolean;
};

type PublicSeller = {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  description?: string;
  clusterName?: string;
  whatsapp?: string;
};

type PublicCatalogResponse = {
  seller: PublicSeller;
  products: PublicProduct[];
};

/* =======================
   Helpers
======================= */

function resolveCatalogId(slug?: string) {
  return slug && slug.trim() ? slug : "unknown";
}

export function resolveImageUrl(rawUrl?: string | null): string | undefined {
  if (!rawUrl) return undefined;

  // ya absoluta
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

  const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;

  // si ya viene con /api, en local lo resuelve el proxy, en prod es same-origin
  if (path.startsWith("/api/")) return path;

  const isLocal =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const origin = isLocal ? "https://lokaly.site" : window.location.origin;

  return `${origin}${path}`;
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

function clamp(lines: number): React.CSSProperties {
  return {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    WebkitLineClamp: lines as any,
    overflow: "hidden",
  };
}

function safeNumber(v: any): number {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof v === "object" && typeof v.toString === "function") {
    const s = String(v.toString());
    const cleaned = s.replace(/[^\d.]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function isFalseyBoolean(v: any) {
  return v === false || v === "false" || v === 0 || v === "0";
}

// ✅ convierte CatalogImageDto[] -> string[] usando el tamaño deseado
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

// =======================
// Analytics (public)
// =======================

const ANALYTICS_BASE = `${PUBLIC_BASE_URL}/v1/analytics`;

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
   Image carousel with zoom
======================= */

function ProductImageCarousel({
  images,
  alt,
}: {
  images: CatalogImageDto[];
  alt: string;
}) {
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // thumb para cards, original para modal
  const thumbs = useMemo(() => imagesToUrls(images, "thumb"), [images]);
  const originals = useMemo(() => imagesToUrls(images, "original"), [images]);

  if (!thumbs.length) return null;

  const total = thumbs.length;
  const currentThumb = thumbs[index] ?? thumbs[0];
  const currentOriginal = originals[index] ?? originals[0];

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + total) % total);
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % total);
  };

  return (
    <>
      {/* Card: thumb */}
      <div style={s.media} onClick={() => setIsOpen(true)}>
        <img
          src={currentThumb}
          alt={alt}
          loading="lazy"
          decoding="async"
          style={s.mediaImg}
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
          </>
        )}

        {total > 1 && (
          <div style={s.dots}>
            {thumbs.map((_, i) => (
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
        )}
      </div>

      {/* Modal: original (con fallback al thumb mientras carga) */}
      {isOpen && (
        <div onClick={() => setIsOpen(false)} style={s.modalBackdrop}>
          <div onClick={(e) => e.stopPropagation()} style={s.modalFrame}>
            {/* fondo: thumb */}
            <img
              src={currentThumb}
              alt={alt}
              style={{ ...s.modalImg, filter: "blur(8px)", transform: "scale(1.02)", opacity: 0.65 }}
            />

            {/* encima: original */}
            <img
              src={currentOriginal}
              alt={alt}
              style={{ ...s.modalImg, position: "absolute", inset: 0, filter: "none", opacity: 1 }}
              loading="eager"
              decoding="async"
            />

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
   Sorting
======================= */

type SortKey = "FEATURED" | "PRICE_ASC" | "PRICE_DESC" | "NAME_ASC";

function sortProducts(list: PublicProduct[], sort: SortKey) {
  const out = [...list];

  out.sort((a, b) => {
    if (sort === "FEATURED") {
      const fa = a.featured ? 1 : 0;
      const fb = b.featured ? 1 : 0;
      if (fb !== fa) return fb - fa;
      return (a.name || "").localeCompare(b.name || "");
    }
    if (sort === "PRICE_ASC") return (a.price ?? 0) - (b.price ?? 0);
    if (sort === "PRICE_DESC") return (b.price ?? 0) - (a.price ?? 0);
    return (a.name || "").localeCompare(b.name || "");
  });

  return out;
}

/* =======================
   Normalizers
======================= */

function normalizeSeller(raw: any, slug: string): PublicSeller {
  const sRaw = raw?.seller ?? raw?.catalog?.seller ?? raw?.publisher ?? raw?.owner ?? raw?.catalog ?? raw;

  const name =
    sRaw?.fullName ??
    sRaw?.name ??
    sRaw?.displayName ??
    sRaw?.title ??
    "Vendedor";

  const whatsapp =
    sRaw?.whatsapp ??
    sRaw?.phoneNumber ??
    sRaw?.phone ??
    sRaw?.phoneE164 ??
    undefined;

  return {
    id: sRaw?.id ?? sRaw?.sellerId ?? sRaw?.publisherId ?? "unknown",
    name,
    slug: sRaw?.slug ?? sRaw?.publicSlug ?? slug,
    avatarUrl: resolveImageUrl(sRaw?.avatarUrl ?? sRaw?.avatar ?? sRaw?.photoUrl),
    description: sRaw?.description ?? sRaw?.bio ?? undefined,
    clusterName: sRaw?.clusterName ?? sRaw?.colonyName ?? sRaw?.cluster ?? undefined,
    whatsapp,
  };
}

function normalizeProducts(raw: any): PublicProduct[] {
  const list = raw?.products ?? raw?.items ?? raw?.data ?? [];
  if (!Array.isArray(list)) return [];

  return list
    .map((p: any) => {
      // ✅ NUEVO: soporta imageUrls como CatalogImageDto[] (objetos) o como string[]
      let imgObjects: CatalogImageDto[] = [];

      if (Array.isArray(p?.images)) {
        imgObjects = p.images as CatalogImageDto[];
      } else if (Array.isArray(p?.imageUrls)) {
        const arr = p.imageUrls;

        // si el primer elemento es string => legacy string[]
        if (typeof arr[0] === "string") {
          imgObjects = arr
            .map((u: any) => resolveImageUrl(String(u ?? "")))
            .filter(Boolean)
            .map((url: string) => ({ originalUrl: url!, mediumUrl: url!, thumbUrl: url! }));
        } else {
          // ✅ ya vienen objetos (como tu respuesta actual)
          imgObjects = arr as CatalogImageDto[];
        }
      }

      const active = p?.active;
      const deleted = p?.deleted;
      const draft = p?.draft;
      const paused = p?.paused;

      const isVisible =
        !isFalseyBoolean(active) &&
        !isFalseyBoolean(deleted) &&
        !isFalseyBoolean(draft) &&
        !isFalseyBoolean(paused);

      return {
        id: p?.id ?? p?._id ?? "",
        name: p?.title ?? p?.name ?? "Producto",
        price: safeNumber(p?.price),
        images: imgObjects,
        shortDescription: p?.shortDescription ?? p?.description ?? undefined,
        featured: !!(p?.featured ?? p?.isFeatured),
        active: isVisible,
      } as PublicProduct;
    })
    .filter((p: PublicProduct) => !!p.id && p.active !== false);
}

/* =======================
   Page
======================= */

export function PublicCatalogPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<PublicCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const [searchInDescription, setSearchInDescription] = useState(true);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [sort, setSort] = useState<SortKey>("FEATURED");

  const loadCatalog = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${PUBLIC_BASE_URL}/v1/public/catalog/${encodeURIComponent(slug)}`, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (res.status === 404) throw new Error("Catálogo no encontrado.");
      if (!res.ok) throw new Error("No se pudo cargar el catálogo.");

      const raw = await res.json();

      const normalized: PublicCatalogResponse = {
        seller: normalizeSeller(raw, slug),
        products: normalizeProducts(raw),
      };

      if (!normalized.products.length) throw new Error("Catálogo no encontrado.");

      setData(normalized);

      setData(normalized);

      // ✅ Analytics: CATALOG_VIEW (1 vez cada 10 min por catálogo)
      const visitorId = getVisitorId();
      const catalogId = resolveCatalogId(slug); // fallback
      const onceKey = `lokaly_evt_catalog_view_${catalogId}`;

      if (shouldSendOnce(onceKey, 10 * 60 * 1000)) {
        trackEvent({
          name: "CATALOG_VIEW",
          domain: "catalog",
          visitorId,
          catalogId,
          path: window.location.pathname,
          props: {
            slug,
            sellerName: normalized.seller?.name,
            productsCount: normalized.products?.length ?? 0,
            ua: navigator.userAgent,
          },
        });
      }

    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Error cargando catálogo");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const seller = data?.seller;

  async function copyCatalogLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast("Link copiado ✅");
    } catch {
      alert("No se pudo copiar. Copia manual: " + window.location.href);
    }
  }

const openWhatsAppGeneral = () => {
  if (!seller?.whatsapp) return alert("Este vendedor no tiene WhatsApp configurado.");

  // ✅ Analytics: WHATSAPP_CLICK (catalog header)
  try {
    const visitorId = getVisitorId();
    const catalogId = seller?.id || slug || "unknown";

    trackEvent({
      name: "WHATSAPP_CLICK",
      domain: "whatsapp",
      visitorId,
      catalogId,
      path: window.location.pathname,
      props: {
        source: "catalog_header",
        slug,
        sellerName: seller?.name,
        productsCount: data?.products?.length ?? 0,
      },
    });
  } catch {}

  openWhatsApp(
    seller.whatsapp,
    `Hola! Vi tu catálogo (${window.location.href}) y me interesa un producto.`
  );
};

  const filteredProducts = useMemo(() => {
    const list = data?.products ?? [];
    const q = query.trim().toLowerCase();

    let out = list;

    if (onlyFeatured) out = out.filter((p) => !!p.featured);

    if (q) {
      out = out.filter((p) => {
        const name = (p.name ?? "").toLowerCase();
        const desc = (p.shortDescription ?? "").toLowerCase();
        return searchInDescription ? name.includes(q) || desc.includes(q) : name.includes(q);
      });
    }

    return sortProducts(out, sort);
  }, [data?.products, onlyFeatured, query, searchInDescription, sort]);

  if (loading) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.skeletonTop} />
          <div style={s.skeletonGrid} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={s.page}>
        <div style={s.container}>
          <div style={s.errorCard}>
            <div style={s.errorTitle}>Error</div>
            <div style={s.errorText}>{error}</div>
            <button onClick={loadCatalog} style={s.btnBlack}>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <header style={s.header}>
          <div style={s.brandRow}>
            <div style={s.brandIcon}>⌂</div>

            <div style={{ minWidth: 0 }}>
              <div style={s.brandTitle}>Lokaly</div>
              <div style={s.brandSub}>
                {seller?.clusterName || "Catálogo de"}{" "}
                <span style={{ opacity: 0.55 }}>· {seller?.name ?? ""}</span>
              </div>
            </div>

            <div style={s.headerRight}>
              <button onClick={copyCatalogLink} style={s.iconBtn} aria-label="Copiar link">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="gray" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
              <button onClick={openWhatsAppGeneral} style={s.iconBtn} aria-label="WhatsApp">
                💬
              </button>
            </div>
          </div>

          <div style={s.controlsCard}>
            <div style={s.searchWrap}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Buscar (ej. "zapato caballero")`}
                style={s.searchInput}
              />
              <label style={s.checkboxRow}>
                <input
                  type="checkbox"
                  checked={searchInDescription}
                  onChange={(e) => setSearchInDescription(e.target.checked)}
                />
                <span>Buscar también en descripción</span>
              </label>
            </div>

            <div style={s.filtersRow}>
              <button
                onClick={() => setOnlyFeatured((v) => !v)}
                style={{ ...s.chip, ...(onlyFeatured ? s.chipActive : null) }}
              >
                {onlyFeatured ? "✓ " : ""}Solo destacados
              </button>

              <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={s.select}>
                <option value="FEATURED">Orden: destacados</option>
                <option value="PRICE_ASC">Precio: menor a mayor</option>
                <option value="PRICE_DESC">Precio: mayor a menor</option>
                <option value="NAME_ASC">Nombre: A-Z</option>
              </select>

              <button
                onClick={() => {
                  setQuery("");
                  setSearchInDescription(true);
                  setOnlyFeatured(false);
                  setSort("FEATURED");
                }}
                style={s.btnGhost}
              >
                Limpiar
              </button>
            </div>
          </div>
        </header>

        <main style={{ marginTop: 12 }}>
          {filteredProducts.length === 0 ? (
            <div style={s.empty}>
              <div style={s.emptyTitle}>Sin resultados</div>
              <div style={s.emptyText}>Prueba con otra búsqueda o quita filtros.</div>
            </div>
          ) : (
            <section style={s.grid}>
              {filteredProducts.map((p) => {
                // ✅ thumb para grid (rápido)
                const cardImages = imagesToUrls(p.images, "thumb");

                return (
                  <article key={p.id} style={s.card}>
                    <div style={{ position: "relative" }}>
                      {cardImages.length > 0 ? (
                        <ProductImageCarousel images={p.images} alt={p.name} />
                      ) : (
                        <div style={s.noImg}>Sin imagen</div>
                      )}

                      {p.featured && <div style={s.badgeFeatured}>Destacado ✨</div>}
                    </div>

                    <div style={s.cardBody}>
                      <div style={s.cardTitle} title={p.name}>
                        {p.name}
                      </div>

                      <div style={s.cardPrice}>{moneyMXN(p.price)}</div>

                      <div style={s.statusRow}>
                        <span style={s.statusAvailable}>Disponible</span>
                      </div>

                      <div style={s.cardActions}>
<button
  onClick={() => {
    const visitorId = getVisitorId();
    const catalogId = resolveCatalogId(slug);

    trackEvent({
      name: "PRODUCT_CLICK",
      domain: "catalog",
      visitorId,
      catalogId,
      productId: p.id,
      path: window.location.pathname,
      props: {
        slug,
        sellerName: seller?.name,
        productName: p.name,
        price: p.price,
        featured: !!p.featured,
      },
    });

    navigate(`/p/${p.id}`);
  }}
  style={s.btnGhostWide}
>
  Ver Detalles
</button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </main>

        <footer style={s.footer}>Catálogo · Lokaly · comparte tu link por WhatsApp</footer>
      </div>
    </div>
  );
}

/* =======================
   Tiny toast (sin libs)
======================= */

let toastTimer: ReturnType<typeof setTimeout> | null = null;

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

  if (toastTimer) clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    if (el) el.style.opacity = "0";
  }, 1100);
}

/* =======================
   Styles (app-like light)
======================= */

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#F6F6F4", color: "#111827" },
  container: { maxWidth: 980, margin: "0 auto", padding: "16px 14px 26px" },

  header: { position: "sticky", top: 0, zIndex: 20, background: "#F6F6F4", paddingBottom: 10 },

  brandRow: { display: "flex", alignItems: "center", gap: 10, paddingTop: 4 },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    background: "#111827",
    color: "#FACC15",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
  },
  brandTitle: { fontWeight: 1000, fontSize: 18, lineHeight: 1.1 },
  brandSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },

  headerRight: { marginLeft: "auto", display: "flex", gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontSize: 16,
  },

  controlsCard: {
    marginTop: 12,
    background: "#FFFFFF",
    border: "1px solid #E5E7EB",
    borderRadius: 16,
    padding: 10,
    boxShadow: "0 10px 22px rgba(17,24,39,0.06)",
  },

  searchWrap: { borderRadius: 14, background: "#F9FAFB", border: "1px solid #E5E7EB", padding: 10 },
  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: 14,
    padding: "10px 10px",
    borderRadius: 12,
    background: "#FFFFFF",
  },
  checkboxRow: { marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#111827", fontWeight: 700 },

  filtersRow: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 0.9fr",
    gap: 8,
    alignItems: "center",
  },

  chip: {
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 10,
    color: "#111827",
    whiteSpace: "nowrap",
  },
  chipActive: { background: "#F5E7B6", border: "1px solid #E7D28A" },

  select: {
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 10,
    color: "#111827",
  },

  btnGhost: {
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 10,
    color: "#111827",
  },
  btnBlack: {
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 999,
    border: "none",
    background: "#111827",
    color: "#F9FAFB",
    cursor: "pointer",
    fontWeight: 950,
  },

  grid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },

  card: {
    background: "#fff",
    borderRadius: 18,
    border: "1px solid #E5E7EB",
    overflow: "hidden",
    boxShadow: "0 14px 30px rgba(17,24,39,0.08)",
    display: "flex",
    flexDirection: "column",
  },

  cardBody: { padding: 10, display: "flex", flexDirection: "column", gap: 6 },

  cardTitle: { fontWeight: 1000, fontSize: 14, color: "#111827", ...clamp(1) },
  cardPrice: { fontWeight: 1000, fontSize: 14, color: "#111827" },

  statusRow: { display: "flex", gap: 8, alignItems: "center" },
  statusAvailable: { color: "#16A34A", fontWeight: 900, fontSize: 12 },

  badgeFeatured: {
    position: "absolute",
    left: 10,
    bottom: 10,
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    background: "#F5E7B6",
    border: "1px solid #E7D28A",
    color: "#7C5A00",
  },

  cardActions: { display: "flex", gap: 8, marginTop: 6 },
  btnGhostWide: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    color: "#111827",
  },

  noImg: {
    height: 155,
    background: "#F3F4F6",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#9CA3AF",
    fontWeight: 900,
  },

  footer: { textAlign: "center", marginTop: 16, color: "#9CA3AF", fontSize: 12 },

  empty: {
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 14px 30px rgba(17,24,39,0.08)",
  },
  emptyTitle: { fontWeight: 1000, fontSize: 16 },
  emptyText: { marginTop: 6, color: "#6B7280", fontSize: 13 },

  errorCard: { background: "#fff", border: "1px solid #FCA5A5", borderRadius: 18, padding: 14 },
  errorTitle: { fontWeight: 1000, color: "#991B1B" },
  errorText: { marginTop: 6, color: "#6B7280" },

  skeletonTop: { height: 180, borderRadius: 18, background: "#ECECEC", border: "1px solid #E5E7EB" },
  skeletonGrid: { marginTop: 12, height: 420, borderRadius: 18, background: "#ECECEC", border: "1px solid #E5E7EB" },

  /* carousel */
  media: { position: "relative", width: "100%", backgroundColor: "#F3F4F6", cursor: "zoom-in" },
  mediaImg: { width: "100%", height: 155, objectFit: "cover", display: "block" },
  mediaNavLeft: {
    position: "absolute",
    top: "50%",
    left: 8,
    transform: "translateY(-50%)",
    width: 26,
    height: 26,
    borderRadius: 999,
    border: "none",
    backgroundColor: "rgba(17,24,39,0.55)",
    color: "#F9FAFB",
    cursor: "pointer",
    fontSize: 16,
  },
  mediaNavRight: {
    position: "absolute",
    top: "50%",
    right: 8,
    transform: "translateY(-50%)",
    width: 26,
    height: 26,
    borderRadius: 999,
    border: "none",
    backgroundColor: "rgba(17,24,39,0.55)",
    color: "#F9FAFB",
    cursor: "pointer",
    fontSize: 16,
  },
  dots: {
    position: "absolute",
    bottom: 8,
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    gap: 5,
    padding: "4px 8px",
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.45)",
  },
  dot: { height: 7, borderRadius: 999, backgroundColor: "#FACC15" },

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
  modalFrame: { position: "relative", maxWidth: "min(980px, 100%)", maxHeight: "90vh", width: "100%" },
  modalImg: { width: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: 18, backgroundColor: "#000" },
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
    width: 40,
    height: 40,
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
    width: 40,
    height: 40,
    borderRadius: 999,
    border: "none",
    backgroundColor: "rgba(15,23,42,0.9)",
    color: "#F9FAFB",
    fontSize: 22,
    cursor: "pointer",
  },

  toast: {
    position: "fixed",
    left: "50%",
    bottom: 18,
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