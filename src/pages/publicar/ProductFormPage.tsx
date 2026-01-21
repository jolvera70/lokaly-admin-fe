// src/pages/publicar/ProductFormPage.tsx
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../LandingPage.css";
import logoMark from "../../assets/brand/lokaly-mark.svg";

import { usePublishGuard } from "../../hooks/usePublishGuard";
import {
  createPublishProductDraft,
  getMyPublisherCatalog,
  publishProduct,
  getSellerConsent,
  acceptSellerConsent,
} from "../../api";
import { compressImageFile } from "../../utils/imageCompress";

type DraftImage = {
  file: File;
  previewUrl: string;
};

type ProductDraft = {
  phoneE164: string;
  phoneLocal: string;
  images: { file: File; previewUrl: string }[];
  title: string;
  price: string;
  description: string;
  primaryIndex: number;
};

function onlyDigits(v: string) {
  return v.replace(/[^\d]/g, "");
}

function sanitizeMoneyInput(v: string) {
  const cleaned = v.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  const intPart = parts[0] ?? "";
  const decPart = (parts[1] ?? "").slice(0, 2);
  if (parts.length <= 1) return intPart;
  return `${intPart}.${decPart}`;
}

function sanitizeIntInput(v: string) {
  const only = v.replace(/[^\d]/g, "");
  // evita "" si borran
  return only;
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

const MAX_IMAGES = 5;
const MAX_IMAGE_MB = 6;

export default function ProductFormPage() {
  const navigate = useNavigate();

  // ✅ Seguridad real: valida contra el BE (cookie lokaly_pub)
  const { loading, ok, phoneE164, phoneLocal } = usePublishGuard({
    redirectTo: "/publicar",
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [images, setImages] = useState<DraftImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const [touched, setTouched] = useState(false);
  const [imgErr, setImgErr] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  // ✅ NUEVO: estado créditos / catálogo del publisher
  const [creditsLoading, setCreditsLoading] = useState(true);
  const [hasCredits, setHasCredits] = useState(false);
  const [creditsLeft, setCreditsLeft] = useState<number>(0);
  const [creditsValidUntil, setCreditsValidUntil] = useState<string | null>(null);

  const [featured, setFeatured] = useState(false); // ✅ NUEVO
  const [quantity, setQuantity] = useState("1");   // ✅ NUEVO (string para input)
  const [catalogSlug, setCatalogSlug] = useState<string | null>(null);
const TOS_VERSION = "2026-01-20";

const [tosOpen, setTosOpen] = useState(false);
const [tosAccepted, setTosAccepted] = useState<boolean | null>(null);
const [tosSaving, setTosSaving] = useState(false);

useEffect(() => {
  if (loading) return;
  if (!ok) return;

  let alive = true;

  (async () => {
    try {
      console.log("[TOS] checking consent...");

      const consent = await getSellerConsent(); // puede ser null
      console.log("[TOS] consent response:", consent);

      const accepted =
        Boolean((consent as any)?.accepted) &&
        String((consent as any)?.version || "") === TOS_VERSION;

      if (!alive) return;
      setTosAccepted(accepted);

      if (!accepted) setTosOpen(true);
    } catch (e) {
      console.log("[TOS] consent error:", e);
      if (!alive) return;
      setTosAccepted(false);
      setTosOpen(true);
    }
  })();

  return () => {
    alive = false;
  };
}, [loading, ok]);

  // ✅ cleanup: revoke de todas las previews al desmontar
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priceDigits = useMemo(() => onlyDigits(price), [price]);

  const qtyNum = useMemo(() => {
    const n = Number(quantity || "0");
    return Number.isFinite(n) ? n : 0;
  }, [quantity]);

  const isValid = useMemo(() => {
    const hasImage = images.length > 0;
    const hasTitle = title.trim().length >= 2;
    const hasPrice = sanitizeMoneyInput(price).length > 0 && priceDigits.length >= 1;
    return hasImage && hasTitle && hasPrice;
  }, [images.length, title, price, priceDigits, qtyNum]);

  // ✅ NUEVO: cargar créditos del publisher (si hay sesión ok)
  const loadCredits = useCallback(async () => {
    if (!ok) return;
    try {
      setCreditsLoading(true);

      const catalog = await getMyPublisherCatalog();
      // Esperado (según tu screenshot):
      // creditsTotal, creditsUsed, creditsValidUntil, paused, deleted
      const total = Number(catalog?.creditsTotal ?? 0);
      const used = Number(catalog?.creditsUsed ?? 0);
      const left = Math.max(0, total - used);

      const validUntil = catalog?.creditsValidUntil ? String(catalog.creditsValidUntil) : null;

      setCreditsLeft(left);
      setCreditsValidUntil(validUntil);
      setHasCredits(left > 0);
    } catch (e) {
      // Si falla no bloqueamos — solo asumimos que NO hay créditos
      setHasCredits(false);
      setCreditsLeft(0);
      setCreditsValidUntil(null);
    } finally {
      setCreditsLoading(false);
    }
  }, [ok]);

  useEffect(() => {
    if (loading) return;
    if (!ok) return;

    let alive = true;

    (async () => {
      try {
        const catalog = await getMyPublisherCatalog().catch(() => null);
        if (!catalog) return;

        const c: any = catalog;
        const slug =
          c?.catalogSlug ??
          c?.publicSlug ??
          c?.slug ??
          null;

        if (!slug) return;

        if (alive) setCatalogSlug(slug);
      } catch (e) {
        console.log("Error resolviendo catálogo", e);
      }
    })();

    return () => {
      alive = false;
    };
  }, [loading, ok]);

  useEffect(() => {
    if (loading) return;
    if (!ok) return;
    loadCredits();
  }, [loading, ok, loadCredits]);

  function pickImages() {
    fileInputRef.current?.click();
  }

  function validateFile(file: File): string | null {
    if (!isImageFile(file)) return "Selecciona imágenes JPG/PNG.";
    // solo bloquea si es EXAGERADO (por ejemplo 50MB)
    if (file.size > 50 * 1024 * 1024) return "La imagen es demasiado pesada (máx 50MB).";
    return null;
  }

  async function onAcceptTos() {
  try {
    setTosSaving(true);
    await acceptSellerConsent(TOS_VERSION);
    setTosAccepted(true);
    setTosOpen(false);
    setSubmitErr(null);
  } catch (e) {
    console.log("[TOS] accept error:", e);
    alert("No se pudo guardar tu aceptación. Intenta de nuevo.");
  } finally {
    setTosSaving(false);
  }
}

  async function onFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    setImgErr(null);

    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setImgErr(`Máximo ${MAX_IMAGES} imágenes.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const picked = Array.from(fileList).slice(0, remaining);

    // ✅ comprimimos y luego agregamos
    const next: DraftImage[] = [];

    for (const f of picked) {
      const err = validateFile(f);
      if (err) {
        setImgErr(err);
        continue;
      }

      try {
        const c = await compressImageFile(f, {
          maxSide: 1600,
          quality: 0.82,
          mimeType: "image/jpeg", // o "image/jpeg"
        });

        next.push({ file: c.file, previewUrl: c.previewUrl });
      } catch {
        // fallback: si algo falla, usamos el original
        next.push({ file: f, previewUrl: URL.createObjectURL(f) });
      }
    }

    if (next.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImages((prev) => {
      const merged = [...prev, ...next];
      if (merged.length > 0 && prev.length === 0) setActiveIndex(0);
      return merged;
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeImageAt(idx: number) {
    setImages((prev) => {
      const img = prev[idx];
      if (img) URL.revokeObjectURL(img.previewUrl);

      const next = prev.filter((_, i) => i !== idx);

      if (next.length === 0) {
        setActiveIndex(0);
      } else if (idx === activeIndex) {
        setActiveIndex(Math.max(0, idx - 1));
      } else if (idx < activeIndex) {
        setActiveIndex((a) => Math.max(0, a - 1));
      }

      return next;
    });
  }

  function clearAllImages() {
    images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    setImages([]);
    setActiveIndex(0);
    setImgErr(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setSubmitErr(null);

    if (!ok) return;
    if (!phoneE164 || !phoneLocal) return;

    if (!isValid) return;
    if (submitting) return;

    if (tosAccepted !== true) {
  setTosOpen(true);
  setSubmitErr("Debes aceptar Términos y Privacidad para publicar.");
  return;
}

    const draft: ProductDraft = {
      phoneE164,
      phoneLocal,
      images: images.map((i) => ({ file: i.file, previewUrl: i.previewUrl })),
      title: title.trim(),
      price: sanitizeMoneyInput(price),
      description: description.trim(),
      primaryIndex: Math.min(activeIndex, Math.max(0, images.length - 1)),
    };

    try {
      setSubmitting(true);

      // ✅ 1) crear draft en BE (cookie lokaly_pub)
      const { productId } = await createPublishProductDraft({
        title: draft.title,
        price: draft.price,
        description: draft.description,
        primaryIndex: draft.primaryIndex,
        images: draft.images.map((i) => i.file),
        featured,
        quantity: qtyNum,
      });

      // ✅ 2) Si tiene créditos -> publicar directo
      if (hasCredits) {
        // publica y consume 1 crédito (tu BE debería validar credits)
        await publishProduct(productId);

        // refresca créditos para que el UI quede actualizado si vuelve
        loadCredits();

        // ir a success

        navigate("/publicar/listo", {
          replace: true,
          state: {
            productId,
            catalogUrl: `https://lokaly.site/catalog/${catalogSlug}`,
            plan: "CREDITS",
            amountPaid: 0,
            title: draft.title,
            phoneE164: draft.phoneE164,
            phoneLocal: draft.phoneLocal,
            credits: 1,
            imagesCount: draft.images?.length ?? 0,
            publishedNow: true,
          },
        });
        return;
      }

      // ✅ 3) Si NO tiene créditos -> flujo pago
      navigate("/publicar/pago", {
        replace: true,
        state: { productId, draft },
      });
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      setSubmitErr(
        status === 401
          ? "Tu sesión expiró. Vuelve a verificar tu número."
          : "No pudimos guardar/publicar tu producto. Intenta nuevamente."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;
  if (!ok) return null;

  const activeImage = images[activeIndex]?.previewUrl ?? null;
  const remainingCount = Math.max(0, MAX_IMAGES - images.length);

  const primaryCtaText = hasCredits ? "Publicar" : "Continuar al pago";
  const ctaSubText = hasCredits
    ? creditsLoading
      ? "Revisando créditos…"
      : creditsLeft > 0
        ? `Tienes ${creditsLeft} publicación(es) disponible(s)`
        : ""
    : "Elige un paquete para activar tu publicación";

  return (
    <div className="lp">
      <header className="lp__header">
        <div className="lp__headerInner">
          <button className="lp__brand" onClick={() => navigate("/")}>
            <img className="lp__logoImg" src={logoMark} alt="Lokaly" />
            <span className="lp__brandText">Lokaly</span>
          </button>

          <nav className="lp__nav">
            <Link className="lp__navLink" to="/">
              Home
            </Link>
            <a className="lp__navLink" href="/#how">
              Cómo funciona
            </a>
            <a className="lp__navLink" href="/#contact">
              Contacto
            </a>
            <button className="lp__navCta" onClick={() => navigate("/publicar")}>
              Publicar
            </button>
          </nav>
        </div>
      </header>

      <main className="lp__main">
        <section className="lp__detail" style={{ marginTop: 18 }}>
          <div className="lp__detailLeft">
            <div className="lp__detailKicker">Publica tu producto</div>
            <div className="lp__detailTitle">Crea tu publicación</div>
            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => navigate("/publicar/mis-productos")}
                style={{
                  border: "1px solid rgba(15,23,42,0.14)",
                  background: "rgba(255,255,255,0.95)",
                  borderRadius: 999,
                  padding: "10px 14px",
                  fontWeight: 950,
                  cursor: "pointer",
                  boxShadow: "0 10px 24px rgba(0,0,0,0.08)",
                }}
              >
                📦 Administrar mis productos
              </button>


              {catalogSlug && (
                <button
                  type="button"
                  onClick={() => window.open(`https://lokaly.site/catalog/${catalogSlug}`, "_blank")}
                  style={{
                    border: "1px solid rgba(15,23,42,0.14)",
                    background: "rgba(15,23,42,0.04)",
                    borderRadius: 999,
                    padding: "10px 14px",
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  🔗 Ver mi catálogo
                </button>
              )}
            </div>
            <div className="lp__detailText">
              🕒 Tu publicación estará activa <strong>30 días</strong>. Podrás editarla después.
            </div>

            {/* ✅ NUEVO: banderita de créditos */}
            {!creditsLoading && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: hasCredits ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(15,23,42,0.10)",
                  background: hasCredits ? "rgba(34,197,94,0.06)" : "rgba(15,23,42,0.02)",
                  color: "rgba(15,23,42,0.78)",
                  fontSize: 12.5,
                  fontWeight: 850,
                }}
              >
                {hasCredits ? (
                  <>
                    ✅ Tienes <b>{creditsLeft}</b> publicación(es) disponible(s)
                    {creditsValidUntil ? (
                      <span style={{ opacity: 0.7 }}> · vigencia: {new Date(creditsValidUntil).toLocaleDateString("es-MX")}</span>
                    ) : null}
                  </>
                ) : (
                  <>ℹ️ No tienes publicaciones disponibles. Continúa al pago para activar tu catálogo.</>
                )}
              </div>
            )}

            {submitErr ? (
              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 12,
                  background: "rgba(220,38,38,0.06)",
                  border: "1px solid rgba(220,38,38,0.18)",
                  color: "rgba(127,29,29,0.95)",
                  fontSize: 12.5,
                  fontWeight: 800,
                }}
                role="alert"
              >
                <span aria-hidden>⚠️</span>
                <span>{submitErr}</span>
              </div>
            ) : null}

            <form onSubmit={onSubmit} style={{ marginTop: 14 }}>
              {/* Fotos */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 900, color: "rgba(15,23,42,0.75)" }}>
                    Fotos del producto (máx. {MAX_IMAGES})
                  </label>

                  {images.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearAllImages}
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        fontWeight: 900,
                        color: "rgba(15,23,42,0.62)",
                      }}
                      disabled={submitting}
                    >
                      Quitar todas
                    </button>
                  ) : null}
                </div>

                {activeImage ? (
                  <div style={{ border: "1px solid rgba(15,23,42,0.14)", borderRadius: 16, overflow: "hidden", background: "#fff", position: "relative" }}>
                    <img src={activeImage} alt="Preview" style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }} />

                    {remainingCount > 0 ? (
                      <button
                        type="button"
                        onClick={pickImages}
                        style={{
                          position: "absolute",
                          right: 12,
                          bottom: 12,
                          border: "1px solid rgba(15,23,42,0.14)",
                          background: "rgba(255,255,255,0.92)",
                          borderRadius: 999,
                          padding: "8px 12px",
                          cursor: "pointer",
                          fontWeight: 900,
                          color: "rgba(15,23,42,0.78)",
                          boxShadow: "0 10px 24px rgba(0,0,0,0.10)",
                        }}
                        disabled={submitting}
                      >
                        + Agregar ({remainingCount})
                      </button>
                    ) : (
                      <div style={{ position: "absolute", right: 12, bottom: 12, borderRadius: 999, padding: "8px 12px", background: "rgba(15,23,42,0.85)", color: "white", fontSize: 12, fontWeight: 900 }}>
                        Máximo {MAX_IMAGES}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={pickImages}
                    style={{
                      width: "100%",
                      border: "1px dashed rgba(15,23,42,0.25)",
                      borderRadius: 16,
                      padding: "14px 12px",
                      background: "rgba(15,23,42,0.02)",
                      cursor: "pointer",
                      fontWeight: 900,
                      color: "rgba(15,23,42,0.82)",
                      textAlign: "left",
                    }}
                    disabled={submitting}
                  >
                    + Subir fotos
                    <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: "rgba(15,23,42,0.55)" }}>
                      JPG o PNG · Máx {MAX_IMAGE_MB}MB c/u · Hasta {MAX_IMAGES} imágenes
                    </div>
                  </button>
                )}

                {images.length > 0 ? (
                  <div style={{ marginTop: 10, display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6 }} aria-label="Carrusel de imágenes">
                    {images.map((img, idx) => {
                      const active = idx === activeIndex;
                      return (
                        <div
                          key={idx}
                          style={{
                            position: "relative",
                            minWidth: 74,
                            width: 74,
                            height: 74,
                            borderRadius: 14,
                            overflow: "hidden",
                            border: active ? "2px solid rgba(245,158,11,0.95)" : "1px solid rgba(15,23,42,0.14)",
                            boxShadow: active ? "0 0 0 4px rgba(245,158,11,0.16)" : "none",
                            background: "#fff",
                            cursor: "pointer",
                            flex: "0 0 auto",
                            opacity: submitting ? 0.7 : 1,
                            pointerEvents: submitting ? "none" : "auto",
                          }}
                          onClick={() => setActiveIndex(idx)}
                          title={active ? "Imagen principal" : "Ver imagen"}
                          role="button"
                        >
                          <img src={img.previewUrl} alt={`Imagen ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImageAt(idx);
                            }}
                            aria-label={`Eliminar imagen ${idx + 1}`}
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              width: 26,
                              height: 26,
                              borderRadius: 999,
                              border: "none",
                              background: "rgba(15,23,42,0.85)",
                              color: "white",
                              fontWeight: 900,
                              cursor: "pointer",
                              display: "grid",
                              placeItems: "center",
                              lineHeight: 1,
                            }}
                            disabled={submitting}
                          >
                            ×
                          </button>

                          {active ? (
                            <div style={{ position: "absolute", left: 6, bottom: 6, background: "rgba(245,158,11,0.95)", color: "#0b1220", fontSize: 10, fontWeight: 950, padding: "4px 6px", borderRadius: 999 }}>
                              Principal
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={onFilesChange} disabled={submitting} />

                {imgErr ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(220,38,38,0.95)", fontWeight: 800 }}>
                    {imgErr}
                  </div>
                ) : touched && images.length === 0 ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(220,38,38,0.95)", fontWeight: 800 }}>
                    Sube al menos una foto para continuar.
                  </div>
                ) : null}
              </div>

              {/* Nombre */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 900, color: "rgba(15,23,42,0.75)", marginBottom: 8 }}>
                  Nombre del producto
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setTouched(true)}
                  style={{
                    width: "100%",
                    border: "1px solid rgba(15,23,42,0.14)",
                    borderRadius: 14,
                    padding: "12px 14px",
                    fontSize: 15,
                    fontWeight: 800,
                    outline: "none",
                    opacity: submitting ? 0.7 : 1,
                  }}
                  disabled={submitting}
                />
                {touched && title.trim().length < 2 ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(220,38,38,0.95)", fontWeight: 800 }}>
                    Escribe un nombre (mínimo 2 caracteres).
                  </div>
                ) : null}
              </div>

              {/* Precio */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 900, color: "rgba(15,23,42,0.75)", marginBottom: 8 }}>
                  Precio
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(15,23,42,0.14)", borderRadius: 14, padding: "10px 12px", background: "#fff", opacity: submitting ? 0.7 : 1 }}>
                  <div style={{ fontWeight: 950, color: "rgba(15,23,42,0.75)" }}>$</div>
                  <input
                    value={price}
                    onChange={(e) => setPrice(sanitizeMoneyInput(e.target.value))}
                    onBlur={() => setTouched(true)}
                    inputMode="decimal"
                    style={{ flex: 1, border: "none", outline: "none", fontSize: 16, fontWeight: 900, color: "#0f172a", background: "transparent" }}
                    disabled={submitting}
                  />
                </div>

                <div style={{ marginTop: 8, fontSize: 12, color: "rgba(15,23,42,0.55)", fontWeight: 700 }}>
                  Precio final (sin comisiones)
                </div>

                {touched && sanitizeMoneyInput(price).length === 0 ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(220,38,38,0.95)", fontWeight: 800 }}>
                    Ingresa un precio.
                  </div>
                ) : null}
              </div>

              {/* Cantidad disponible */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 900, color: "rgba(15,23,42,0.75)", marginBottom: 8 }}>
                  Cantidad disponible
                </label>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => String(Math.max(1, Number(q || "1") - 1)))}
                    disabled={submitting}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      border: "1px solid rgba(15,23,42,0.14)",
                      background: "rgba(255,255,255,0.95)",
                      cursor: "pointer",
                      fontWeight: 950,
                    }}
                  >
                    −
                  </button>

                  <input
                    value={quantity}
                    onChange={(e) => setQuantity(sanitizeIntInput(e.target.value))}
                    onBlur={(e) => {
                      setTouched(true);
                      // normaliza a mínimo 1
                      const n = Number(e.currentTarget.value || "0");
                      if (!Number.isFinite(n) || n < 1) setQuantity("1");
                    }}
                    inputMode="numeric"
                    placeholder="1"
                    style={{
                      flex: 1,
                      border: "1px solid rgba(15,23,42,0.14)",
                      borderRadius: 14,
                      padding: "12px 14px",
                      fontSize: 15,
                      fontWeight: 900,
                      outline: "none",
                      opacity: submitting ? 0.7 : 1,
                      textAlign: "center",
                    }}
                    disabled={submitting}
                  />

                  <button
                    type="button"
                    onClick={() => setQuantity((q) => String(Math.max(1, Number(q || "0") + 1)))}
                    disabled={submitting}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      border: "1px solid rgba(15,23,42,0.14)",
                      background: "rgba(255,255,255,0.95)",
                      cursor: "pointer",
                      fontWeight: 950,
                    }}
                  >
                    +
                  </button>
                </div>

                {touched && qtyNum < 1 ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(220,38,38,0.95)", fontWeight: 800 }}>
                    La cantidad debe ser mínimo 1.
                  </div>
                ) : (
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(15,23,42,0.55)", fontWeight: 700 }}>
                    Si se agota, luego podemos mostrar “Agotado”.
                  </div>
                )}
              </div>

              {/* Destacado */}
              <div style={{ marginBottom: 14 }}>
                <button
                  type="button"
                  onClick={() => setFeatured((v) => !v)}
                  disabled={submitting}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,0.14)",
                    background: "rgba(255,255,255,0.95)",
                    cursor: "pointer",
                    fontWeight: 900,
                    color: "rgba(15,23,42,0.78)",
                    opacity: submitting ? 0.7 : 1,
                    textAlign: "left",
                  }}
                >
                  <span>⭐ Marcar como destacado</span>

                  {/* switch */}
                  <span
                    aria-hidden
                    style={{
                      width: 44,
                      height: 26,
                      borderRadius: 999,
                      background: featured ? "rgba(34,197,94,0.25)" : "rgba(15,23,42,0.12)",
                      border: featured ? "1px solid rgba(34,197,94,0.40)" : "1px solid rgba(15,23,42,0.18)",
                      position: "relative",
                      flex: "0 0 auto",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 3,
                        left: featured ? 22 : 3,
                        width: 20,
                        height: 20,
                        borderRadius: 999,
                        background: featured ? "rgba(34,197,94,0.95)" : "rgba(255,255,255,0.95)",
                        border: "1px solid rgba(15,23,42,0.18)",
                        boxShadow: "0 8px 16px rgba(0,0,0,0.10)",
                        transition: "left 160ms ease",
                      }}
                    />
                  </span>
                </button>

                <div style={{ marginTop: 6, fontSize: 12, color: "rgba(15,23,42,0.55)", fontWeight: 700 }}>
                  Aparecerá primero en tu catálogo.
                </div>
              </div>

              {/* Descripción */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 900, color: "rgba(15,23,42,0.75)", marginBottom: 8 }}>
                  Descripción (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe brevemente tu producto…"
                  rows={4}
                  style={{ width: "100%", border: "1px solid rgba(15,23,42,0.14)", borderRadius: 14, padding: "12px 14px", fontSize: 14, fontWeight: 750, outline: "none", resize: "vertical", opacity: submitting ? 0.7 : 1 }}
                  disabled={submitting}
                />
              </div>

        <button
  className="lp__btn lp__btn--primary"
  type="submit"
  disabled={!isValid || submitting || creditsLoading || tosAccepted !== true}
  style={{
    width: "100%",
    opacity: !isValid || submitting || creditsLoading || tosAccepted !== true ? 0.7 : 1,
    cursor: !isValid || submitting || creditsLoading || tosAccepted !== true ? "not-allowed" : "pointer",
  }}
>
  {submitting ? "Procesando..." : primaryCtaText}
</button>

              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                {ctaSubText}
              </div>
            </form>
          </div>   
          <div className="lp__detailRight">
            <div className="lp__detailImgWrap">
              <div style={{ width: "100%" }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>Resumen</div>

                <div style={{ fontSize: 13, color: "rgba(15,23,42,0.70)", lineHeight: 1.55 }}>
                  ✅ Publicación activa: <strong>30 días</strong>
                  <br />
                  ✅ Sin comisiones por venta
                  <br />
                  ✅ Tus clientes te escriben por WhatsApp
                </div>

                <div style={{ marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid rgba(15,23,42,0.10)", background: "rgba(37,99,235,0.06)", color: "rgba(15,23,42,0.78)", fontSize: 12, fontWeight: 800 }}>
                  Tip: Una buena foto aumenta tus ventas.
                </div>
              </div>
            </div>      
          </div>
        </section>
      </main>
{tosOpen ? (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}
  >
    <div
      style={{
        width: "min(720px, 100%)",
        maxHeight: "85vh",
        overflow: "auto",
        background: "#fff",
        borderRadius: 18,
        padding: 16,
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ fontWeight: 950, fontSize: 16 }}>
        Términos y Política de Privacidad
      </div>

      <div style={{ marginTop: 8, fontSize: 13, color: "rgba(15,23,42,0.75)", lineHeight: 1.5 }}>
        Para publicar en Lokaly necesitas aceptar los Términos y la Política de Privacidad.
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a className="lp__btn lp__btn--ghost" href="/terms.html" target="_blank" rel="noreferrer">
          Ver términos
        </a>
        <a className="lp__btn lp__btn--ghost" href="/privacy.html" target="_blank" rel="noreferrer">
          Ver privacidad
        </a>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
        <button
          className="lp__btn lp__btn--ghost"
          type="button"
          onClick={() => {
            setTosOpen(false);
            setSubmitErr("Debes aceptar Términos y Privacidad para publicar.");
          }}
          disabled={tosSaving}
        >
          Cancelar
        </button>

        <button
          className="lp__btn lp__btn--primary"
          type="button"
          onClick={onAcceptTos}
          disabled={tosSaving}
        >
          {tosSaving ? "Guardando..." : "Acepto"}
        </button>
      </div>
    </div>
  </div>
) : null}         
    </div>
  );
}