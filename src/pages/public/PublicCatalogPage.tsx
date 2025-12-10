import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { PUBLIC_BASE_URL, PUBLIC_ORIGIN } from "../../api.ts";

type PublicProduct = {
  id: string;
  name: string;
  price: number;
  imageUrls: string[];
  shortDescription?: string;
  featured?: boolean; // 👈 NUEVO
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

/* ====== URLs Lokaly (ajusta cuando estén listas) ====== */

const ANDROID_APP_URL =
  "https://play.google.com/store/apps/details?id=com.tuempresa.lokaly"; // TODO: reemplazar
const IOS_APP_URL = "https://apps.apple.com/app/idXXXXXXXXXX"; // TODO: reemplazar
const LANDING_URL = "https://lokaly.site"; // TODO: si cambias dominio, ajusta aquí

function resolveImageUrl(rawUrl?: string | null): string | undefined {
  if (!rawUrl) return undefined;

  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return rawUrl;
  }

  const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  return `${PUBLIC_ORIGIN}${path}`;
}

/* ========= Carrusel de imágenes por producto con zoom ========= */

type ProductImageCarouselProps = {
  images: string[];
  alt: string;
};

function ProductImageCarousel({ images, alt }: ProductImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false); // 👈 modal abierto/cerrado

  if (!images || images.length === 0) return null;

  const total = images.length;

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + total) % total);
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % total);
  };

  const current = images[index];

  return (
    <>
      {/* Carrusel normal en la tarjeta */}
      <div
        style={{
          position: "relative",
          width: "100%",
          borderRadius: 18,
          overflow: "hidden",
          marginBottom: 10,
          backgroundColor: "#E5E7EB",
        }}
      >
        <div
          onClick={() => setIsOpen(true)}
          style={{
            cursor: "zoom-in",
          }}
        >
          <img
            src={current}
            alt={alt}
            style={{
              width: "100%",
              height: 190,
              objectFit: "cover",
              display: "block",
            }}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        {/* Flechas solo si hay más de una imagen */}
        {total > 1 && (
          <>
            <button
              onClick={goPrev}
              style={{
                position: "absolute",
                top: "50%",
                left: 10,
                transform: "translateY(-50%)",
                width: 26,
                height: 26,
                borderRadius: "999px",
                border: "none",
                backgroundColor: "rgba(17,24,39,0.55)",
                color: "#F9FAFB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ‹
            </button>

            <button
              onClick={goNext}
              style={{
                position: "absolute",
                top: "50%",
                right: 10,
                transform: "translateY(-50%)",
                width: 26,
                height: 26,
                borderRadius: "999px",
                border: "none",
                backgroundColor: "rgba(17,24,39,0.55)",
                color: "#F9FAFB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 16,
              }}
            >
              ›
            </button>
          </>
        )}

        {/* Dots */}
        {total > 1 && (
          <div
            style={{
              position: "absolute",
              bottom: 8,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: 5,
              padding: "4px 8px",
              borderRadius: 999,
              backgroundColor: "rgba(17,24,39,0.5)",
            }}
          >
            {images.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === index ? 10 : 6,
                  height: 6,
                  borderRadius: 999,
                  backgroundColor:
                    i === index ? "#FACC15" : "rgba(249,250,251,0.6)",
                  transition: "all 0.2s ease",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de zoom */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            backgroundColor: "rgba(15,23,42,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "min(900px, 100%)",
              maxHeight: "90vh",
              width: "100%",
            }}
          >
            <img
              src={current}
              alt={alt}
              style={{
                width: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: 18,
                backgroundColor: "#000",
              }}
            />

            {/* Botón cerrar */}
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 32,
                height: 32,
                borderRadius: 999,
                border: "none",
                backgroundColor: "rgba(15,23,42,0.9)",
                color: "#F9FAFB",
                fontSize: 18,
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            {/* Flechas dentro del modal */}
            {total > 1 && (
              <>
                <button
                  onClick={goPrev}
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 10,
                    transform: "translateY(-50%)",
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    border: "none",
                    backgroundColor: "rgba(15,23,42,0.9)",
                    color: "#F9FAFB",
                    fontSize: 20,
                    cursor: "pointer",
                  }}
                >
                  ‹
                </button>
                <button
                  onClick={goNext}
                  style={{
                    position: "absolute",
                    top: "50%",
                    right: 10,
                    transform: "translateY(-50%)",
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    border: "none",
                    backgroundColor: "rgba(15,23,42,0.9)",
                    color: "#F9FAFB",
                    fontSize: 20,
                    cursor: "pointer",
                  }}
                >
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

/* ========= Sección promo Lokaly (gancho) ========= */

type LokalyPromoSectionProps = {
  clusterName?: string;
};

function LokalyPromoSection({ clusterName }: LokalyPromoSectionProps) {
  return (
    <section
      style={{
        marginTop: 32,
        marginBottom: 24,
        borderRadius: 24,
        background:
          "linear-gradient(135deg, #111827 0%, #020617 40%, #1E293B 100%)",
        color: "#F9FAFB",
        padding: "18px 18px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          fontSize: 11,
          padding: "4px 10px",
          borderRadius: 999,
          backgroundColor: "rgba(15,23,42,0.8)",
          border: "1px solid rgba(148,163,184,0.4)",
          width: "fit-content",
        }}
      >
        <span
          style={{
            width: 18,
            height: 18,
            borderRadius: 999,
            backgroundColor: "#FACC15",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            color: "#111827",
            fontWeight: 700,
          }}
        >
          L
        </span>
        <span>Catálogo creado con Lokaly</span>
      </div>

      <div>
        <h2
          style={{
            margin: "4px 0 4px",
            fontSize: 18,
            fontWeight: 800,
          }}
        >
          ¿Quieres un catálogo como este para tus ventas?
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            color: "#E5E7EB",
          }}
        >
          Crea tu tienda en Lokaly, comparte tu link por WhatsApp y vende a tus
          vecinos en{" "}
          <strong>
            {clusterName ? clusterName.toLowerCase() : "tu colonia"}
          </strong>{" "}
          sin complicarte.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          fontSize: 12,
          color: "#E5E7EB",
        }}
      >
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.6)",
            backgroundColor: "rgba(15,23,42,0.85)",
          }}
        >
          ✅ Catálogo listo en minutos
        </div>
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.6)",
            backgroundColor: "rgba(15,23,42,0.85)",
          }}
        >
          📲 Comparte tu link por WhatsApp
        </div>
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.6)",
            backgroundColor: "rgba(15,23,42,0.85)",
          }}
        >
          🏘️ Vende solo entre vecinos
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 2,
        }}
      >
        <button
          onClick={() => {
            window.location.href = LANDING_URL;
          }}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "none",
            fontSize: 12,
            fontWeight: 700,
            backgroundColor: "#FACC15",
            color: "#111827",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Quiero vender en Lokaly
        </button>
        <button
          onClick={() => {
            // Por ahora manda al sitio; cuando tengas las tiendas puedes hacer deep link
            const ua = navigator.userAgent || "";
            const isIOS = /iPad|iPhone|iPod/.test(ua);
            const storeUrl = isIOS ? IOS_APP_URL : ANDROID_APP_URL;
            window.location.href = storeUrl;
          }}
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid rgba(249,250,251,0.6)",
            fontSize: 12,
            fontWeight: 600,
            backgroundColor: "transparent",
            color: "#F9FAFB",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Descargar app Lokaly
        </button>
      </div>
    </section>
  );
}

/* ========= Página principal del catálogo ========= */

export function PublicCatalogPage() {
  const { slug } = useParams<{ slug: string }>();

  const [data, setData] = useState<PublicCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    if (!slug) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${PUBLIC_BASE_URL}/catalog/${slug}`);

      if (!res.ok) {
        throw new Error("No se pudo cargar el catálogo.");
      }

      const raw = await res.json();
      console.log("RAW CATALOG RESPONSE", raw);

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
        products: (raw.products ?? []).map((p: any) => {
          const rawImages: string[] = Array.isArray(p.imageUrls)
            ? p.imageUrls
            : Array.isArray(p.images)
            ? p.images
            : [];

          // También soporta un solo campo imageUrl/image como fallback
          const single =
            (p.imageUrl as string | undefined) ||
            (p.image as string | undefined);

          const resolvedImages = [
            ...rawImages
              .map((u) => resolveImageUrl(u))
              .filter(Boolean) as string[],
          ];

          if (single) {
            const singleResolved = resolveImageUrl(single);
            if (singleResolved) {
              resolvedImages.push(singleResolved);
            }
          }

          return {
            id: p.id,
            name: p.title ?? p.name,
            price: p.price,
            imageUrls: resolvedImages,
            shortDescription: p.shortDescription ?? p.description,
            featured: !!p.featured, // 👈 leemos featured del BE
          };
        }),
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

  const openWhatsApp = () => {
    if (!data?.seller.whatsapp) {
      alert("Este vendedor no tiene WhatsApp configurado.");
      return;
    }
    const message = encodeURIComponent(
      "Hola, vi tu catálogo en Lokaly y me interesa tu producto."
    );
    const url = `https://wa.me/${data.seller.whatsapp}?text=${message}`;
    window.open(url, "_blank");
  };

  const openInApp = (productId?: string) => {
    if (!data?.seller?.id && !productId) return;

    const path = productId
      ? `product/${productId}`
      : `seller/${data!.seller.id}`;

    const schemeUrl = `lokaly://${path}`;

    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const storeUrl = isIOS ? IOS_APP_URL : ANDROID_APP_URL;

    let pageHidden = false;

    const onVisibilityChange = () => {
      if (document.hidden) {
        pageHidden = true;
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    const start = Date.now();
    window.location.href = schemeUrl;

    setTimeout(() => {
      document.removeEventListener("visibilitychange", onVisibilityChange);

      const elapsed = Date.now() - start;

      if (!pageHidden && elapsed < 1500) {
        window.location.href = storeUrl;
      }
    }, 1000);
  };

  if (loading)
    return (
      <div
        style={{
          color: "#111827",
          padding: 40,
          textAlign: "center",
          background: "#F5F1EA",
          minHeight: "100vh",
        }}
      >
        <h2>Cargando catálogo...</h2>
      </div>
    );

  if (error || !data)
    return (
      <div
        style={{
          color: "#111827",
          padding: 40,
          textAlign: "center",
          background: "#F5F1EA",
          minHeight: "100vh",
        }}
      >
        <h2>Error al cargar el catálogo</h2>
        <p>{error}</p>
      </div>
    );

  const { seller, products } = data;

  // 👉 Destacados primero (sin romper nada)
  const sortedProducts = [...products].sort((a, b) => {
    const fa = a.featured ? 1 : 0;
    const fb = b.featured ? 1 : 0;
    if (fb !== fa) return fb - fa; // primero los que tienen featured = true
    return 0;
  });

  return (
    <div
      style={{
        background: "#F5F1EA",
        minHeight: "100vh",
        padding: "24px 16px 40px",
        display: "flex",
        justifyContent: "center",
        color: "#111827",
      }}
    >
      <div style={{ width: "100%", maxWidth: 980 }}>
        {/* ====== TOP BAR / LOGO ====== */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "#111827",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  color: "#FACC15",
                  fontSize: 22,
                }}
              >
                ⌂
              </span>
            </div>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  lineHeight: 1.1,
                }}
              >
                Lokaly
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                }}
              >
                {seller.clusterName || "Tu comunidad"}
              </div>
            </div>
          </div>

          <button
            onClick={() => (window.location.href = LANDING_URL)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid #D1D5DB",
              backgroundColor: "#FFFFFF",
              fontSize: 11,
              fontWeight: 500,
              color: "#374151",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            ¿También vendes aquí?
          </button>
        </header>

        {/* ====== HERO EXPLORAR ====== */}
        <section style={{ marginBottom: 16 }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 800,
              margin: 0,
            }}
          >
            Explorar
          </h1>
          <p
            style={{
              margin: "4px 0 0 0",
              fontSize: 14,
              color: "#6B7280",
            }}
          >
            Catálogo de {seller.name}
          </p>
        </section>

        {/* ====== CTA COMPRADOR ====== */}
        <section
          style={{
            marginBottom: 20,
            borderRadius: 20,
            backgroundColor: "#111827",
            color: "#F9FAFB",
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              ¿Te interesa algo?
            </div>
            <div
              style={{
                fontSize: 12,
                color: "#E5E7EB",
                marginTop: 2,
              }}
            >
              Envía un mensaje al vendedor por WhatsApp o desde la app Lokaly.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={openWhatsApp}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "none",
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: "#22C55E",
                color: "#F9FAFB",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              WhatsApp
            </button>
            <button
              onClick={() => openInApp()}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid",
                fontSize: 11,
                fontWeight: 600,
                backgroundColor: "transparent",
                color: "#FACC15",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Abrir app
            </button>
          </div>
        </section>

        {/* ====== GRID DE PRODUCTOS ====== */}
        {sortedProducts.length === 0 ? (
          <p style={{ color: "#6B7280", marginTop: 16 }}>
            Este vendedor todavía no tiene productos activos.
          </p>
        ) : (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
              gap: 16,
            }}
          >
            {sortedProducts.map((p) => (
              <article
                key={p.id}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 24,
                  padding: 10,
                  boxShadow:
                    "0 14px 24px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04)",
                  display: "flex",
                  flexDirection: "column",
                  cursor: "default",
                }}
              >
                {p.imageUrls.length > 0 && (
                  <ProductImageCarousel images={p.imageUrls} alt={p.name} />
                )}

                <div style={{ flex: 1 }}>
                  <h3
                    style={{
                      margin: "0 0 4px 0",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {p.name}
                  </h3>

                  {p.shortDescription && (
                    <p
                      style={{
                        margin: "0 0 6px 0",
                        fontSize: 12,
                        color: "#6B7280",
                      }}
                    >
                      {p.shortDescription}
                    </p>
                  )}

                  <p
                    style={{
                      margin: "0 0 4px 0",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#111827",
                    }}
                  >
                    ${p.price.toLocaleString("es-MX")} MXN
                  </p>

                  {/* Chips: Destacado + Disponible */}
                  <div
                    style={{
                      marginTop: 2,
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {p.featured && (
                      <span
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#92400E",
                          backgroundColor: "#FEF3C7",
                          border: "1px solid #FBBF24",
                        }}
                      >
                        Destacado ✨
                      </span>
                    )}

                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#16A34A",
                        backgroundColor: "#DCFCE7",
                      }}
                    >
                      Disponible
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => openInApp(p.id)}
                  style={{
                    marginTop: 10,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid #E5E7EB",
                    backgroundColor: "#F9FAFB",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#374151",
                    cursor: "pointer",
                    alignSelf: "flex-start",
                  }}
                >
                  Ver en la app Lokaly
                </button>
              </article>
            ))}
          </section>
        )}

        {/* ====== SECCIÓN PROMO LOKALY (GANCHO PARA NUEVOS VENDEDORES) ====== */}
        <LokalyPromoSection clusterName={seller.clusterName} />

        <footer
          style={{
            textAlign: "center",
            marginTop: 16,
            color: "#9CA3AF",
            fontSize: 11,
          }}
        >
          Catálogo creado con Lokaly · Compra y vende entre vecinos
        </footer>
      </div>
    </div>
  );
}