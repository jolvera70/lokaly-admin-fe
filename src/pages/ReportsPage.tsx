// src/pages/ReportsPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";

/* =======================
   Types
======================= */

type ProductImage = {
  originalUrl?: string;
  mediumUrl?: string;
  thumbUrl?: string;
};

type Product = {
  id?: string;
  title?: string;
  description?: string;
  price?: any;
  imageUrls?: ProductImage[];
};

type ContentReport = {
  id?: string;
  _id?: string;
  createdAt?: string;

  targetType?: "PRODUCT" | string;
  productId?: string;
  catalogSlug?: string;
  path?: string;

  reason?: string;
  details?: string; // 👈 comentario del usuario (lo que resaltas en Mongo)

  visitorId?: string;
  ip?: string;
  userAgent?: string;

  // ✅ backend espera: OPEN | REVIEWED | ACTION_TAKEN | DISMISSED
  status?: "OPEN" | "REVIEWED" | "ACTION_TAKEN" | "DISMISSED" | string;
  adminNote?: string;

  updatedAt?: string;
  reviewedAt?: string;
};

type UpdateReportRequest = {
  status: string;
  adminNote?: string | null;
};

/* =======================
   Helpers
======================= */

function rid(r: ContentReport) {
  return (r.id ?? r._id ?? "") as string;
}

function formatDt(iso?: string) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function labelStatus(s?: string) {
  const st = (s ?? "OPEN").toUpperCase();
  if (st === "OPEN") return "OPEN";
  if (st === "REVIEWED") return "REVIEWED";
  if (st === "ACTION_TAKEN") return "ACTION_TAKEN";
  if (st === "DISMISSED") return "DISMISSED";
  return st;
}

function pillStyle(kind: "OPEN" | "REVIEWED" | "ACTION_TAKEN" | "DISMISSED" | "OTHER") {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 850,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.04)",
    color: "#eaeaea",
    whiteSpace: "nowrap",
  };

  if (kind === "OPEN") {
    return {
      ...base,
      border: "1px solid rgba(255,107,107,0.35)",
      color: "#ffb4b4",
      background: "rgba(255,107,107,0.08)",
    };
  }
  if (kind === "REVIEWED") {
    return {
      ...base,
      border: "1px solid rgba(96,165,250,0.35)",
      color: "#cfe6ff",
      background: "rgba(96,165,250,0.08)",
    };
  }
  if (kind === "ACTION_TAKEN") {
    return {
      ...base,
      border: "1px solid rgba(34,197,94,0.35)",
      color: "#bdf7cd",
      background: "rgba(34,197,94,0.08)",
    };
  }
  if (kind === "DISMISSED") {
    return {
      ...base,
      border: "1px solid rgba(250,204,21,0.35)",
      color: "#ffe8a3",
      background: "rgba(250,204,21,0.08)",
    };
  }
  return base;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.08)",
        background: "rgba(8,8,8,0.95)",
        boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
      }}
    >
      <div style={{ fontSize: 14, fontWeight: 800, color: "#f5f5f5", marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "#9b9b9b" }}>{label}</div>
      <div
        style={{
          fontSize: 12,
          color: "#eaeaea",
          wordBreak: "break-word",
          fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" : undefined,
          padding: mono ? "8px 10px" : undefined,
          borderRadius: mono ? 10 : undefined,
          border: mono ? "1px solid rgba(255,255,255,0.08)" : undefined,
          background: mono ? "rgba(255,255,255,0.03)" : undefined,
        }}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

function ReasonBadge({ text }: { text?: string }) {
  if (!text) return <span style={{ color: "#bdbdbd" }}>—</span>;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "5px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 850,
        border: "1px solid rgba(242,213,139,0.30)",
        background: "rgba(242,213,139,0.10)",
        color: "#f2d58b",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );
}

/* =======================
   Component
======================= */

export default function ReportsPage() {
  // ✅ backend statuses
  const [status, setStatus] = useState<"OPEN" | "REVIEWED" | "ACTION_TAKEN" | "DISMISSED">("OPEN");
  const [items, setItems] = useState<ContentReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string>("");

  const selected = useMemo(
    () => items.find((r) => rid(r) === selectedId) ?? null,
    [items, selectedId]
  );

  // editor
  const [editStatus, setEditStatus] = useState<string>("OPEN");
  const [adminNote, setAdminNote] = useState<string>("");

  // producto / fotos
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productLoading, setProductLoading] = useState(false);

  const statusCount = items.length;

  /* =======================
     Load reports
  ======================= */

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${encodeURIComponent(status)}`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(res.status === 401 ? "No autorizado (sesión expirada)." : "No se pudieron cargar los reportes.");
      }

      const data = (await res.json()) as ContentReport[];
      const normalized = (data ?? []).map((r) => ({
        ...r,
        status: (r.status ?? "OPEN").toUpperCase(),
      }));

      setItems(normalized);

      if (selectedId && !normalized.some((r) => rid(r) === selectedId)) {
        setSelectedId("");
      }
    } catch (e: any) {
      setErr(e?.message || "Error cargando reportes");
      setItems([]);
      setSelectedId("");
    } finally {
      setLoading(false);
    }
  }, [status, selectedId]);

  useEffect(() => {
    load();
  }, [load]);

  /* =======================
     Preload editor
  ======================= */

  useEffect(() => {
    if (!selected) return;
    setEditStatus((selected.status ?? "OPEN").toUpperCase());
    setAdminNote(selected.adminNote ?? "");
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* =======================
     Load product (images)
     (usas el endpoint que ya te funciona)
  ======================= */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const r = items.find((x) => rid(x) === selectedId);
      const pid = r?.productId;

      if (!pid) {
        setSelectedProduct(null);
        return;
      }

      setProductLoading(true);
      try {
        const res = await fetch(`/api/public/v1/catalog/products/${encodeURIComponent(pid)}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("No se pudo cargar el producto.");

        const p = (await res.json()) as Product;
        if (!cancelled) setSelectedProduct(p);
      } catch (e) {
        console.error(e);
        if (!cancelled) setSelectedProduct(null);
      } finally {
        if (!cancelled) setProductLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId, items]);

  /* =======================
     Save
  ======================= */

  const save = useCallback(async () => {
    if (!selected) return;
    const id = rid(selected);
    if (!id) return;

    setErr(null);
    setLoading(true);
    try {
      const payload: UpdateReportRequest = {
        status: editStatus,
        adminNote: adminNote?.trim() ? adminNote.trim() : null,
      };

      const res = await fetch(`/api/admin/reports/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg =
          res.status === 401
            ? "No autorizado (sesión expirada)."
            : res.status === 404
            ? "Reporte no encontrado."
            : "No se pudo guardar el reporte.";
        throw new Error(msg);
      }

      await load();
    } catch (e: any) {
      setErr(e?.message || "Error guardando reporte");
    } finally {
      setLoading(false);
    }
  }, [selected, editStatus, adminNote, load]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#f5f5f5" }}>Admin · Reportes</h2>
        <p style={{ margin: "6px 0 0", fontSize: 13, color: "#9b9b9b" }}>
          Revisa anuncios reportados, revisa sus fotos, y marca el estatus.
        </p>
      </section>

      <section
        style={{
          background: "rgba(5,5,5,0.9)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.06)",
          padding: 18,
          display: "grid",
          gap: 14,
        }}
      >
        {/* Controls */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              outline: "none",
              cursor: "pointer",
              minWidth: 200,
              fontWeight: 800,
            }}
          >
            <option value="OPEN">OPEN</option>
            <option value="REVIEWED">REVIEWED</option>
            <option value="ACTION_TAKEN">ACTION_TAKEN</option>
            <option value="DISMISSED">DISMISSED</option>
          </select>

          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(242,213,139,0.35)",
              background: loading ? "rgba(255,255,255,0.08)" : "rgba(242,213,139,0.12)",
              color: "#f2d58b",
              fontWeight: 900,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Cargando..." : "Refrescar"}
          </button>

          <div style={{ marginLeft: "auto", fontSize: 12, color: "#a3a3a3", fontWeight: 700 }}>
            {loading ? "…" : `${statusCount} reportes`}
          </div>
        </div>

        {err ? <div style={{ fontSize: 13, color: "#ff6b6b", fontWeight: 800 }}>{err}</div> : null}

        {/* Layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 0.9fr",
            gap: 14,
            alignItems: "start",
          }}
        >
          {/* LIST */}
          <Panel title="Lista">
            {items.length === 0 ? (
              <div style={{ fontSize: 13, color: "#bdbdbd" }}>
                No hay reportes con status <b>{status}</b>.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {items.map((r) => {
                  const id = rid(r);
                  const isSel = id === selectedId;
                  const st = (r.status ?? "OPEN").toUpperCase();
                  const pillKind =
                    st === "OPEN" || st === "REVIEWED" || st === "ACTION_TAKEN" || st === "DISMISSED"
                      ? (st as any)
                      : "OTHER";

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedId(id)}
                      style={{
                        textAlign: "left",
                        width: "100%",
                        padding: 12,
                        borderRadius: 14,
                        border: isSel ? "1px solid rgba(242,213,139,0.55)" : "1px solid rgba(255,255,255,0.08)",
                        background: isSel ? "rgba(242,213,139,0.08)" : "rgba(255,255,255,0.03)",
                        color: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <ReasonBadge text={r.reason} />
                          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: 800 }}>
                            {r.targetType ?? "—"}
                          </span>
                        </div>

                        <span style={pillStyle(pillKind)}>{labelStatus(st)}</span>
                      </div>

                      <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
                        <div style={{ fontSize: 12, color: "#cfcfcf" }}>
                          Producto:{" "}
                          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                            {r.productId ?? "—"}
                          </span>
                        </div>

                        <div style={{ fontSize: 12, color: "#9b9b9b" }}>
                          {formatDt(r.createdAt)} · {r.catalogSlug ?? "—"}
                        </div>

                        {r.details ? (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 12,
                              color: "#eaeaea",
                              borderRadius: 12,
                              border: "1px solid rgba(255,255,255,0.08)",
                              background: "rgba(255,255,255,0.03)",
                              padding: "10px 12px",
                              lineHeight: 1.35,
                            }}
                          >
                            <div style={{ fontSize: 11, color: "#9b9b9b", fontWeight: 900, marginBottom: 6 }}>
                              Comentario del usuario
                            </div>
                            “{r.details}”
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>

          {/* DETAIL */}
          <Panel title="Detalle / Acción">
            {!selected ? (
              <div style={{ fontSize: 13, color: "#bdbdbd" }}>Selecciona un reporte para ver detalles.</div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                <Field label="ID" value={rid(selected)} mono />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 12, color: "#9b9b9b" }}>Status</div>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(0,0,0,0.6)",
                        color: "#fff",
                        outline: "none",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                    >
                      <option value="OPEN">OPEN</option>
                      <option value="REVIEWED">REVIEWED</option>
                      <option value="ACTION_TAKEN">ACTION_TAKEN</option>
                      <option value="DISMISSED">DISMISSED</option>
                    </select>
                  </div>

                  <Field label="Fecha" value={formatDt(selected.createdAt)} />
                </div>

                <Field label="Producto" value={selected.productId ?? "—"} mono />
                <Field label="Ruta" value={selected.path ?? "—"} mono />

                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, color: "#9b9b9b" }}>Razón</div>
                  <ReasonBadge text={selected.reason} />
                </div>

                {/* ✅ details (comentario del usuario) */}
                {selected.details ? (
                  <div
                    style={{
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.03)",
                      padding: 12,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#9b9b9b", fontWeight: 900, marginBottom: 8 }}>
                      Comentario del usuario
                    </div>
                    <div style={{ fontSize: 13, color: "#f0f0f0", lineHeight: 1.4 }}>
                      “{selected.details}”
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#9b9b9b" }}>Sin comentario del usuario.</div>
                )}

                {/* Admin note */}
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, color: "#9b9b9b" }}>Admin note</div>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Escribe nota interna… (máx 1000 chars)"
                    rows={5}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.6)",
                      color: "#fff",
                      outline: "none",
                      resize: "vertical",
                      lineHeight: 1.35,
                    }}
                  />
                  <div style={{ fontSize: 11, color: "#9b9b9b" }}>
                    {adminNote.length}/1000
                  </div>
                </div>

                <button
                  onClick={save}
                  disabled={loading}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(242,213,139,0.35)",
                    background: loading ? "rgba(255,255,255,0.08)" : "rgba(242,213,139,0.12)",
                    color: "#f2d58b",
                    fontWeight: 950,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Guardando..." : "Guardar cambios"}
                </button>

                <div style={{ fontSize: 11, color: "#9b9b9b", lineHeight: 1.35 }}>
                  <b>REVIEWED</b>: ya lo revisaste. <br />
                  <b>ACTION_TAKEN</b>: ya aplicaste acción (pausar/borrar/etc). <br />
                  <b>DISMISSED</b>: falso reporte / no procede.
                </div>

                {/* Fotos */}
                <div style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 12, color: "#9b9b9b", fontWeight: 900, marginBottom: 8 }}>
                    Fotos del producto
                  </div>

                  {productLoading ? (
                    <div style={{ fontSize: 12, color: "#bdbdbd" }}>Cargando fotos…</div>
                  ) : !selectedProduct?.imageUrls?.length ? (
                    <div style={{ fontSize: 12, color: "#bdbdbd" }}>Este producto no tiene fotos.</div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 8,
                      }}
                    >
                      {selectedProduct.imageUrls.map((img, idx) => {
                        const src = img.mediumUrl || img.originalUrl || img.thumbUrl || "";
                        const full = img.originalUrl || src;
                        return (
                          <a
                            key={idx}
                            href={full}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "block",
                              borderRadius: 12,
                              overflow: "hidden",
                              border: "1px solid rgba(255,255,255,0.10)",
                              background: "rgba(255,255,255,0.03)",
                            }}
                            title="Abrir original"
                          >
                            <img
                              src={src}
                              alt={`foto-${idx}`}
                              style={{
                                width: "100%",
                                height: 110,
                                objectFit: "cover",
                                display: "block",
                              }}
                              loading="lazy"
                            />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Panel>
        </div>
      </section>
    </div>
  );
}