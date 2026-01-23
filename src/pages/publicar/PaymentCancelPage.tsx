import { Link, useSearchParams } from "react-router-dom";

export function PaymentCancelPage() {
  const [params] = useSearchParams();
  const orderId = params.get("orderId");

  return (
    <div style={{ padding: 24 }}>
      <h2>Pago cancelado</h2>

      <p>
        No se realizó ningún cargo.
      </p>

      {orderId ? (
        <p style={{ fontSize: 12, opacity: 0.6 }}>
          Referencia: {orderId}
        </p>
      ) : null}

      <Link to="/publicar">
        Intentar de nuevo
      </Link>
    </div>
  );
}