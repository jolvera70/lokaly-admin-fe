import { useEffect, useState } from "react";
import { acceptSellerConsent } from "../api";

type Props = {
  open: boolean;
  onClose: () => void;
  onAccepted: () => void;
  tosVersion: string; // ej: "2026-01-20"
};

export function SellerConsentModal({ open, onClose, onAccepted, tosVersion }: Props) {
  const [tosChecked, setTosChecked] = useState(false);
  const [tosBusy, setTosBusy] = useState(false);
  const [tosErr, setTosErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTosChecked(false);
    setTosBusy(false);
    setTosErr(null);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={() => (tosBusy ? null : onClose())}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 100%)",
          borderRadius: 18,
          background: "#fff",
          border: "1px solid rgba(15,23,42,0.12)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 16, borderBottom: "1px solid rgba(15,23,42,0.08)" }}>
          <div style={{ fontWeight: 950, fontSize: 16, color: "rgba(15,23,42,0.92)" }}>
            Acepta Términos y Condiciones
          </div>
          <div style={{ marginTop: 6, fontSize: 12.5, fontWeight: 800, color: "rgba(15,23,42,0.62)", lineHeight: 1.45 }}>
            Para publicar productos necesitas aceptar los Términos y el Aviso de Privacidad.
          </div>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={tosChecked}
              onChange={(e) => setTosChecked(e.target.checked)}
              disabled={tosBusy}
              style={{ marginTop: 3 }}
            />
            <span style={{ fontSize: 13, fontWeight: 850, color: "rgba(15,23,42,0.78)", lineHeight: 1.45 }}>
              Acepto los{" "}
              <a href="/terms.html" target="_blank" rel="noreferrer" style={{ fontWeight: 950 }}>
                Términos y Condiciones
              </a>{" "}
              y el{" "}
              <a href="/privacy.html" target="_blank" rel="noreferrer" style={{ fontWeight: 950 }}>
                Aviso de Privacidad
              </a>
              .
            </span>
          </label>

          {tosErr ? (
            <div
              style={{
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
              ⚠️ {tosErr}
            </div>
          ) : null}
        </div>

        <div
          style={{
            padding: 16,
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
            borderTop: "1px solid rgba(15,23,42,0.08)",
            background: "rgba(15,23,42,0.02)",
          }}
        >
          <button type="button" className="lp__btn lp__btn--ghost" disabled={tosBusy} onClick={onClose}>
            Cancelar
          </button>

          <button
            type="button"
            className="lp__btn lp__btn--primary"
            disabled={!tosChecked || tosBusy}
            onClick={async () => {
              setTosErr(null);
              setTosBusy(true);
              try {
                await acceptSellerConsent(tosVersion);
                onAccepted();
              } catch (e: any) {
                setTosErr(e?.message || "No se pudo guardar tu aceptación.");
              } finally {
                setTosBusy(false);
              }
            }}
            style={{
              opacity: !tosChecked || tosBusy ? 0.7 : 1,
              cursor: !tosChecked || tosBusy ? "not-allowed" : "pointer",
            }}
          >
            {tosBusy ? "Guardando..." : "Aceptar y continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}