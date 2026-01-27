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
  images: CatalogImageDto[];
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
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

  const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  if (path.startsWith("/api/")) return path;

  const isLocal =
    window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const origin = isLocal ? "https://lokaly.site" : window.location.origin;

  return `${origin}${path}`;
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
    return true;
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

        {/* overlay premium */}
        <div style={s.mediaOverlay} />

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
                  width: i === index ? 14 : 7,
                  opacity: i === index ? 1 : 0.55,
                }}
              />
            ))}
          </div>
        )}

        {/* hint de zoom */}
        <div style={s.zoomHint}>
          <span style={s.zoomHintIcon}>⤢</span>
          <span style={s.zoomHintText}>Ver</span>
        </div>
      </div>

      {isOpen && (
        <div onClick={() => setIsOpen(false)} style={s.modalBackdrop}>
          <div onClick={(e) => e.stopPropagation()} style={s.modalFrame}>
            <img
              src={currentThumb}
              alt={alt}
              style={{ ...s.modalImg, filter: "blur(10px)", transform: "scale(1.04)", opacity: 0.55 }}
            />

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
      let imgObjects: CatalogImageDto[] = [];

      if (Array.isArray(p?.images)) {
        imgObjects = p.images as CatalogImageDto[];
      } else if (Array.isArray(p?.imageUrls)) {
        const arr = p.imageUrls;
        if (typeof arr[0] === "string") {
          imgObjects = arr
            .map((u: any) => resolveImageUrl(String(u ?? "")))
            .filter(Boolean)
            .map((url: string) => ({ originalUrl: url!, mediumUrl: url!, thumbUrl: url! }));
        } else {
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

  const [copied, setCopied] = useState(false);

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

      // ✅ Analytics: CATALOG_VIEW (1 vez cada 10 min por catálogo)
      const visitorId = getVisitorId();
      const catalogId = resolveCatalogId(slug);
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

  const copyCatalogLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      alert("No se pudo copiar el enlace");
    }
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
            <button onClick={loadCatalog} style={s.btnPrimary}>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const amazonCss = `
  :root{
    --amz-bg:#EAEDED;
    --amz-card:#FFFFFF;
    --amz-border:rgba(15,23,42,.12);
    --amz-text:#0F1111;
    --amz-muted:#565959;
    --amz-link:#0F1111;
    --amz-linkHover:#C7511F;
    --amz-accent:#F3A847;
    --amz-accent2:#232F3E;
    --amz-shadow:0 8px 18px rgba(15,23,42,.08);
  }

  .amz-page{ background: var(--amz-bg); color: var(--amz-text); min-height:100vh; }
  .amz-container{ max-width: 1180px; margin:0 auto; padding: 12px 12px 22px; }

/* Barra superior delgada */
.amz-topbar{
  background:#131921;
  border-bottom: 1px solid rgba(255,255,255,.10);
  padding: 10px 12px;
  border-radius: 14px;
  box-shadow: 0 10px 18px rgba(0,0,0,.18);
}

.amz-brandRow{ display:flex; align-items:center; gap:10px; }
.amz-logo{
  width: 38px; height:38px; border-radius: 10px;
  background:#0B1220; color:#FACC15;
  display:flex; align-items:center; justify-content:center;
  font-weight:1000;
  border:1px solid rgba(250,204,21,.25);
}
.amz-title{ font-weight:1000; color:#fff; letter-spacing:-.2px; line-height:1.1; }
.amz-sub{ color: rgba(255,255,255,.72); font-size:12px; font-weight:700; margin-top:2px; }

.amz-actions{ margin-left:auto; display:flex; gap:8px; }

/* Botón copiar tipo Amazon */
.amz-copy{
  height: 38px;
  padding: 0 12px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,.18);
  background: rgba(255,255,255,.08);
  color: rgba(255,255,255,.92);
  font-weight: 1000;
  cursor: pointer;
}
.amz-copy:hover{ background: rgba(255,255,255,.12); }

/* Panel blanco debajo (búsqueda + filtros) */
.amz-toolbar{
  margin-top: 10px;
  background:#fff;
  border: 1px solid rgba(15,23,42,.12);
  border-radius: 14px;
  padding: 10px;
  box-shadow: 0 8px 14px rgba(15,23,42,.06);
}

/* Search */
.amz-searchRow{
  display:flex; gap:10px; align-items:center;
  background:#fff;
  border: 1px solid rgba(15,23,42,.14);
  border-radius: 12px;
  padding: 10px 12px;
}
.amz-searchRow:focus-within{
  border-color: rgba(243,168,71,.95);
  box-shadow: 0 0 0 3px rgba(243,168,71,.25);
}
.amz-searchInput{
  width:100%;
  border:none;
  outline:none;

  /* 🔥 esto quita el negro */
  background: transparent;
  color: #0F1111;

  font-size:14px;
  font-weight:800;

  /* Safari / iOS fix */
  -webkit-text-fill-color: #0F1111;
  caret-color: #F3A847;
}

/* checkbox */
.amz-checkbox{
  margin-top:8px;
  display:flex; gap:8px; align-items:center;
  font-size:12px; font-weight:800; color:#0F1111;
}

/* filtros más rectangulares (Amazon-like) */
.amz-filters{
  margin-top:10px;
  display:grid;
  grid-template-columns: 1fr 1fr 0.9fr;
  gap:8px;
}
.amz-chip, .amz-select, .amz-btn{
  border-radius: 12px;
  padding: 10px 12px;
  border: 1px solid rgba(15,23,42,.14);
  background: #fff;
  font-weight: 900;
  font-size: 11px;
  cursor:pointer;
  color:#0F1111;
}
.amz-chipActive{
  border-color: rgba(243,168,71,.75);
  background: rgba(243,168,71,.18);
}

  /* Grid */
  .amz-grid{
    margin-top: 12px;
    display:grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  @media (min-width: 720px){
    .amz-grid{ grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (min-width: 980px){
    .amz-grid{ grid-template-columns: repeat(4, minmax(0, 1fr)); }
  }

  /* Card */
  .amz-card{
    background: var(--amz-card);
    border: 1px solid var(--amz-border);
    border-radius: 14px;
    overflow:hidden;
    box-shadow: var(--amz-shadow);
    display:flex; flex-direction:column;
    transition: transform .12s ease, box-shadow .12s ease;
  }
  .amz-card:hover{
    transform: translateY(-2px);
    box-shadow: 0 14px 28px rgba(15,23,42,.12);
  }

  .amz-body{ padding: 10px 10px 12px; display:flex; flex-direction:column; gap:8px; }
  .amz-name{
    font-weight: 900; font-size: 13px;
    color: var(--amz-link);
    text-decoration: none;
    line-height: 1.15;
  }
  .amz-name:hover{ color: var(--amz-linkHover); text-decoration: underline; }

  .amz-price{ font-weight: 1000; font-size: 16px; color: var(--amz-text); letter-spacing:-.2px; }
  .amz-metaRow{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
  .amz-pill{
    display:inline-flex; align-items:center; gap:6px;
    padding: 6px 9px; border-radius: 999px;
    border: 1px solid rgba(15,23,42,.12);
    background: rgba(15,23,42,.03);
    font-size: 11px; font-weight: 900; color: var(--amz-text);
  }
  .amz-pillGreen{
    border-color: rgba(34,197,94,.22);
    background: rgba(34,197,94,.10);
    color: #0f5132;
  }
  .amz-dot{ width:8px; height:8px; border-radius:99px; background:#16a34a; box-shadow: 0 0 0 3px rgba(34,197,94,.12); }

  .amz-badgeFeatured{
    position:absolute; left:10px; top:10px;
    padding: 6px 10px; border-radius: 999px;
    background: rgba(243,168,71,.95);
    color:#111827;
    font-weight: 1000;
    border: 1px solid rgba(0,0,0,.08);
    box-shadow: 0 10px 20px rgba(0,0,0,.18);
    font-size: 12px;
  }

  /* Primary button (Amazon-like) */
  .amz-cta{
    width:100%;
    padding: 11px 12px;
    border-radius: 10px;
    border: 1px solid rgba(0,0,0,.12);
    background: linear-gradient(180deg, #F7D27A, #F3A847);
    color:#111827;
    font-weight: 1000;
    cursor:pointer;
  }
  .amz-cta:hover{ filter: brightness(.98); }

  .amz-footer{
    text-align:center;
    color: rgba(15,23,42,.55);
    font-size: 12px;
    margin-top: 14px;
    font-weight: 800;
  }
`;


return (
  <div className="amz-page">
    <style>{amazonCss}</style>

    <div className="amz-container">
<header style={{ position: "sticky", top: 0, zIndex: 30 }}>
  {/* Barra delgada tipo Amazon */}
  <div className="amz-topbar">
    <div className="amz-brandRow">
      <div className="amz-logo">⌂</div>

      <div style={{ minWidth: 0 }}>
        <div className="amz-title">Lokaly</div>
        <div className="amz-sub">
          {seller?.clusterName || "Catálogo público"}
          {seller?.name ? <span style={{ opacity: 0.85 }}> · {seller.name}</span> : null}
        </div>
      </div>

      <div className="amz-actions">
        <button
          onClick={copyCatalogLink}
          className="amz-copy"
          aria-label="Copiar link del catálogo"
          title="Copiar link del catálogo"
        >
          {copied ? "✓ Copiado" : "Copiar link"}
        </button>
      </div>
    </div>
  </div>

  {/* Panel blanco de búsqueda / filtros */}
  <div className="amz-toolbar">
    <div className="amz-searchRow">
      <span style={{ fontWeight: 1000, color: "#8e96a2ff" }}>⌕</span>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Buscar (ej. "zapato caballero")`}
        className="amz-searchInput"
      />
    </div>

    <label className="amz-checkbox">
      <input
        type="checkbox"
        checked={searchInDescription}
        onChange={(e) => setSearchInDescription(e.target.checked)}
      />
      <span>Buscar también en descripción</span>
    </label>

    <div className="amz-filters">
      <button
        onClick={() => setOnlyFeatured((v) => !v)}
        className={`amz-chip ${onlyFeatured ? "amz-chipActive" : ""}`}
      >
        {onlyFeatured ? "✓ " : ""}Solo destacados
      </button>

      <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="amz-select">
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
        className="amz-btn"
      >
        Limpiar
      </button>
    </div>
  </div>
</header>

      <main>
        {filteredProducts.length === 0 ? (
          <div style={{ marginTop: 12, padding: 14, background: "#fff", borderRadius: 14, border: "1px solid rgba(15,23,42,.12)" }}>
            <div style={{ fontWeight: 1000 }}>Sin resultados</div>
            <div style={{ marginTop: 6, color: "#565959", fontWeight: 800, fontSize: 13 }}>
              Prueba con otra búsqueda o quita filtros.
            </div>
          </div>
        ) : (
          <section className="amz-grid">
            {filteredProducts.map((p) => {
              const cardImages = imagesToUrls(p.images, "thumb");

              return (
                <article key={p.id} className="amz-card">
                  <div style={{ position: "relative" }}>
                    {cardImages.length > 0 ? (
                      <ProductImageCarousel images={p.images} alt={p.name} />
                    ) : (
                      <div style={s.noImg}>Sin imagen</div>
                    )}

                    {p.featured && <div className="amz-badgeFeatured">⭐ Destacado</div>}
                  </div>

                  <div className="amz-body">
                    <div className="amz-name" title={p.name} style={{ ...clamp(2) }}>
                      {p.name}
                    </div>

                    <div className="amz-price">{moneyMXN(p.price)}</div>

                    <div className="amz-metaRow">
                      <span className="amz-pill amz-pillGreen">
                        <span className="amz-dot" /> Disponible
                      </span>
                      <span className="amz-pill">📍 Local</span>
                    </div>

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
                      className="amz-cta"
                    >
                      Ver detalles
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <footer className="amz-footer">Catálogo · Lokaly · comparte tu link por WhatsApp</footer>
    </div>
  </div>
);

}

/* =======================
   Styles (premium light)
======================= */

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    color: "#0b1220",
    background:
      "radial-gradient(1200px 600px at 20% -10%, rgba(250,204,21,0.22), rgba(250,204,21,0) 60%), radial-gradient(900px 520px at 90% 0%, rgba(17,24,39,0.12), rgba(17,24,39,0) 55%), #F7F7F5",
  },

  container: { maxWidth: 980, margin: "0 auto", padding: "16px 14px 26px" },

  header: { position: "sticky", top: 0, zIndex: 20, paddingBottom: 10 },

  heroCard: {
    borderRadius: 22,
    border: "1px solid rgba(15,23,42,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.86))",
    boxShadow: "0 18px 50px rgba(15,23,42,0.10)",
    padding: 12,
    backdropFilter: "blur(10px)",
  },

  heroTopRow: { display: "flex", alignItems: "flex-start", gap: 10, paddingTop: 4 },

  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    background: "linear-gradient(180deg, #111827, #0b1220)",
    color: "#FACC15",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 1000,
    boxShadow: "0 12px 28px rgba(15,23,42,0.22)",
    flexShrink: 0,
  },

  heroTitle: { fontWeight: 1000, fontSize: 18, letterSpacing: -0.2, lineHeight: 1.1 },
  heroSub: { fontSize: 12, color: "#334155", marginTop: 4, display: "flex", flexWrap: "wrap", gap: 6 },
  heroSubStrong: { fontWeight: 900, color: "#0b1220" },
  dotSep: { opacity: 0.45 },

  heroPitch: { marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" },
  pillGold: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(250,204,21,0.22)",
    border: "1px solid rgba(250,204,21,0.45)",
    fontWeight: 900,
    fontSize: 12,
    color: "#7a5a00",
  },
  pillSoft: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(15,23,42,0.04)",
    border: "1px solid rgba(15,23,42,0.10)",
    fontWeight: 900,
    fontSize: 12,
    color: "#0b1220",
  },

  headerRight: { marginLeft: "auto", display: "flex", gap: 8 },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "rgba(255,255,255,0.85)",
    cursor: "pointer",
    fontSize: 16,
    boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
  },
  iconBtnSuccess: {
    borderColor: "rgba(34,197,94,0.35)",
    background: "rgba(34,197,94,0.10)",
  },

  controlsCard: {
    marginTop: 12,
    borderRadius: 18,
    padding: 10,
    background: "rgba(255,255,255,0.88)",
    border: "1px solid rgba(15,23,42,0.10)",
    boxShadow: "0 14px 34px rgba(15,23,42,0.10)",
  },

  searchWrap: { borderRadius: 16, background: "rgba(248,250,252,1)", border: "1px solid rgba(15,23,42,0.10)", padding: 10 },

  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 10px",
    borderRadius: 14,
    background: "#FFFFFF",
    border: "1px solid rgba(15,23,42,0.10)",
  },
  searchIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(250,204,21,0.22)",
    border: "1px solid rgba(250,204,21,0.45)",
    color: "#7a5a00",
    fontWeight: 1000,
    flexShrink: 0,
  },

  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: 14,
    background: "transparent",
    color: "#ced2dbff",
    fontWeight: 800,
  },

  checkboxRow: {
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    color: "#0b1220",
    fontWeight: 900,
  },

  filtersRow: {
    marginTop: 10,
    display: "grid",
    gridTemplateColumns: "1fr 1fr 0.9fr",
    gap: 8,
    alignItems: "center",
  },

  chip: {
    padding: "11px 12px",
    borderRadius: 999,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "rgba(255,255,255,0.92)",
    cursor: "pointer",
    fontWeight: 1000,
    fontSize: 11,
    color: "#0b1220",
    whiteSpace: "nowrap",
    boxShadow: "0 10px 20px rgba(15,23,42,0.06)",
  },
  chipActive: {
    background: "rgba(250,204,21,0.22)",
    border: "1px solid rgba(250,204,21,0.45)",
    color: "#7a5a00",
  },

  select: {
    padding: "11px 12px",
    borderRadius: 999,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "rgba(255,255,255,0.92)",
    cursor: "pointer",
    fontWeight: 1000,
    fontSize: 11,
    color: "#0b1220",
    boxShadow: "0 10px 20px rgba(15,23,42,0.06)",
  },

  btnGhost: {
    padding: "11px 12px",
    borderRadius: 999,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "rgba(255,255,255,0.92)",
    cursor: "pointer",
    fontWeight: 1000,
    fontSize: 11,
    color: "#0b1220",
    boxShadow: "0 10px 20px rgba(15,23,42,0.06)",
  },

  btnPrimary: {
    marginTop: 10,
    padding: "12px 14px",
    borderRadius: 999,
    border: "1px solid rgba(250,204,21,0.35)",
    background: "linear-gradient(180deg, #111827, #0b1220)",
    color: "#FACC15",
    cursor: "pointer",
    fontWeight: 1000,
    boxShadow: "0 16px 40px rgba(15,23,42,0.18)",
  },

  grid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 },

  card: {
    background: "rgba(255,255,255,0.95)",
    borderRadius: 22,
    border: "1px solid rgba(15,23,42,0.10)",
    overflow: "hidden",
    boxShadow: "0 18px 50px rgba(15,23,42,0.10)",
    display: "flex",
    flexDirection: "column",
  },

  cardBody: { padding: 12, display: "flex", flexDirection: "column", gap: 8 },

  cardTitle: { fontWeight: 1000, fontSize: 15, color: "#0b1220", ...clamp(1), letterSpacing: -0.2 },

  priceRow: { display: "flex", alignItems: "baseline", gap: 8 },
  cardPrice: { fontWeight: 1000, fontSize: 16, color: "#0b1220" },

  statusRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },

  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(34,197,94,0.10)",
    border: "1px solid rgba(34,197,94,0.22)",
    color: "#0f5132",
    fontWeight: 1000,
    fontSize: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    background: "#16a34a",
    boxShadow: "0 0 0 3px rgba(34,197,94,0.15)",
  },
  metaPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "7px 10px",
    borderRadius: 999,
    background: "rgba(15,23,42,0.04)",
    border: "1px solid rgba(15,23,42,0.10)",
    color: "#0b1220",
    fontWeight: 1000,
    fontSize: 12,
  },

  badgeFeatured: {
    position: "absolute",
    left: 10,
    bottom: 10,
    padding: "7px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 1000,
    background: "rgba(250,204,21,0.26)",
    border: "1px solid rgba(250,204,21,0.55)",
    color: "#7a5a00",
    boxShadow: "0 14px 30px rgba(15,23,42,0.12)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  },
  badgeDot: { color: "#7a5a00" },

  cardActions: { display: "flex", gap: 8, marginTop: 4 },

  btnPrimaryWide: {
    flex: 1,
    padding: "12px 14px",
    borderRadius: 999,
    border: "1px solid rgba(250,204,21,0.35)",
    background: "linear-gradient(180deg, #111827, #0b1220)",
    color: "#FACC15",
    cursor: "pointer",
    fontWeight: 1000,
    fontSize: 12,
    boxShadow: "0 18px 44px rgba(15,23,42,0.16)",
  },

  noImg: {
    height: 165,
    background: "linear-gradient(180deg, rgba(15,23,42,0.06), rgba(15,23,42,0.02))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#64748b",
    fontWeight: 1000,
  },

  footer: { marginTop: 18 },
  footerCard: {
    textAlign: "center",
    borderRadius: 20,
    border: "1px solid rgba(15,23,42,0.10)",
    background: "rgba(255,255,255,0.86)",
    boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
    padding: "14px 12px",
  },
  footerTitle: { fontWeight: 1000, color: "#0b1220", letterSpacing: -0.2 },
  footerText: { marginTop: 4, color: "#475569", fontWeight: 900, fontSize: 12 },

  empty: {
    background: "rgba(255,255,255,0.95)",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 22,
    padding: 14,
    boxShadow: "0 18px 50px rgba(15,23,42,0.10)",
  },
  emptyTitle: { fontWeight: 1000, fontSize: 16 },
  emptyText: { marginTop: 6, color: "#475569", fontSize: 13, fontWeight: 800 },

  errorCard: { background: "rgba(255,255,255,0.95)", border: "1px solid rgba(248,113,113,0.45)", borderRadius: 22, padding: 14 },
  errorTitle: { fontWeight: 1000, color: "#991B1B" },
  errorText: { marginTop: 6, color: "#475569", fontWeight: 800 },

  skeletonTop: { height: 220, borderRadius: 22, background: "rgba(15,23,42,0.06)", border: "1px solid rgba(15,23,42,0.10)" },
  skeletonGrid: { marginTop: 12, height: 420, borderRadius: 22, background: "rgba(15,23,42,0.06)", border: "1px solid rgba(15,23,42,0.10)" },

  /* carousel */
  media: { position: "relative", width: "100%", backgroundColor: "rgba(15,23,42,0.04)", cursor: "zoom-in" },
  mediaImg: { width: "100%", height: 165, objectFit: "cover", display: "block" },

  mediaOverlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(180deg, rgba(0,0,0,0) 55%, rgba(0,0,0,0.25) 92%)",
    pointerEvents: "none",
  },

  zoomHint: {
    position: "absolute",
    right: 10,
    top: 10,
    padding: "6px 8px",
    borderRadius: 999,
    background: "rgba(15,23,42,0.65)",
    color: "#fff",
    fontWeight: 1000,
    fontSize: 11,
    display: "flex",
    gap: 6,
    alignItems: "center",
    border: "1px solid rgba(255,255,255,0.18)",
    pointerEvents: "none",
  },
  zoomHintIcon: { opacity: 0.95 },
  zoomHintText: { opacity: 0.95 },

  mediaNavLeft: {
    position: "absolute",
    top: "50%",
    left: 8,
    transform: "translateY(-50%)",
    width: 30,
    height: 30,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    backgroundColor: "rgba(15,23,42,0.55)",
    color: "#F9FAFB",
    cursor: "pointer",
    fontSize: 18,
  },
  mediaNavRight: {
    position: "absolute",
    top: "50%",
    right: 8,
    transform: "translateY(-50%)",
    width: 30,
    height: 30,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    backgroundColor: "rgba(15,23,42,0.55)",
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
    padding: "4px 10px",
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.55)",
    border: "1px solid rgba(255,255,255,0.14)",
  },
  dot: { height: 7, borderRadius: 999, backgroundColor: "#FACC15" },

  modalBackdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    backgroundColor: "rgba(2,6,23,0.88)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  modalFrame: { position: "relative", maxWidth: "min(980px, 100%)", maxHeight: "90vh", width: "100%" },
  modalImg: {
    width: "100%",
    maxHeight: "90vh",
    objectFit: "contain",
    borderRadius: 22,
    backgroundColor: "#000",
    boxShadow: "0 22px 80px rgba(0,0,0,0.55)",
  },

  modalClose: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 38,
    height: 38,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.18)",
    backgroundColor: "rgba(2,6,23,0.72)",
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
    border: "1px solid rgba(255,255,255,0.18)",
    backgroundColor: "rgba(2,6,23,0.72)",
    color: "#F9FAFB",
    fontSize: 24,
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
    border: "1px solid rgba(255,255,255,0.18)",
    backgroundColor: "rgba(2,6,23,0.72)",
    color: "#F9FAFB",
    fontSize: 24,
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
    fontWeight: 1000,
    fontSize: "12px",
    boxShadow: "0 22px 60px rgba(0,0,0,0.25)",
    transition: "opacity 0.2s ease",
    opacity: "0",
    pointerEvents: "none",
  },
};