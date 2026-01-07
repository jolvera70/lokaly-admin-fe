import React, { useEffect, useMemo, useState } from "react";

/**
 * Ajusta esto a tu backend.
 * Ejemplos:
 * - https://lokaly.site/api/seller
 * - http://localhost:8080/api/seller
 */
const SELLER_BASE_URL = "https://lokaly.site/api/seller";

/**
 * URL pública del catálogo para compartir en WhatsApp.
 * Debe quedar algo como: https://lokaly.site/catalog/mi-slug
 */
const PUBLIC_CATALOG_URL_PREFIX = "https://lokaly.site/catalog";

type SellerProduct = {
  id: string;
  name: string;
  price: number;
  description?: string;
  active: boolean;
  imageUrls?: string[];
  featured?: boolean;
};

type SellerMe = {
  id: string;
  name: string;
  slug: string; // para el link público
  whatsapp?: string;
};

function getToken() {
  return localStorage.getItem("lokaly_admin_token") || "";
}

function authHeaders(extra?: Record<string, string>) {
  const token = getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra ?? {}),
  };
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

export default function SellerProductsPage() {
  const [me, setMe] = useState<SellerMe | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form
  const [form, setForm] = useState<{
    id?: string;
    name: string;
    price: string;
    description: string;
    active: boolean;
    featured: boolean;
  }>({
    name: "",
    price: "",
    description: "",
    active: true,
    featured: false,
  });

  const isEditing = useMemo(() => !!form.id, [form.id]);

  const catalogUrl = useMemo(() => {
    if (!me?.slug) return null;
    return `${PUBLIC_CATALOG_URL_PREFIX}/${me.slug}`;
  }, [me?.slug]);

  async function loadAll() {
    try {
      setLoading(true);
      setError(null);

      // 1) Perfil seller
      // Ajusta el endpoint si es distinto en tu BE
      const meRes = await fetch(`${SELLER_BASE_URL}/me`, {
        headers: authHeaders(),
      });

      if (!meRes.ok) {
        const body = await safeJson(meRes);
        throw new Error(body?.message || "No se pudo cargar tu perfil (me).");
      }
      const meRaw = await safeJson(meRes);

      const normalizedMe: SellerMe = {
        id: meRaw.id,
        name: meRaw.fullName ?? meRaw.name,
        slug: meRaw.slug,
        whatsapp: meRaw.whatsapp,
      };
      setMe(normalizedMe);

      // 2) Productos
      const res = await fetch(`${SELLER_BASE_URL}/products`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.message || "No se pudieron cargar tus productos.");
      }

      const raw = await safeJson(res);

      const normalized: SellerProduct[] = (raw ?? []).map((p: any) => ({
        id: p.id,
        name: p.title ?? p.name,
        price: Number(p.price ?? 0),
        description: p.description ?? p.shortDescription ?? "",
        active: p.active !== false,
        featured: !!p.featured,
        imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : Array.isArray(p.images) ? p.images : [],
      }));

      setProducts(normalized);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function resetForm() {
    setForm({
      name: "",
      price: "",
      description: "",
      active: true,
      featured: false,
    });
  }

  function startEdit(p: SellerProduct) {
    setForm({
      id: p.id,
      name: p.name,
      price: String(p.price),
      description: p.description ?? "",
      active: p.active,
      featured: !!p.featured,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProduct() {
    try {
      setSaving(true);
      setError(null);

      const name = form.name.trim();
      const price = Number(form.price);

      if (!name) throw new Error("Nombre requerido.");
      if (!Number.isFinite(price) || price <= 0) throw new Error("Precio inválido.");

      const payload = {
        name,
        price,
        description: form.description.trim(),
        active: form.active,
        featured: form.featured,
      };

      const url = isEditing
        ? `${SELLER_BASE_URL}/products/${form.id}`
        : `${SELLER_BASE_URL}/products`;

      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.message || "No se pudo guardar el producto.");
      }

      resetForm();
      await loadAll();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: string) {
    if (!confirm("¿Seguro que quieres eliminar este producto?")) return;

    try {
      setError(null);
      const res = await fetch(`${SELLER_BASE_URL}/products/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.message || "No se pudo eliminar.");
      }

      await loadAll();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error eliminando");
    }
  }

  async function toggleActive(p: SellerProduct) {
    // Si no tienes endpoint PATCH, puedes cambiarlo por PUT completo con el producto
    try {
      setError(null);

      const res = await fetch(`${SELLER_BASE_URL}/products/${p.id}/active`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ active: !p.active }),
      });

      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.message || "No se pudo cambiar el estado.");
      }

      await loadAll();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error cambiando estado");
    }
  }

  async function copyCatalogLink() {
    if (!catalogUrl) return;
    try {
      await navigator.clipboard.writeText(catalogUrl);
      alert("Link del catálogo copiado ✅");
    } catch {
      alert("No se pudo copiar. Copia manual: " + catalogUrl);
    }
  }

  async function copyProductLink(productId: string) {
    const url = `${window.location.origin}/p/${productId}`;
    try {
      await navigator.clipboard.writeText(url);
      alert("Link del producto copiado ✅");
    } catch {
      alert("No se pudo copiar. Copia manual: " + url);
    }
  }

  return (
    <div style={{ padding: 18, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: "6px 0 6px", fontSize: 22, fontWeight: 900 }}>
            Mis productos
          </h2>
          <div style={{ color: "#6B7280", fontSize: 13 }}>
            Crea tu catálogo para compartirlo por WhatsApp (sin app).
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {catalogUrl && (
            <>
              <button onClick={() => window.open(catalogUrl, "_blank")} style={btnOutline}>
                Ver mi catálogo
              </button>
              <button onClick={copyCatalogLink} style={btnOutline}>
                Copiar link
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div style={alertError}>
          {error}
        </div>
      )}

      {/* Form */}
      <div style={card}>
        <div style={{ fontWeight: 900, marginBottom: 10 }}>
          {isEditing ? "Editar producto" : "Crear producto"}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
          <input
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            placeholder="Nombre del producto"
            style={input}
          />
          <input
            value={form.price}
            onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
            placeholder="Precio (MXN)"
            style={input}
            inputMode="decimal"
          />
        </div>

        <textarea
          value={form.description}
          onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
          placeholder="Descripción"
          style={{ ...input, marginTop: 10, minHeight: 80, borderRadius: 14 }}
        />

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
          <label style={checkLabel}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((s) => ({ ...s, active: e.target.checked }))}
            />
            <span>Activo</span>
          </label>

          <label style={checkLabel}>
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm((s) => ({ ...s, featured: e.target.checked }))}
            />
            <span>Destacado</span>
          </label>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <button onClick={saveProduct} disabled={saving} style={btnPrimary}>
            {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Crear"}
          </button>

          {isEditing && (
            <button onClick={resetForm} style={btnOutline}>
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ color: "#6B7280" }}>Cargando…</div>
        ) : products.length === 0 ? (
          <div style={{ color: "#6B7280" }}>Aún no tienes productos.</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 12,
            }}
          >
            {products.map((p) => (
              <div key={p.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900 }}>{p.name}</div>
                    <div style={{ fontWeight: 900, marginTop: 2 }}>
                      ${p.price.toLocaleString("es-MX")} MXN
                    </div>
                    {p.description ? (
                      <div style={{ marginTop: 6, fontSize: 12, color: "#6B7280" }}>
                        {p.description}
                      </div>
                    ) : null}

                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {p.featured && <span style={pillFeatured}>Destacado</span>}
                      <span style={p.active ? pillActive : pillInactive}>
                        {p.active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button onClick={() => startEdit(p)} style={btnOutline}>
                      Editar
                    </button>
                    <button onClick={() => deleteProduct(p.id)} style={btnDanger}>
                      Eliminar
                    </button>
                    <button onClick={() => toggleActive(p)} style={btnOutline}>
                      {p.active ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <button onClick={() => window.open(`/p/${p.id}`, "_blank")} style={btnOutline}>
                    Ver público
                  </button>
                  <button onClick={() => copyProductLink(p.id)} style={btnOutline}>
                    Copiar link
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =======================
   Styles (MVP)
======================= */

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 16,
  padding: 12,
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #E5E7EB",
  outline: "none",
  fontSize: 14,
};

const btnPrimary: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "none",
  background: "#111827",
  color: "#fff",
  fontWeight: 900,
  cursor: "pointer",
};

const btnOutline: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid #E5E7EB",
  background: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const btnDanger: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid #FCA5A5",
  background: "#FEF2F2",
  color: "#991B1B",
  fontWeight: 900,
  cursor: "pointer",
};

const alertError: React.CSSProperties = {
  marginTop: 12,
  padding: 10,
  borderRadius: 12,
  background: "#FEF2F2",
  border: "1px solid #FCA5A5",
  color: "#991B1B",
  fontWeight: 700,
};

const checkLabel: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  fontWeight: 800,
  color: "#111827",
};

const pillFeatured: React.CSSProperties = {
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  background: "#FEF3C7",
  border: "1px solid #FBBF24",
  color: "#92400E",
};

const pillActive: React.CSSProperties = {
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  background: "#DCFCE7",
  color: "#166534",
};

const pillInactive: React.CSSProperties = {
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  background: "#F3F4F6",
  color: "#374151",
};