// src/pages/publicar/EditProductPage.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import "../LandingPage.css";
import logoMark from "../../assets/brand/lokaly-mark.svg";
import { usePublishGuard } from "../../hooks/usePublishGuard";
import { listMyCatalogProducts, type CatalogProductDto } from "../../api";

type CatalogImageDto = {
  originalUrl: string;
  mediumUrl: string;
  thumbUrl: string;
};

function resolveImageUrl(rawUrl?: string | null): string {
  if (!rawUrl) return "";
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;

  const path = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  if (path.startsWith("/api/")) return path;

  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const origin = isLocal ? "https://lokaly.site" : window.location.origin;
  return `${origin}${path}`;
}

function pickImg(i: CatalogImageDto) {
  return resolveImageUrl(i.thumbUrl || i.mediumUrl || i.originalUrl);
}

async function updateCatalogProductMultipart(params: {
  productId: string;
  title: string;
  price: string;
  description?: string;
  category?: string;
  quantity: number;
  featured: boolean;
  primaryIndex?: number;
  keepImages: CatalogImageDto[];
  newImages: File[];
}) {
  const fd = new FormData();
  fd.append("title", params.title);
  fd.append("price", params.price);
  fd.append("description", params.description ?? "");
  if (params.category) fd.append("category", params.category);

  fd.append("quantity", String(params.quantity));
  fd.append("featured", String(params.featured));
  fd.append("primaryIndex", String(params.primaryIndex ?? 0));

  // JSON string
  fd.append("keepImages", JSON.stringify(params.keepImages ?? []));
  (params.newImages ?? []).forEach((f) => fd.append("images", f));

  const res = await fetch(`/api/public/v1/catalog/products/${params.productId}`, {
    method: "PUT",
    credentials: "include",
    body: fd,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err: any = new Error(txt || "No se pudo actualizar el producto");
    err.status = res.status;
    throw err;
  }
  return res.json();
}

type PreviewItem =
  | { kind: "keep"; key: string; url: string; keepIndex: number; img: CatalogImageDto }
  | { kind: "new"; key: string; url: string; newIndex: number; file: File };

function clampMoney(raw: string) {
  const s = raw.replace(/[^\d.]/g, "");
  const parts = s.split(".");
  if (parts.length <= 2) return s;
  return `${parts[0]}.${parts.slice(1).join("")}`;
}

export default function EditProductPage() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const { loading, ok } = usePublishGuard({ redirectTo: "/publicar" });

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const [quantity, setQuantity] = useState<number>(1);
  const [featured, setFeatured] = useState<boolean>(false);

  const [keepImages, setKeepImages] = useState<CatalogImageDto[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [primaryIndex, setPrimaryIndex] = useState<number>(0);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load product from list
  useEffect(() => {
    if (loading || !ok) return;
    if (!productId) return;

    (async () => {
      try {
        setErr(null);
        const items = await listMyCatalogProducts({ draft: false });
        const p = (items as any[]).find((x) => x.id === productId) as CatalogProductDto | undefined;

        if (!p) {
          setErr("No encontré ese producto en tu catálogo.");
          return;
        }

        setTitle((p.title as any) || "");
        setPrice(String((p as any).price ?? ""));
        setDescription(((p as any).description as any) || "");

        setQuantity(Number((p as any).availableQuantity ?? 1));
        setFeatured(Boolean((p as any).featured));

        const imgs = (((p as any).imageUrls ?? []) as CatalogImageDto[]).filter(Boolean);
        setKeepImages(imgs);

        const pi = Number((p as any).primaryIndex ?? 0);
        setPrimaryIndex(Number.isFinite(pi) && pi >= 0 ? pi : 0);

        setNewImages([]);
      } catch {
        setErr("No se pudo cargar el producto.");
      }
    })();
  }, [loading, ok, productId]);

  // createObjectURL for new images
  const newImagePreviews = useMemo(() => {
    return newImages.map((file, i) => ({
      file,
      key: `${file.name}-${file.size}-${file.lastModified}-${i}`,
      url: URL.createObjectURL(file),
    }));
  }, [newImages]);

  useEffect(() => {
    return () => {
      newImagePreviews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [newImagePreviews]);

  const previewItems: PreviewItem[] = useMemo(() => {
    const keep: PreviewItem[] = keepImages.map((img, keepIndex) => ({
      kind: "keep",
      keepIndex,
      key: `keep-${keepIndex}-${img.originalUrl}`,
      url: pickImg(img),
      img,
    }));
    const news: PreviewItem[] = newImagePreviews.map((p, newIndex) => ({
      kind: "new",
      newIndex,
      key: `new-${p.key}-${newIndex}`,
      url: p.url,
      file: p.file,
    }));
    return [...keep, ...news];
  }, [keepImages, newImagePreviews]);

  const totalImages = previewItems.length;

  // keep primaryIndex valid
  useEffect(() => {
    if (totalImages === 0) {
      if (primaryIndex !== 0) setPrimaryIndex(0);
      return;
    }
    if (primaryIndex < 0 || primaryIndex >= totalImages) setPrimaryIndex(0);
  }, [totalImages, primaryIndex]);

  const canSave = useMemo(() => {
    if (!productId) return false;
    if (title.trim().length < 2) return false;
    if (!String(price).trim()) return false;
    if (quantity < 1) return false;
    if (totalImages < 1 || totalImages > 5) return false;
    return true;
  }, [productId, title, price, quantity, totalImages]);

  const openFilePicker = () => fileInputRef.current?.click();

  const onPickFiles = (files: File[]) => {
    // allow up to 5 total
    const maxNew = Math.max(0, 5 - keepImages.length);
    setNewImages(files.slice(0, maxNew));
  };

  const onRemoveAt = (idx: number) => {
    const it = previewItems[idx];
    if (!it) return;

    if (it.kind === "keep") {
      setKeepImages((prev) => prev.filter((_, i) => i !== it.keepIndex));
    } else {
      setNewImages((prev) => prev.filter((_, i) => i !== it.newIndex));
    }

    setPrimaryIndex((pi) => {
      if (pi === idx) return 0;
      if (idx < pi) return Math.max(0, pi - 1);
      return pi;
    });
  };

  const onClearAllImages = () => {
    setKeepImages([]);
    setNewImages([]);
    setPrimaryIndex(0);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;

    setErr(null);
    setSaving(true);
    try {
      await updateCatalogProductMultipart({
        productId,
        title: title.trim(),
        price: String(price).trim(),
        description: description.trim(),
        quantity,
        featured,
        primaryIndex,
        keepImages,
        newImages,
      });

      navigate("/publicar/mis-productos");
    } catch (e: any) {
      const status = e?.status;
      if (status === 401) setErr("Tu sesión expiró. Vuelve a verificar tu número.");
      else setErr(e?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;
  if (!ok) return null;

  const cardStyle: React.CSSProperties = {
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 16,
    background: "#fff",
    padding: 14,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 900,
    color: "rgba(15,23,42,0.70)",
    marginTop: 14,
  };

  return (
    <div className="lp">
      <header className="lp__header">
        <div className="lp__headerInner">
          <button className="lp__brand" onClick={() => navigate("/")}>
            <img className="lp__logoImg" src={logoMark} alt="Lokaly" />
            <span className="lp__brandText">Lokaly</span>
          </button>

          <nav className="lp__nav">
            <Link className="lp__navLink" to="/publicar/mis-productos">
              ← Mis productos
            </Link>
          </nav>
        </div>
      </header>

      <main className="lp__main">
        <section className="lp__detail" style={{ marginTop: 18 }}>
          <div className="lp__detailLeft">
            <div className="lp__detailKicker">Editar</div>
            <div className="lp__detailTitle">Producto</div>
            <div className="lp__detailText">Actualiza fotos, título, precio, cantidad y si es destacado.</div>

            {err && (
              <div
                style={{
                  marginTop: 12,
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
                ⚠️ {err}
              </div>
            )}

            <form onSubmit={onSave} style={{ marginTop: 12 }}>
              {/* ===== IMÁGENES (look como CREAR) ===== */}
              <div style={cardStyle}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 950 }}>Fotos del producto (máx. 5)</div>

                  <button
                    type="button"
                    onClick={onClearAllImages}
                    disabled={totalImages === 0}
                    style={{
                      border: "none",
                      background: "transparent",
                      fontWeight: 900,
                      color: totalImages === 0 ? "rgba(15,23,42,0.30)" : "rgba(15,23,42,0.60)",
                      cursor: totalImages === 0 ? "default" : "pointer",
                      textDecoration: totalImages === 0 ? "none" : "underline",
                      padding: 0,
                    }}
                  >
                    Quitar todas
                  </button>
                </div>

                {/* Dropzone grande */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={openFilePicker}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") openFilePicker();
                  }}
                  style={{
                    marginTop: 12,
                    border: "1.5px dashed rgba(15,23,42,0.22)",
                    borderRadius: 14,
                    padding: 14,
                    cursor: "pointer",
                    background: "rgba(15,23,42,0.01)",
                  }}
                >
                  <div style={{ fontWeight: 950 }}>+ Subir fotos</div>
                  <div style={{ fontSize: 12, fontWeight: 750, color: "rgba(15,23,42,0.55)", marginTop: 4 }}>
                    JPG o PNG · Máx 6MB c/u · Hasta 5 imágenes
                  </div>

                  {totalImages > 0 ? (
                    <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 850, color: "rgba(15,23,42,0.65)" }}>
                      Seleccionadas: {totalImages}/5
                    </div>
                  ) : null}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    onPickFiles(files);
                    e.currentTarget.value = "";
                  }}
                />

                {/* fila de thumbs como “crear” */}
                {totalImages > 0 ? (
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 10,
                      overflowX: "auto",
                      paddingBottom: 6,
                    }}
                  >
                    {previewItems.map((it, idx) => {
                      const isPrimary = idx === primaryIndex;
                      return (
                        <div key={it.key} style={{ position: "relative", width: 86, flex: "0 0 auto" }}>
                          <img
                            src={it.url}
                            alt={`img-${idx}`}
                            style={{
                              width: 86,
                              height: 86,
                              objectFit: "cover",
                              borderRadius: 14,
                              border: isPrimary ? "2px solid rgba(245,158,11,0.95)" : "1px solid rgba(15,23,42,0.10)",
                              background: "rgba(15,23,42,0.04)",
                              display: "block",
                            }}
                          />

                          {/* X arriba */}
                          <button
                            type="button"
                            onClick={() => onRemoveAt(idx)}
                            title="Quitar"
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              width: 28,
                              height: 28,
                              borderRadius: 999,
                              border: "1px solid rgba(15,23,42,0.14)",
                              background: "rgba(15,23,42,0.85)",
                              color: "#fff",
                              fontWeight: 950,
                              cursor: "pointer",
                              lineHeight: "28px",
                              textAlign: "center",
                            }}
                          >
                            ×
                          </button>

                          {/* principal abajo */}
                          <button
                            type="button"
                            onClick={() => setPrimaryIndex(idx)}
                            title="Marcar como principal"
                            style={{
                              position: "absolute",
                              left: 8,
                              bottom: 8,
                              borderRadius: 10,
                              border: "none",
                              background: isPrimary ? "rgba(245,158,11,0.95)" : "rgba(255,255,255,0.90)",
                              color: isPrimary ? "rgba(15,23,42,0.95)" : "rgba(15,23,42,0.85)",
                              padding: "5px 8px",
                              fontWeight: 950,
                              cursor: "pointer",
                              fontSize: 12,
                              boxShadow: "0 10px 18px rgba(0,0,0,0.10)",
                              backdropFilter: "blur(10px)",
                            }}
                          >
                            {isPrimary ? "Principal" : "Principal"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {totalImages === 0 ? (
                  <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 850, color: "rgba(127,29,29,0.95)" }}>
                    ⚠️ Debes tener al menos 1 imagen.
                  </div>
                ) : null}

                {totalImages > 5 ? (
                  <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 850, color: "rgba(127,29,29,0.95)" }}>
                    ⚠️ Máximo 5 imágenes. Quita algunas antes de guardar.
                  </div>
                ) : null}
              </div>

              {/* Nombre */}
              <div style={labelStyle}>Nombre del producto</div>
              <input
                className="lp__input lp__input--phone"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Jabón líquido"
                style={{ borderRadius: 14 }}
              />

              {/* Precio */}
              <div style={labelStyle}>Precio</div>
              <div style={{ position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontWeight: 950,
                    color: "rgba(15,23,42,0.65)",
                  }}
                >
                  $
                </div>
                <input
                  className="lp__input lp__input--phone"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(clampMoney(e.target.value))}
                  placeholder="0"
                  style={{ paddingLeft: 30, borderRadius: 14 }}
                />
              </div>
              <div style={{ fontSize: 12, fontWeight: 750, color: "rgba(15,23,42,0.50)", marginTop: 6 }}>
                Precio final (sin comisiones)
              </div>

              {/* Cantidad */}
              <div style={labelStyle}>Cantidad disponible</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "42px 1fr 42px",
                  gap: 10,
                  alignItems: "center",
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "#fff",
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  –
                </button>

                <div
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 950,
                  }}
                >
                  {quantity}
                </div>

                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  style={{
                    height: 42,
                    borderRadius: 12,
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "#fff",
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  +
                </button>
              </div>
              <div style={{ fontSize: 12, fontWeight: 750, color: "rgba(15,23,42,0.50)", marginTop: 6 }}>
                Si se agota, luego podemos mostrar “Agotado”.
              </div>

              {/* Destacado */}
              <div style={{ marginTop: 14, ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 16 }}>⭐</span>
                  <div>
                    <div style={{ fontWeight: 950 }}>Marcar como destacado</div>
                    <div style={{ fontSize: 12, fontWeight: 750, color: "rgba(15,23,42,0.55)", marginTop: 2 }}>
                      Aparecerá primero en tu catálogo.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setFeatured((v) => !v)}
                  aria-pressed={featured}
                  style={{
                    width: 46,
                    height: 26,
                    borderRadius: 999,
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: featured ? "rgba(34,197,94,0.20)" : "rgba(15,23,42,0.06)",
                    position: "relative",
                    cursor: "pointer",
                    padding: 0,
                  }}
                  title="Toggle destacado"
                >
                  <span
                    style={{
                      position: "absolute",
                      top: 3,
                      left: featured ? 24 : 3,
                      width: 20,
                      height: 20,
                      borderRadius: 999,
                      background: "#fff",
                      border: "1px solid rgba(15,23,42,0.14)",
                      boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
                      transition: "left 140ms ease",
                    }}
                  />
                </button>
              </div>

              {/* Descripción */}
              <div style={labelStyle}>Descripción (opcional)</div>
              <textarea
                className="lp__input lp__input--phone"
                style={{ height: 140, paddingTop: 12, borderRadius: 14 }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe brevemente tu producto..."
              />

              {/* Guardar */}
              <button
                className="lp__btn lp__btn--primary lp__btn--block"
                disabled={saving || !canSave}
                style={{
                  marginTop: 16,
                  borderRadius: 14,
                  padding: "14px 16px",
                  fontWeight: 950,
                  opacity: saving || !canSave ? 0.6 : 1,
                }}
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>

              <button
                type="button"
                className="lp__btn lp__btn--ghost lp__btn--block"
                onClick={() => navigate("/publicar/mis-productos")}
                disabled={saving}
                style={{ borderRadius: 14 }}
              >
                Cancelar
              </button>

              {!canSave ? (
                <div style={{ marginTop: 10, fontSize: 12.5, fontWeight: 800, color: "rgba(15,23,42,0.62)" }}>
                  Tip: Debes tener título, precio, cantidad ≥ 1 y entre 1 a 5 imágenes para guardar.
                </div>
              ) : null}
            </form>
          </div>

          <div className="lp__detailRight">
            <div className="lp__detailImgWrap">
              <div style={{ width: "100%" }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>Tip</div>
                <div style={{ fontSize: 13, color: "rgba(15,23,42,0.68)", lineHeight: 1.45 }}>
                  “Principal” cambia el <b>primaryIndex</b>. Para que se vea como primera en tu catálogo, el backend debe reordenar o
                  devolver la lista ordenada.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}