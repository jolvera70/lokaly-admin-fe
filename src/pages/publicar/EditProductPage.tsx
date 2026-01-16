// src/pages/publicar/EditProductPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import "../LandingPage.css";
import logoMark from "../../assets/brand/lokaly-mark.svg";
import { usePublishGuard } from "../../hooks/usePublishGuard";
import { listMyCatalogProducts } from "../../api";

// ✅ si ya tienes updateCatalogProduct(), úsalo.
// Si no, te dejo aquí un fetch directo:
async function updateCatalogProduct(productId: string, payload: { title: string; price: string; description?: string }) {
  const res = await fetch(`/api/public/v1/catalog/products/${productId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err: any = new Error(txt || "No se pudo actualizar el producto");
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export default function EditProductPage() {
  const navigate = useNavigate();
  const { productId } = useParams<{ productId: string }>();
  const { loading, ok } = usePublishGuard({ redirectTo: "/publicar" });

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Carga inicial (sin endpoint GET by id: lo sacamos del list)
  useEffect(() => {
    if (loading || !ok) return;
    if (!productId) return;

    (async () => {
      try {
        const items = await listMyCatalogProducts({ draft: false });
        const p = items.find((x) => x.id === productId);
        if (!p) {
          setErr("No encontré ese producto en tu catálogo.");
          return;
        }
        setTitle(p.title || "");
        setPrice(p.price || "");
        setDescription((p.description as any) || "");
      } catch (e: any) {
        setErr("No se pudo cargar el producto.");
      }
    })();
  }, [loading, ok, productId]);

  if (loading) return null;
  if (!ok) return null;

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) return;

    setErr(null);
    setSaving(true);
    try {
      await updateCatalogProduct(productId, { title: title.trim(), price: String(price).trim(), description: description.trim() });
      navigate("/publicar/mis-productos");
    } catch (e: any) {
      setErr(e?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
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
            <Link className="lp__navLink" to="/publicar/mis-productos">← Mis productos</Link>
          </nav>
        </div>
      </header>

      <main className="lp__main">
        <section className="lp__detail" style={{ marginTop: 18 }}>
          <div className="lp__detailLeft">
            <div className="lp__detailKicker">Editar</div>
            <div className="lp__detailTitle">Producto</div>
            <div className="lp__detailText">Actualiza título, precio y descripción.</div>

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
              <label className="lp__label">Nombre</label>
              <input className="lp__input lp__input--phone" value={title} onChange={(e) => setTitle(e.target.value)} />

              <label className="lp__label">Precio</label>
              <input className="lp__input lp__input--phone" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />

              <label className="lp__label">Descripción</label>
              <textarea className="lp__input lp__input--phone" style={{ height: 110, paddingTop: 10 }} value={description} onChange={(e) => setDescription(e.target.value)} />

              <button className="lp__btn lp__btn--primary lp__btn--block" disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>

              <button
                type="button"
                className="lp__btn lp__btn--ghost lp__btn--block"
                onClick={() => navigate("/publicar/mis-productos")}
                disabled={saving}
              >
                Cancelar
              </button>
            </form>
          </div>

          <div className="lp__detailRight">
            <div className="lp__detailImgWrap">
              <div style={{ width: "100%" }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>Tip</div>
                <div style={{ fontSize: 13, color: "rgba(15,23,42,0.68)", lineHeight: 1.45 }}>
                  Si vas a permitir cambiar imágenes después, conviene hacerlo en un endpoint separado (y comprimir antes en el FE).
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}