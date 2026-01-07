import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PUBLIC_BASE_URL, PUBLIC_ORIGIN } from "../../api";

/* =======================
   Types
======================= */

type PublicProduct = {
  id: string;
  name: string;
  price: number;
  imageUrls: string[];
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

function ProductImageCarousel({ images, alt }: { images: string[]; alt: string }) {
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

  return (
    <>
      <div style={s.media} onClick={() => setIsOpen(true)}>
        <img
          src={current}
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
   Page
======================= */

export function PublicCatalogPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<PublicCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (los de la versión anterior)
  const [query, setQuery] = useState("");
  const [searchInDescription, setSearchInDescription] = useState(true);
  const [onlyFeatured, setOnlyFeatured] = useState(false);
  const [sort, setSort] = useState<SortKey>("FEATURED");

  const loadCatalog = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${PUBLIC_BASE_URL}/catalog/${slug}`);
      if (!res.ok) throw new Error("No se pudo cargar el catálogo.");

      const raw = await res.json();

      const normalized: PublicCatalogResponse = {
        seller: {
          id: raw.seller.id,
          name: raw.seller.fullName ?? raw.seller.name,
          slug: raw.seller.slug,
          avatarUrl: resolveImageUrl(raw.seller.avatarUrl),
          description: raw.seller.description,
          clusterName: raw.seller.clusterName ?? raw.seller.colonyName,
          whatsapp: raw.seller.whatsapp,
        },
        products: (raw.products ?? [])
          .map((p: any) => {
            const rawImages: string[] = Array.isArray(p.imageUrls)
              ? p.imageUrls
              : Array.isArray(p.images)
              ? p.images
              : [];

            const single =
              (p.imageUrl as string | undefined) || (p.image as string | undefined);

            const resolvedImages = [
              ...rawImages.map((u) => resolveImageUrl(u)).filter(Boolean),
            ] as string[];

            if (single) {
              const s = resolveImageUrl(single);
              if (s) resolvedImages.push(s);
            }

            return {
              id: p.id,
              name: p.title ?? p.name,
              price: Number(p.price ?? 0),
              imageUrls: resolvedImages,
              shortDescription: p.shortDescription ?? p.description,
              featured: !!p.featured,
              active: p.active !== false,
            } as PublicProduct;
          })
          .filter((p: PublicProduct) => p.active !== false),
      };

      setData(normalized);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error cargando catálogo");
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
    openWhatsApp(
      seller.whatsapp,
      `Hola! Vi tu catálogo (${window.location.href}) y me interesa un producto.`
    );
  };

  const openWhatsAppForProduct = (p: PublicProduct) => {
    if (!seller?.whatsapp) return alert("Este vendedor no tiene WhatsApp configurado.");
    const productUrl = `${window.location.origin}/p/${p.id}`;
    openWhatsApp(
      seller.whatsapp,
      `Hola! Me interesa: ${p.name} (${moneyMXN(p.price)}). Link: ${productUrl}`
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
        {/* Header like app */}
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
                ⎘
              </button>
              <button onClick={openWhatsAppGeneral} style={s.iconBtn} aria-label="WhatsApp">
                💬
              </button>
            </div>
          </div>

          {/* Controls (filtros reales) */}
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
                style={{
                  ...s.chip,
                  ...(onlyFeatured ? s.chipActive : null),
                }}
              >
                {onlyFeatured ? "✓ " : ""}Solo destacados
              </button>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                style={s.select}
              >
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

        {/* Grid */}
        <main style={{ marginTop: 12 }}>
          {filteredProducts.length === 0 ? (
            <div style={s.empty}>
              <div style={s.emptyTitle}>Sin resultados</div>
              <div style={s.emptyText}>Prueba con otra búsqueda o quita filtros.</div>
            </div>
          ) : (
            <section style={s.grid}>
              {filteredProducts.map((p) => (
                <article key={p.id} style={s.card}>
                  <div style={{ position: "relative" }}>
                    {p.imageUrls.length > 0 ? (
                      <ProductImageCarousel images={p.imageUrls} alt={p.name} />
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
                      <button onClick={() => navigate(`/p/${p.id}`)} style={s.btnGhostWide}>
                        Ver
                      </button>
                      <button onClick={() => openWhatsAppForProduct(p)} style={s.btnWhatsWide}>
                        WhatsApp
                      </button>
                    </div>
                  </div>
                </article>
              ))}
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
   Styles (app-like light)
======================= */

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#F6F6F4",
    color: "#111827",
  },
  container: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "16px 14px 26px",
  },

  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "#F6F6F4",
    paddingBottom: 10,
  },

  brandRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    paddingTop: 4,
  },
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

  searchWrap: {
    borderRadius: 14,
    background: "#F9FAFB",
    border: "1px solid #E5E7EB",
    padding: 10,
  },
  searchInput: {
    width: "100%",
    border: "none",
    outline: "none",
    fontSize: 14,
    padding: "10px 10px",
    borderRadius: 12,
    background: "#FFFFFF",
  },
  checkboxRow: {
    marginTop: 10,
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#111827",
    fontWeight: 700,
  },

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
    fontSize: 12,
    color: "#111827",
    whiteSpace: "nowrap",
  },
  chipActive: {
    background: "#F5E7B6",
    border: "1px solid #E7D28A",
  },

  select: {
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    color: "#111827",
  },

  btnGhost: {
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
    marginTop: 10,
    padding: "10px 12px",
    borderRadius: 999,
    border: "none",
    background: "#111827",
    color: "#F9FAFB",
    cursor: "pointer",
    fontWeight: 950,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },

  card: {
    background: "#fff",
    borderRadius: 18,
    border: "1px solid #E5E7EB",
    overflow: "hidden",
    boxShadow: "0 14px 30px rgba(17,24,39,0.08)",
    display: "flex",
    flexDirection: "column",
  },

  cardBody: {
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  cardTitle: {
    fontWeight: 1000,
    fontSize: 14,
    color: "#111827",
    ...clamp(1),
  },

  cardPrice: {
    fontWeight: 1000,
    fontSize: 14,
    color: "#111827",
  },

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
  btnWhatsWide: {
    flex: 1,
    padding: "10px 12px",
    borderRadius: 999,
    border: "none",
    background: "#22C55E",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 12,
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

  footer: {
    textAlign: "center",
    marginTop: 16,
    color: "#9CA3AF",
    fontSize: 12,
  },

  empty: {
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 14px 30px rgba(17,24,39,0.08)",
  },
  emptyTitle: { fontWeight: 1000, fontSize: 16 },
  emptyText: { marginTop: 6, color: "#6B7280", fontSize: 13 },

  errorCard: {
    background: "#fff",
    border: "1px solid #FCA5A5",
    borderRadius: 18,
    padding: 14,
  },
  errorTitle: { fontWeight: 1000, color: "#991B1B" },
  errorText: { marginTop: 6, color: "#6B7280" },

  skeletonTop: {
    height: 180,
    borderRadius: 18,
    background: "#ECECEC",
    border: "1px solid #E5E7EB",
  },
  skeletonGrid: {
    marginTop: 12,
    height: 420,
    borderRadius: 18,
    background: "#ECECEC",
    border: "1px solid #E5E7EB",
  },

  /* carousel */
  media: {
    position: "relative",
    width: "100%",
    backgroundColor: "#F3F4F6",
    cursor: "zoom-in",
  },
  mediaImg: {
    width: "100%",
    height: 155,
    objectFit: "cover",
    display: "block",
  },
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
  dot: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "#FACC15",
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