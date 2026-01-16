// src/pages/publicar/MyProductsPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../LandingPage.css";
import logoMark from "../../assets/brand/lokaly-mark.svg";

import { usePublishGuard } from "../../hooks/usePublishGuard";
import {
  deleteCatalogProduct,
  listMyCatalogProducts,
  setCatalogProductPaused,
  type CatalogProductDto,
  getMyPublisherCatalog,
} from "../../api";

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

function firstImageThumb(p: { imageUrls?: CatalogImageDto[] | null }) {
  const img = p.imageUrls?.[0];
  return resolveImageUrl(img?.thumbUrl || img?.mediumUrl || img?.originalUrl || "");
}

function moneyLabel(price: string) {
  if (!price) return "";
  return `$${price}`;
}

function firstImage(p: CatalogProductDto) {
  return firstImageThumb(p as any);
}

type TabKey = "products" | "orders" | "stats";

function StatCard(props: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(15,23,42,0.10)",
        background: "#fff",
        boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(15,23,42,0.55)" }}>{props.label}</div>
      <div style={{ marginTop: 6, fontSize: 26, fontWeight: 950, color: "rgba(15,23,42,0.88)" }}>{props.value}</div>
      {props.sub ? (
        <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 750, color: "rgba(15,23,42,0.62)", lineHeight: 1.35 }}>
          {props.sub}
        </div>
      ) : null}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(15,23,42,0.08)",
        background: "#fff",
        padding: 12,
        boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 12 }}>
        <div style={{ width: 92, height: 92, borderRadius: 14, background: "rgba(15,23,42,0.06)" }} />
        <div>
          <div style={{ height: 14, width: "62%", borderRadius: 999, background: "rgba(15,23,42,0.06)" }} />
          <div style={{ marginTop: 10, height: 12, width: "85%", borderRadius: 999, background: "rgba(15,23,42,0.05)" }} />
          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ height: 30, width: 110, borderRadius: 999, background: "rgba(15,23,42,0.06)" }} />
            <div style={{ height: 30, width: 90, borderRadius: 999, background: "rgba(15,23,42,0.06)" }} />
            <div style={{ height: 30, width: 100, borderRadius: 999, background: "rgba(15,23,42,0.06)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyProductsPage() {
  const navigate = useNavigate();
  const { loading, ok } = usePublishGuard({ redirectTo: "/publicar" });

  const [tab, setTab] = useState<TabKey>("products");

  const [items, setItems] = useState<CatalogProductDto[]>([]);
  const [fetching, setFetching] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [creditsLeft, setCreditsLeft] = useState<number | null>(null);
  const [creditsLoading, setCreditsLoading] = useState<boolean>(true);

  const [busyId, setBusyId] = useState<string | null>(null);

  const catalogSlug: string | null = null;

  const load = useCallback(async () => {
    setErr(null);
    setFetching(true);

    try {
      const data = await listMyCatalogProducts({ draft: false });
      setItems(data);

      setCreditsLoading(true);
      const catalog = await getMyPublisherCatalog().catch(() => null);
      if (catalog) {
        const total = Number((catalog as any).creditsTotal ?? 0);
        const used = Number((catalog as any).creditsUsed ?? 0);
        setCreditsLeft(Math.max(0, total - used));
      } else {
        setCreditsLeft(null);
      }
    } catch (e: any) {
      const status = e?.status ?? e?.response?.status;
      setErr(status === 401 ? "Tu sesión expiró. Vuelve a verificar tu número." : "No se pudieron cargar tus productos.");
    } finally {
      setFetching(false);
      setCreditsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!ok) return;
    load();
  }, [loading, ok, load]);

  const hasProducts = items.length > 0;

  const activeCount = useMemo(() => items.filter((p) => !Boolean((p as any).paused)).length, [items]);
  const pausedCount = useMemo(() => items.filter((p) => Boolean((p as any).paused)).length, [items]);

  const onTogglePaused = async (p: CatalogProductDto) => {
    const id = p.id;
    if (!id) return;

    const currentPaused = Boolean((p as any).paused);
    const nextPaused = !currentPaused;

    setBusyId(id);
    setErr(null);

    setItems((prev) => prev.map((x) => (x.id === id ? ({ ...x, paused: nextPaused } as any) : x)));

    try {
      await setCatalogProductPaused(id, nextPaused);
    } catch {
      setItems((prev) => prev.map((x) => (x.id === id ? ({ ...x, paused: currentPaused } as any) : x)));
      setErr("No se pudo actualizar el estado. Intenta nuevamente.");
    } finally {
      setBusyId(null);
    }
  };

  const onDelete = async (p: CatalogProductDto) => {
    const id = p.id;
    if (!id) return;

    const okConfirm = window.confirm(`¿Eliminar "${p.title}"? (Se ocultará de tu catálogo)`);
    if (!okConfirm) return;

    setBusyId(id);
    setErr(null);

    const prev = items;
    setItems((xs) => xs.filter((x) => x.id !== id));

    try {
      await deleteCatalogProduct(id);
    } catch {
      setItems(prev);
      setErr("No se pudo eliminar. Intenta nuevamente.");
    } finally {
      setBusyId(null);
    }
  };

  function TabButton(props: { k: TabKey; label: string; emoji: string }) {
    const active = tab === props.k;
    return (
      <button
        type="button"
        onClick={() => setTab(props.k)}
        style={{
          border: "1px solid rgba(15,23,42,0.14)",
          background: active ? "rgba(37,99,235,0.10)" : "rgba(255,255,255,0.95)",
          borderRadius: 999,
          padding: "10px 14px",
          fontWeight: 950,
          cursor: "pointer",
          boxShadow: active ? "0 10px 24px rgba(0,0,0,0.06)" : "none",
        }}
      >
        {props.emoji} {props.label}
      </button>
    );
  }

  if (loading) return null;
  if (!ok) return null;

  const hasCredits = (creditsLeft ?? 0) > 0;

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

            <button className="lp__navCta" onClick={() => navigate("/publicar/producto")}>
              Publicar
            </button>
          </nav>
        </div>
      </header>

      <main className="lp__main">
        <section className="lp__detail" style={{ marginTop: 18 }}>
          <div className="lp__detailLeft">
            <div className="lp__detailKicker">Mi negocio</div>
            <div className="lp__detailTitle">Panel del catálogo</div>
            <div className="lp__detailText">Administra tus productos, revisa pedidos y mira tus estadísticas.</div>

            {creditsLeft !== null && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: hasCredits ? "1px solid rgba(34,197,94,0.25)" : "1px solid rgba(15,23,42,0.10)",
                  background: hasCredits ? "rgba(34,197,94,0.06)" : "rgba(15,23,42,0.02)",
                  fontSize: 12.5,
                  fontWeight: 850,
                  color: "rgba(15,23,42,0.72)",
                }}
              >
                {creditsLoading ? <>Revisando créditos…</> : hasCredits ? <>✅ Tienes <b>{creditsLeft}</b> publicación(es) disponibles</> : <>ℹ️ No tienes publicaciones disponibles. Compra un paquete para publicar nuevos productos.</>}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <TabButton k="products" label="Productos" emoji="📦" />
              <TabButton k="orders" label="Pedidos" emoji="🧾" />
              <TabButton k="stats" label="Estadísticas" emoji="📊" />
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="lp__btn lp__btn--primary"
                onClick={() => navigate("/publicar/producto")}
                disabled={creditsLoading}
                style={{ opacity: creditsLoading ? 0.7 : 1, cursor: creditsLoading ? "not-allowed" : "pointer" }}
              >
                + Publicar producto
              </button>

              <button type="button" className="lp__btn lp__btn--ghost" onClick={() => load()} disabled={fetching}>
                {fetching ? "Actualizando..." : "Actualizar"}
              </button>

              {catalogSlug ? (
                <button type="button" className="lp__btn lp__btn--ghost" onClick={() => window.open(`https://lokaly.site/catalog/${catalogSlug}`, "_blank")}>
                  🔗 Ver mi catálogo
                </button>
              ) : null}
            </div>

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

            {tab === "products" ? (
              <div style={{ marginTop: 14 }}>
                {fetching ? (
                  <div style={{ display: "grid", gap: 12 }}>
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : !hasProducts ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 14,
                      borderRadius: 16,
                      border: "1px solid rgba(15,23,42,0.10)",
                      background: "rgba(15,23,42,0.02)",
                      fontWeight: 850,
                      color: "rgba(15,23,42,0.75)",
                    }}
                  >
                    Aún no tienes productos publicados. Publica tu primero 👇
                    <div style={{ marginTop: 10 }}>
                      <button className="lp__btn lp__btn--primary" onClick={() => navigate("/publicar/producto")}>
                        Publicar ahora
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: 12,
                      gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
                    }}
                  >
                    {/* 2 columnas en pantallas grandes */}
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
                      {items.map((p) => {
                        const paused = Boolean((p as any).paused);
                        const img = firstImage(p);
                        const busy = busyId === p.id;

                        return (
                          <div
                            key={p.id}
                            style={{
                              borderRadius: 18,
                              border: "1px solid rgba(15,23,42,0.10)",
                              background: "#fff",
                              boxShadow: "0 12px 26px rgba(15,23,42,0.05)",
                              overflow: "hidden",
                              opacity: busy ? 0.72 : 1,
                              transition: "transform 140ms ease, box-shadow 140ms ease",
                            }}
                          >
                            {/* imagen */}
                            <div style={{ position: "relative" }}>
                              <div style={{ height: 160, background: "rgba(15,23,42,0.04)" }}>
                                {img ? (
                                  <img
                                    src={img}
                                    alt={p.title}
                                    loading="lazy"
                                    decoding="async"
                                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                  />
                                ) : null}
                              </div>

                              {/* badge precio */}
                              <div
                                style={{
                                  position: "absolute",
                                  top: 10,
                                  right: 10,
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  background: "rgba(255,255,255,0.92)",
                                  border: "1px solid rgba(15,23,42,0.10)",
                                  fontWeight: 950,
                                  fontSize: 13,
                                  color: "rgba(15,23,42,0.88)",
                                  backdropFilter: "blur(10px)",
                                }}
                              >
                                {moneyLabel(p.price)}
                              </div>

                              {/* pill estado */}
                              <div
                                style={{
                                  position: "absolute",
                                  left: 10,
                                  top: 10,
                                  padding: "6px 10px",
                                  borderRadius: 999,
                                  background: paused ? "rgba(245,158,11,0.16)" : "rgba(34,197,94,0.14)",
                                  border: "1px solid rgba(15,23,42,0.10)",
                                  fontWeight: 950,
                                  fontSize: 12,
                                  color: paused ? "rgba(161,98,7,0.95)" : "rgba(21,128,61,0.95)",
                                }}
                              >
                                {paused ? "Pausado" : "Activo"}
                              </div>
                            </div>

                            {/* contenido */}
                            <div style={{ padding: 12 }}>
                              <div
                                style={{
                                  fontWeight: 950,
                                  fontSize: 14,
                                  color: "rgba(15,23,42,0.92)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={p.title}
                              >
                                {p.title}
                              </div>

                              {p.description ? (
                                <div
                                  style={{
                                    marginTop: 6,
                                    fontSize: 12.5,
                                    fontWeight: 750,
                                    color: "rgba(15,23,42,0.62)",
                                    lineHeight: 1.35,
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    minHeight: 34,
                                  }}
                                  title={p.description}
                                >
                                  {p.description}
                                </div>
                              ) : (
                                <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 750, color: "rgba(15,23,42,0.40)", minHeight: 34 }}>
                                  Sin descripción
                                </div>
                              )}

                              {/* acciones */}
                              <div className="lp__actionsRow" style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  onClick={() => onTogglePaused(p)}
                                  disabled={busy}
                                  className="lp__chipBtn"
                                  style={{
                                    background: paused ? "#0f172a" : "rgba(245,158,11,0.10)",
                                    color: paused ? "#fff" : "rgba(15,23,42,0.85)",
                                    border: paused ? "0" : "1px solid rgba(15,23,42,0.14)",
                                    opacity: busy ? 0.7 : 1,
                                    cursor: busy ? "not-allowed" : "pointer",
                                  }}
                                >
                                  {paused ? "▶️ Reactivar" : "⏸️ Pausar"}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => navigate(`/publicar/editar/${p.id}`)}
                                  disabled={busy}
                                  className="lp__chipBtn"
                                  style={{
                                    background: "rgba(15,23,42,0.03)",
                                    opacity: busy ? 0.7 : 1,
                                    cursor: busy ? "not-allowed" : "pointer",
                                  }}
                                >
                                  ✏️ Editar
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onDelete(p)}
                                  disabled={busy}
                                  className="lp__chipBtn"
                                  style={{
                                    background: "rgba(220,38,38,0.06)",
                                    border: "1px solid rgba(220,38,38,0.22)",
                                    color: "rgba(127,29,29,0.95)",
                                    opacity: busy ? 0.7 : 1,
                                    cursor: busy ? "not-allowed" : "pointer",
                                  }}
                                >
                                  🗑️ Eliminar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* 1 columna en móvil */}
                    <style>{`
                      @media (max-width: 900px) {
                        .lp__cardsGrid {
                          grid-template-columns: 1fr !important;
                        }
                      }
                    `}</style>
                  </div>
                )}
              </div>
            ) : null}

            {tab === "orders" ? (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    border: "1px solid rgba(15,23,42,0.10)",
                    background: "rgba(15,23,42,0.02)",
                    fontWeight: 850,
                    color: "rgba(15,23,42,0.75)",
                  }}
                >
                  🧾 Aquí verás los pedidos creados desde tu catálogo.
                  <div style={{ marginTop: 8, fontSize: 12.5, fontWeight: 750, color: "rgba(15,23,42,0.62)", lineHeight: 1.45 }}>
                    Próximo paso (backend):
                    <ul style={{ marginTop: 8 }}>
                      <li>GET pedidos del publisher (por cookie lokaly_pub)</li>
                      <li>Estados: PENDIENTE · ACEPTADO · ENTREGADO · RECHAZADO</li>
                      <li>Acciones: Aceptar · Rechazar · Marcar entregado</li>
                      <li>Mostrar WhatsApp del comprador + lista de productos</li>
                    </ul>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "stats" ? (
              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  <StatCard label="Productos publicados" value={items.length} sub="Conteo actual (del listado)." />
                  <StatCard label="Productos activos" value={activeCount} sub={pausedCount > 0 ? `${pausedCount} pausado(s)` : "Todos activos"} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                  <StatCard label="Créditos disponibles" value={creditsLeft ?? "—"} sub="Para publicar productos nuevos." />
                  <StatCard label="Próxima métrica" value="—" sub="Vistas, conversión, pedidos." />
                </div>
              </div>
            ) : null}
          </div>

          <div className="lp__detailRight">
            <div className="lp__detailImgWrap">
              <div style={{ width: "100%" }}>
                <div style={{ fontWeight: 950, marginBottom: 6 }}>Tip</div>
                <div style={{ fontSize: 13, color: "rgba(15,23,42,0.68)", lineHeight: 1.45 }}>
                  Pausa productos cuando no tengas stock. Así tu catálogo siempre se ve actualizado.
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
                  Siguiente mejora: en “Pedidos” te mostramos el WhatsApp del comprador y botones de estatus.
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}