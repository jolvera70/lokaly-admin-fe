import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getCheckoutOrder } from "../../api"; // tu client

export function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const orderId = params.get("orderId");

  const [status, setStatus] = useState<"loading" | "paid" | "pending" | "error">("loading");
  const [credits, setCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!orderId) {
      setStatus("error");
      return;
    }

    let attempts = 0;
    const maxAttempts = 10;

    const poll = async () => {
      try {
        const res = await getCheckoutOrder(orderId);

        if (res.status === "PAID") {
          setStatus("paid");
          setCredits(res.credits);
          return;
        }

        if (res.status === "FAILED" || res.status === "CANCELLED") {
          setStatus("error");
          return;
        }

        // sigue pendiente
        attempts++;

        if (attempts < maxAttempts) {
          setTimeout(poll, 2000);
        } else {
          setStatus("pending");
        }

      } catch (e) {
        console.error(e);
        setStatus("error");
      }
    };

    poll();

  }, [orderId]);

  // ---------- UI ----------

  if (status === "loading") {
    return <p>Procesando tu pago...</p>;
  }

  if (status === "pending") {
    return (
      <div>
        <h2>Pago en proceso ⏳</h2>
        <p>Tu pago fue recibido. En unos minutos se reflejará.</p>
        <button onClick={() => navigate("/publicar")}>
          Volver
        </button>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div>
        <h2>¡Pago exitoso! 🎉</h2>

        <p>
          Se agregaron <b>{credits}</b> créditos a tu cuenta.
        </p>

        <button onClick={() => navigate("/publicar")}>
          Publicar ahora
        </button>
      </div>
    );
  }

  return (
    <div>
      <h2>Error en el pago ❌</h2>
      <p>No pudimos confirmar tu pago.</p>

      <button onClick={() => navigate("/publicar")}>
        Volver
      </button>
    </div>
  );
}