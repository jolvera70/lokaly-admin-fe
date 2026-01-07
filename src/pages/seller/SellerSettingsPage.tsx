import React, { useEffect, useMemo, useState } from "react";

const SELLER_BASE_URL = "https://lokaly.site/api/seller";
const PUBLIC_CATALOG_URL_PREFIX = "https://lokaly.site/catalog";

type SellerMe = {
  id: string;
  name: string;
  slug: string;
  whatsapp?: string; // ideal: 52XXXXXXXXXX
  description?: string;
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

function normalizeMe(raw: any): SellerMe {
  return {
    id: raw.id,
    name: raw.fullName ?? raw.name ?? "",
    slug: raw.slug ?? "",
    whatsapp: raw.whatsapp ?? "",
    description: raw.description ?? "",
  };
}

function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeWhatsapp(input: string) {
  // deja solo dígitos
  return input.replace(/[^\d]/g, "");
}

function isValidSlug(slug: string) {
  // 3..40, letras/números/guiones, no empieza/termina con guion
  if (slug.length < 3 || slug.length > 40) return false;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return false;
  return true;
}

function isValidWhatsapp(num: string) {
  // México suele ser 12 dígitos con 52 + 10 dígitos (ej: 521477...)
  // pero permitimos 10..13 para flexibilidad
  const n = normalizeWhatsapp(num);
  return n.length >= 10 && n.length <= 13;
}

export default function SellerSettingsPage() {
  const [me, setMe] = useState<SellerMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    whatsapp: "",
    description: "",
  });

  const catalogUrl = useMemo(() => {
    const slug = form.slug?.trim();
    if (!slug) return null;
    return `${PUBLIC_CATALOG_URL_PREFIX}/${slug}`;
  }, [form.slug]);

  async function loadMe() {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch(`${SELLER_BASE_URL}/me`, {
        headers: authHeaders(),
      });

      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.message || "No se pudo cargar tu configuración.");
      }

      const raw = await safeJson(res);
      const normalized = normalizeMe(raw);

      setMe(normalized);
      setForm({
        name: normalized.name ?? "",
        slug: normalized.slug ?? "",
        whatsapp: normalized.whatsapp ?? "",
        description: normalized.description ?? "",
      });
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error cargando configuración");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onAutoSlug() {
    setForm((s) => ({ ...s, slug: normalizeSlug(s.slug || s.name) }));
  }

  async function onSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const name = form.name.trim();
      const slug = normalizeSlug(form.slug);
      const whatsapp = normalizeWhatsapp(form.whatsapp);
      const description = form.description.trim();

      if (!name) throw new Error("El nombre es requerido.");
      if (!isValidSlug(slug)) {
        throw new Error(
          "Slug inválido. Usa 3-40 caracteres: letras minúsculas, números y guiones (ej: mi-tienda-123)."
        );
      }
      if (whatsapp && !isValidWhatsapp(whatsapp)) {
        throw new Error(
          "WhatsApp inválido. Usa solo números. Ejemplo MX: 5214771234567"
        );
      }

      const payload = {
        name,
        slug,
        whatsapp: whatsapp || null,
        description: description || null,
      };

      // Ajusta el endpoint si el tuyo es distinto:
      // PUT /api/seller/me
      const res = await fetch(`${SELLER_BASE_URL}/me`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await safeJson(res);
        throw new Error(body?.message || "No se pudo guardar.");
      }

      const raw = await safeJson(res);
      const normalized = raw ? normalizeMe(raw) : { ...me!, ...payload };

      setMe(normalized);
      setForm({
        name: normalized.name ?? name,
        slug: normalized.slug ?? slug,
        whatsapp: normalized.whatsapp ?? whatsapp,
        description: normalized.description ?? description,
      });

      setSuccess("Cambios guardados ✅");
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  async function copyCatalogLink() {
    if (!catalogUrl) return;
    try {
      await navigator.clipboard.writeText(catalogUrl);
      setSuccess("Link copiado ✅");
      setTimeout(() => setSuccess(null), 1500);
    } catch {
      alert("No se pudo copiar. Copia manual: " + catalogUrl);
    }
  }

  return (
    <div style={{ padding: 18, maxWidth: 950, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: "6px 0 6px", fontSize: 22, fontWeight: 950 }}>
            Configuración
          </h2>
          <div style={{ color: "#6B7280", fontSize: 13 }}>
            Ajusta tu perfil y el link que compartes por WhatsApp.
          </div>
        </div>

        {catalogUrl && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={() => window.open(catalogUrl, "_blank")} style={btnOutline}>
              Ver catálogo
            </button>
            <button onClick={copyCatalogLink} style={btnOutline}>
              Copiar link
            </button>
          </div>
        )}
      </div>

      {error && <div style={alertError}>{error}</div>}
      {success && <div style={alertSuccess}>{success}</div>}

      {loading ? (
        <div style={{ marginTop: 14, color: "#6B7280" }}>Cargando…</div>
      ) : (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div style={card}>
            <div style={cardTitle}>Perfil del vendedor</div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginTop: 10 }}>
              <div>
                <label style={label}>Nombre / Tienda</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Ej: Tortillas Don Pepe"
                  style={input}
                />
              </div>

              <div>
                <label style={label}>WhatsApp</label>
                <input
                  value={form.whatsapp}
                  onChange={(e) => setForm((s) => ({ ...s, whatsapp: e.target.value }))}
                  placeholder="Ej: 5214771234567"
                  style={input}
                  inputMode="numeric"
                />
                <div style={hint}>
                  Solo números. Recomendado MX: <strong>52</strong> + 10 dígitos.
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginTop: 10 }}>
              <div>
                <label style={label}>Slug (tu link público)</label>
                <input
                  value={form.slug}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, slug: normalizeSlug(e.target.value) }))
                  }
                  placeholder="ej: tortillas-don-pepe"
                  style={input}
                />
                <div style={hint}>
                  Quedará:{" "}
                  <strong>
                    {catalogUrl ?? `${PUBLIC_CATALOG_URL_PREFIX}/(tu-slug)`}
                  </strong>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button onClick={onAutoSlug} style={btnOutline}>
                  Generar desde nombre
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={label}>Descripción</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Ej: Hacemos entregas en la zona, pedidos por WhatsApp..."
                style={{ ...input, borderRadius: 14, minHeight: 90 }}
              />
            </div>
          </div>

          <div style={card}>
            <div style={cardTitle}>Acciones</div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
              <button onClick={onSave} disabled={saving} style={btnPrimary}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>

              <button onClick={loadMe} style={btnOutline} disabled={saving}>
                Recargar
              </button>

              {catalogUrl && (
                <button
                  onClick={() => {
                    const msg = `Hola! Te comparto mi catálogo: ${catalogUrl}`;
                    const phone = normalizeWhatsapp(form.whatsapp || "");
                    if (!phone) {
                      alert("Configura tu WhatsApp primero.");
                      return;
                    }
                    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
                    window.open(url, "_blank");
                  }}
                  style={btnWhats}
                  disabled={saving}
                >
                  Probar WhatsApp
                </button>
              )}
            </div>

            <div style={{ marginTop: 10, fontSize: 12, color: "#6B7280" }}>
              Si cambias el <strong>slug</strong>, tu link público cambia. Úsalo cuando
              realmente quieras “renombrar” tu catálogo.
            </div>
          </div>

          {/* Debug opcional */}
          {me && (
            <div style={{ fontSize: 11, color: "#9CA3AF" }}>
              ID: {me.id}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* =======================
   Styles
======================= */

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 16,
  padding: 12,
  boxShadow: "0 10px 24px rgba(0,0,0,0.05)",
};

const cardTitle: React.CSSProperties = {
  fontWeight: 950,
  fontSize: 14,
};

const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "#6B7280",
  fontWeight: 900,
  marginBottom: 6,
};

const hint: React.CSSProperties = {
  marginTop: 6,
  fontSize: 11,
  color: "#9CA3AF",
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
  fontWeight: 950,
  cursor: "pointer",
};

const btnOutline: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "1px solid #E5E7EB",
  background: "#fff",
  fontWeight: 950,
  cursor: "pointer",
};

const btnWhats: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 999,
  border: "none",
  background: "#22C55E",
  color: "#fff",
  fontWeight: 950,
  cursor: "pointer",
};

const alertError: React.CSSProperties = {
  marginTop: 12,
  padding: 10,
  borderRadius: 12,
  background: "#FEF2F2",
  border: "1px solid #FCA5A5",
  color: "#991B1B",
  fontWeight: 900,
};

const alertSuccess: React.CSSProperties = {
  marginTop: 12,
  padding: 10,
  borderRadius: 12,
  background: "#ECFDF5",
  border: "1px solid #86EFAC",
  color: "#065F46",
  fontWeight: 900,
};