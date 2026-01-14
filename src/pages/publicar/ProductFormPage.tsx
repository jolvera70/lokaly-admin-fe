// src/pages/publicar/ProductFormPage.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../LandingPage.css";
import logoMark from "../../assets/brand/lokaly-mark.svg";

import { usePublishGuard } from "../../hooks/usePublishGuard";

type ProductDraft = {
  phoneE164: string;
  phoneLocal: string;
  imageFile: File;
  imagePreviewUrl: string;
  title: string;
  price: string;
  description: string;
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

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

export default function ProductFormPage() {
  const navigate = useNavigate();

  // ✅ Seguridad real: valida contra el BE (cookie lokaly_pub)
  const { loading, ok, phoneE164, phoneLocal } = usePublishGuard({
    redirectTo: "/publicar",
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const [touched, setTouched] = useState(false);

  // ✅ cleanup de preview URL
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const priceDigits = useMemo(() => onlyDigits(price), [price]);

  const isValid = useMemo(() => {
    const hasImage = Boolean(imageFile);
    const hasTitle = title.trim().length >= 2;
    const hasPrice = sanitizeMoneyInput(price).length > 0 && priceDigits.length >= 1;
    return hasImage && hasTitle && hasPrice;
  }, [imageFile, title, price, priceDigits]);

  function pickImage() {
    fileInputRef.current?.click();
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isImageFile(file)) {
      alert("Selecciona una imagen (JPG/PNG).");
      return;
    }

    if (file.size > 6 * 1024 * 1024) {
      alert("La imagen es muy grande. Máximo 6MB.");
      return;
    }

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);

    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  function removeImage() {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);

    // 🔐 doble seguridad
    if (!ok) return;
    if (!phoneE164 || !phoneLocal) return;

    if (!isValid || !imageFile || !imagePreviewUrl) return;

    const draft: ProductDraft = {
      phoneE164,
      phoneLocal,
      imageFile,
      imagePreviewUrl,
      title: title.trim(),
      price: sanitizeMoneyInput(price),
      description: description.trim(),
    };

    navigate("/publicar/pago", { state: draft });
  }

  // mientras carga la sesión del BE
  if (loading) return null;

  // si no hay sesión válida, el guard ya redirigió
  if (!ok) return null;

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
            <div className="lp__detailText">
              🕒 Tu publicación estará activa <strong>30 días</strong>. Podrás editarla después.
            </div>

            <form onSubmit={onSubmit} style={{ marginTop: 14 }}>
              {/* Foto */}
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 10,
                    marginBottom: 8,
                  }}
                >
                  <label style={{ fontSize: 13, fontWeight: 900, color: "rgba(15,23,42,0.75)" }}>
                    Foto del producto
                  </label>
                  {imageFile ? (
                    <button
                      type="button"
                      onClick={removeImage}
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        fontWeight: 900,
                        color: "rgba(15,23,42,0.62)",
                      }}
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>

                {imagePreviewUrl ? (
                  <div
                    style={{
                      border: "1px solid rgba(15,23,42,0.14)",
                      borderRadius: 16,
                      overflow: "hidden",
                      background: "#fff",
                    }}
                  >
                    <img
                      src={imagePreviewUrl}
                      alt="Preview"
                      style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={pickImage}
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
                  >
                    + Subir foto
                    <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: "rgba(15,23,42,0.55)" }}>
                      JPG o PNG · Se recomienda buena luz
                    </div>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={onFileChange}
                />

                {touched && !imageFile ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(220,38,38,0.95)", fontWeight: 800 }}>
                    Sube una foto para continuar.
                  </div>
                ) : null}
              </div>

              {/* Nombre */}
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 900,
                    color: "rgba(15,23,42,0.75)",
                    marginBottom: 8,
                  }}
                >
                  Nombre del producto
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="Ej. Pay de queso casero"
                  style={{
                    width: "100%",
                    border: "1px solid rgba(15,23,42,0.14)",
                    borderRadius: 14,
                    padding: "12px 14px",
                    fontSize: 15,
                    fontWeight: 800,
                    outline: "none",
                  }}
                />
                {touched && title.trim().length < 2 ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: "rgba(220,38,38,0.95)", fontWeight: 800 }}>
                    Escribe un nombre (mínimo 2 caracteres).
                  </div>
                ) : null}
              </div>

              {/* Precio */}
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 900,
                    color: "rgba(15,23,42,0.75)",
                    marginBottom: 8,
                  }}
                >
                  Precio
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: "1px solid rgba(15,23,42,0.14)",
                    borderRadius: 14,
                    padding: "10px 12px",
                    background: "#fff",
                  }}
                >
                  <div style={{ fontWeight: 950, color: "rgba(15,23,42,0.75)" }}>$</div>
                  <input
                    value={price}
                    onChange={(e) => setPrice(sanitizeMoneyInput(e.target.value))}
                    onBlur={() => setTouched(true)}
                    inputMode="decimal"
                    placeholder="180"
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      fontSize: 16,
                      fontWeight: 900,
                      color: "#0f172a",
                      background: "transparent",
                    }}
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

              {/* Descripción */}
              <div style={{ marginBottom: 12 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 900,
                    color: "rgba(15,23,42,0.75)",
                    marginBottom: 8,
                  }}
                >
                  Descripción (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe brevemente tu producto…"
                  rows={4}
                  style={{
                    width: "100%",
                    border: "1px solid rgba(15,23,42,0.14)",
                    borderRadius: 14,
                    padding: "12px 14px",
                    fontSize: 14,
                    fontWeight: 750,
                    outline: "none",
                    resize: "vertical",
                  }}
                />
              </div>

              <button
                className="lp__btn lp__btn--primary"
                type="submit"
                disabled={!isValid}
                style={{
                  width: "100%",
                  opacity: !isValid ? 0.7 : 1,
                  cursor: !isValid ? "not-allowed" : "pointer",
                }}
              >
                Continuar al pago
              </button>

              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(15,23,42,0.55)" }}>
                Podrás editar tu publicación después.
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

                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 14,
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "rgba(37,99,235,0.06)",
                    color: "rgba(15,23,42,0.78)",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Tip: Una buena foto aumenta tus ventas.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}