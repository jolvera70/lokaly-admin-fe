import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  acceptSellerOrder,
  fetchSellerOrders,
  markOrderDelivered,
  rejectSellerOrder,
  type SellerOrderDto,
  type OrderStatus,
} from "../../api";

function moneyMXN(value: any) {
  const n = Number(value ?? 0);
  return `$${n.toLocaleString("es-MX")} MXN`;
}

function fmtDate(iso?: string) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-MX", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function normalizeDigits(phone?: string | null) {
  return (phone || "").replace(/[^\d]/g, "");
}

function statusPill(status?: OrderStatus): React.CSSProperties {
  const base = s.pill;
  if (status === "ACCEPTED") return { ...base, background: "#DCFCE7", color: "#166534", borderColor: "#BBF7D0" };
  if (status === "REJECTED") return { ...base, background: "#FEE2E2", color: "#991B1B", borderColor: "#FECACA" };
  if (status === "DELIVERED") return { ...base, background: "#E0E7FF", color: "#3730A3", borderColor: "#C7D2FE" };
  if (status === "CANCELLED") return { ...base, background: "#F3F4F6", color: "#374151", borderColor: "#E5E7EB" };
  return { ...base, background: "#FEF9C3", color: "#854D0E", borderColor: "#FDE68A" }; // PENDING
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<SellerOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<"PENDING" | "ACCEPTED" | "HISTORY">("PENDING");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await fetchSellerOrders();
      setOrders(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setError(e?.message || "Error cargando pedidos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = [...orders];

    if (tab === "PENDING") out = out.filter((o) => (o.status || "PENDING") === "PENDING");
    if (tab === "ACCEPTED") out = out.filter((o) => (o.status || "PENDING") === "ACCEPTED");
    if (tab === "HISTORY")
      out = out.filter((o) => ["REJECTED", "DELIVERED", "CANCELLED"].includes((o.status || "") as any));

    if (q) {
      out = out.filter((o) => {
        const a = (o.productTitle || "").toLowerCase();
        const b = (o.buyerName || "").toLowerCase();
        const c = (o.id || "").toLowerCase();
        return a.includes(q) || b.includes(q) || c.includes(q);
      });
    }

    out.sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });

    return out;
  }, [orders, query, tab]);

  async function accept(id: string) {
    try {
      setBusyId(id);
      await acceptSellerOrder(id);
      await load();
    } catch (e: any) {
      alert(e?.message || "Error aceptando");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    try {
      setBusyId(id);
      await rejectSellerOrder(id);
      await load();
    } catch (e: any) {
      alert(e?.message || "Error rechazando");
    } finally {
      setBusyId(null);
    }
  }

  async function delivered(id: string) {
    try {
      setBusyId(id);
      await markOrderDelivered(id);
      await load();
    } catch (e: any) {
      alert(e?.message || "Error marcando entregado");
    } finally {
      setBusyId(null);
    }
  }

  function openBuyerWhatsApp(order: SellerOrderDto) {
    const phone = normalizeDigits(order.buyerPhone);
    if (!phone) {
      alert("El contacto del comprador solo se muestra al ACEPTAR (privacidad).");
      return;
    }
    const msg = `Hola ${order.buyerName || ""}, soy el vendedor. Sobre tu pedido de "${order.productTitle}". ¿Cómo coordinamos la entrega?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={{ minWidth: 0 }}>
            <div style={s.hTitle}>Pedidos</div>
            <div style={s.hSub}>Panel vendedor (web)</div>
          </div>

          <button onClick={load} style={s.iconBtn} title="Recargar" aria-label="Recargar">
            ↻
          </button>
        </div>

        <div style={s.toolbar}>
          <div style={s.tabs}>
            <button style={{ ...s.tab, ...(tab === "PENDING" ? s.tabActive : {}) }} onClick={() => setTab("PENDING")}>
              Pendientes
            </button>
            <button style={{ ...s.tab, ...(tab === "ACCEPTED" ? s.tabActive : {}) }} onClick={() => setTab("ACCEPTED")}>
              Aceptados
            </button>
            <button style={{ ...s.tab, ...(tab === "HISTORY" ? s.tabActive : {}) }} onClick={() => setTab("HISTORY")}>
              Historial
            </button>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar (producto, comprador, id)…"
            style={s.search}
          />
        </div>

        {loading ? (
          <div style={s.card}>
            <div style={s.skel} />
            <div style={{ ...s.skel, height: 18, marginTop: 10 }} />
            <div style={{ ...s.skel, height: 18, marginTop: 10 }} />
          </div>
        ) : error ? (
          <div style={s.errCard}>
            <div style={s.errTitle}>Error</div>
            <div style={s.errText}>{error}</div>
            <button onClick={load} style={s.btnBlack}>Reintentar</button>
          </div>
        ) : filtered.length === 0 ? (
          <div style={s.empty}>
            <div style={s.emptyTitle}>Sin pedidos</div>
            <div style={s.emptyText}>Cuando un comprador envíe una orden, aparecerá aquí.</div>
          </div>
        ) : (
          <div style={s.list}>
            {filtered.map((o) => {
              const st = (o.status || "PENDING") as OrderStatus;
              const busy = busyId === o.id;

              return (
                <div key={o.id} style={s.card}>
                  <div style={s.rowTop}>
                    <div style={{ minWidth: 0 }}>
                      <div style={s.cardTitle}>{o.productTitle || "Producto"}</div>
                      <div style={s.meta}>
                        <span style={statusPill(st)}>{st}</span>
                        <span>· Qty: <b>{o.quantity ?? 1}</b></span>
                        <span>· Total: <b>{moneyMXN(o.totalPrice)}</b></span>
                        <span style={{ opacity: 0.7 }}>· {fmtDate(o.createdAt)}</span>
                      </div>
                    </div>

                    <div style={s.idLine}>
                      ID: <span style={s.idMono}>{o.id}</span>
                    </div>
                  </div>

                  <div style={s.divider} />

                  <div style={s.grid}>
                    <div>
                      <div style={s.k}>Comprador</div>
                      <div style={s.v}>{o.buyerName || "Comprador"}</div>

                      <div style={{ marginTop: 10 }}>
                        <div style={s.k}>Nota</div>
                        <div style={s.vMuted}>{o.note?.trim() ? o.note : "—"}</div>
                      </div>
                    </div>

                    <div>
                      <div style={s.k}>Contacto</div>
                      {o.buyerPhone ? (
                        <>
                          <div style={s.v}>{o.buyerPhone}</div>
                          <button onClick={() => openBuyerWhatsApp(o)} style={s.btnGreenSm}>
                            WhatsApp
                          </button>
                        </>
                      ) : (
                        <div style={s.vMuted}>Se muestra al aceptar.</div>
                      )}
                    </div>

                    <div style={s.actions}>
                      {st === "PENDING" && (
                        <>
                          <button disabled={busy} onClick={() => reject(o.id)} style={s.btnGhost}>
                            {busy ? "…" : "Rechazar"}
                          </button>
                          <button disabled={busy} onClick={() => accept(o.id)} style={s.btnBlack}>
                            {busy ? "Aceptando…" : "Aceptar"}
                          </button>
                        </>
                      )}

                      {st === "ACCEPTED" && (
                        <>
                          <button disabled={busy} onClick={() => openBuyerWhatsApp(o)} style={s.btnGreen}>
                            WhatsApp
                          </button>
                          <button disabled={busy} onClick={() => delivered(o.id)} style={s.btnBlack}>
                            {busy ? "…" : "Marcar entregado"}
                          </button>
                        </>
                      )}

                      {st === "REJECTED" || st === "DELIVERED" || st === "CANCELLED" ? (
                        <div style={s.done}>Finalizado</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={s.footer}>
          Nota: si te sale “Missing token”, revisa que exista <b>lokaly_admin_token</b> en localStorage.
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#F6F6F4", color: "#111827" },
  container: { maxWidth: 980, margin: "0 auto", padding: "16px 14px 28px" },

  header: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 },
  hTitle: { fontWeight: 1000, fontSize: 20, lineHeight: 1.1 },
  hSub: { fontSize: 12, color: "#6B7280", marginTop: 3 },

  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    border: "1px solid #E5E7EB",
    background: "#fff",
    cursor: "pointer",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  toolbar: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 },
  tabs: { display: "flex", gap: 8, background: "#fff", border: "1px solid #E5E7EB", borderRadius: 999, padding: 6 },
  tab: {
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 12,
  },
  tabActive: { background: "#111827", color: "#fff" },

  search: {
    flex: "1 1 260px",
    padding: "12px 12px",
    borderRadius: 14,
    border: "1px solid #E5E7EB",
    background: "#fff",
    outline: "none",
    fontSize: 14,
  },

  list: { display: "grid", gap: 12 },

  card: {
    background: "#fff",
    borderRadius: 18,
    border: "1px solid #E5E7EB",
    boxShadow: "0 14px 30px rgba(17,24,39,0.08)",
    padding: 14,
  },

  rowTop: { display: "flex", gap: 10, alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap" },
  cardTitle: { fontWeight: 1000, fontSize: 16, lineHeight: 1.2 },
  meta: { marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12, color: "#374151" },

  pill: { padding: "5px 10px", borderRadius: 999, border: "1px solid #E5E7EB", fontWeight: 950, fontSize: 12 },

  idLine: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  idMono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12 },

  divider: { height: 1, background: "#E5E7EB", margin: "12px 0" },

  grid: { display: "grid", gridTemplateColumns: "1.2fr 0.9fr 1fr", gap: 12, alignItems: "start" },

  k: { fontSize: 12, fontWeight: 950, color: "#111827" },
  v: { marginTop: 4, fontSize: 14, fontWeight: 900, color: "#111827" },
  vMuted: { marginTop: 4, fontSize: 13, color: "#6B7280", lineHeight: 1.45 },

  actions: { display: "flex", gap: 10, alignItems: "flex-end", justifyContent: "flex-end", flexWrap: "wrap" },

  btnBlack: { padding: "12px 14px", borderRadius: 999, border: "none", background: "#111827", color: "#fff", cursor: "pointer", fontWeight: 950, fontSize: 12 },
  btnGhost: { padding: "12px 14px", borderRadius: 999, border: "1px solid #E5E7EB", background: "#fff", color: "#111827", cursor: "pointer", fontWeight: 950, fontSize: 12 },

  btnGreen: { padding: "12px 14px", borderRadius: 999, border: "none", background: "#22C55E", color: "#fff", cursor: "pointer", fontWeight: 950, fontSize: 12 },
  btnGreenSm: { marginTop: 8, padding: "10px 12px", borderRadius: 999, border: "none", background: "#22C55E", color: "#fff", cursor: "pointer", fontWeight: 950, fontSize: 12 },

  done: { fontSize: 12, fontWeight: 950, color: "#6B7280", padding: "10px 12px" },

  empty: { background: "#fff", borderRadius: 18, border: "1px solid #E5E7EB", padding: 14, boxShadow: "0 14px 30px rgba(17,24,39,0.08)" },
  emptyTitle: { fontWeight: 1000, fontSize: 16 },
  emptyText: { marginTop: 6, color: "#6B7280", fontSize: 13 },

  errCard: { background: "#fff", borderRadius: 18, border: "1px solid #FCA5A5", padding: 14 },
  errTitle: { fontWeight: 1000, color: "#991B1B" },
  errText: { marginTop: 6, color: "#6B7280" },

  footer: { marginTop: 14, fontSize: 12, color: "#9CA3AF", textAlign: "center" },

  skel: { height: 26, background: "#ECECEC", borderRadius: 12 },
};