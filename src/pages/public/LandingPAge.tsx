import { Link } from "react-router-dom";

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1518655048521-f130df041f66?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1584466977773-e625c37cdd50?auto=format&fit=crop&w=600&q=80",
];

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80"; // mercado / productos

export function LandingPage() {
  return (
    <div
      style={{
        background: "#F5F1EA",
        minHeight: "100vh",
        padding: "32px 16px 40px",
        display: "flex",
        justifyContent: "center",
        color: "#111827",
      }}
    >
      <div style={{ width: "100%", maxWidth: 960 }}>
        {/* Top bar */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: "#111827",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  color: "#FACC15",
                  fontSize: 22,
                }}
              >
                ⌂
              </span>
            </div>
            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 18,
                  lineHeight: 1.1,
                }}
              >
                Lokaly
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "#6B7280",
                }}
              >
                Compra y vende en tu comunidad
              </div>
            </div>
          </div>

          <Link
            to="/login"
            style={{
              fontSize: 13,
              color: "#4B5563",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Iniciar sesión
          </Link>
        </header>

        {/* Hero */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.3fr) minmax(0, 1fr)",
            gap: 32,
            alignItems: "center",
          }}
        >
          {/* Texto principal */}
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                textTransform: "uppercase",
                letterSpacing: 2,
                color: "#6B7280",
              }}
            >
              TU MERCADO ENTRE VECINOS
            </p>
            <h1
              style={{
                margin: "8px 0 8px 0",
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              Explora y comparte productos
              <br />
              en tu comunidad.
            </h1>
            <p
              style={{
                margin: "0 0 18px 0",
                fontSize: 15,
                color: "#4B5563",
              }}
            >
              Lokaly conecta a vecinos, servicios y pequeños negocios para que
              puedan comprar y vender de forma segura dentro de su colonia o
              residencial.
            </p>

<div
  style={{
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  }}
>
  {/* Botón App Store */}
  <a
    href="https://apps.apple.com/app/idXXXXXXXXX" // TODO: reemplaza con tu ID real
    target="_blank"
    rel="noopener noreferrer"
    style={{
      padding: "10px 18px",
      borderRadius: 12,
      backgroundColor: "#111827",
      color: "#fff",
      fontSize: 14,
      fontWeight: 600,
      textDecoration: "none",
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    🍎 Descargar en App Store
  </a>

  {/* Botón Google Play */}
  <a
    href="https://play.google.com/store/apps/details?id=com.tuempresa.lokaly" // TODO
    target="_blank"
    rel="noopener noreferrer"
    style={{
      padding: "10px 18px",
      borderRadius: 12,
      backgroundColor: "#111827",
      color: "#fff",
      fontSize: 14,
      fontWeight: 600,
      textDecoration: "none",
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    🤖 Descargar en Google Play
  </a>
</div>

<p
  style={{
    fontSize: 12,
    color: "#6B7280",
  }}
>
  ¿Ya tienes la app? Pide a tus vecinos que compartan su catálogo público de Lokaly.
</p>

            <p
              style={{
                fontSize: 12,
                color: "#6B7280",
              }}
            >
              ¿Ya tienes la app? Pide a tus vecinos que compartan su catálogo
              público de Lokaly.
            </p>
          </div>

          {/* Mockup: mini feed tipo home de la app, ahora con imágenes */}
          <div
            style={{
              borderRadius: 32,
              backgroundColor: "#FFF7ED",
              padding: 16,
              boxShadow:
                "0 18px 30px rgba(148, 86, 30,0.15), 0 2px 4px rgba(0,0,0,0.03)",
            }}
          >
            {/* Barra superior simulada */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 9,
                  backgroundColor: "#111827",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    color: "#FACC15",
                    fontSize: 16,
                  }}
                >
                  ⌂
                </span>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#111827",
                    marginBottom: 2,
                  }}
                >
                  Lombardia Residencial
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#6B7280",
                  }}
                >
                  En tu comunidad
                </div>
              </div>
            </div>

            {/* Tarjeta destacada */}
            <div
              style={{
                borderRadius: 22,
                backgroundColor: "#FFFFFF",
                padding: 10,
                marginBottom: 10,
                boxShadow:
                  "0 10px 18px rgba(15,23,42,0.10), 0 1px 2px rgba(0,0,0,0.03)",
              }}
            >
              <div
                style={{
                  height: 90,
                  borderRadius: 18,
                  marginBottom: 8,
                  backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.65), rgba(15,23,42,0.2)), url("${HERO_IMAGE}")`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#111827",
                    marginBottom: 2,
                  }}
                >
                  Explora tu comunidad
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#6B7280",
                  }}
                >
                  Descubre productos publicados por tus vecinos en Lokaly.
                </div>
              </div>
            </div>

            {/* Grid de “productos ejemplo” con imágenes de referencia */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {[
                { name: "Laptop", price: "$2,000 MXN" },
                { name: "Comedor", price: "$10,000 MXN" },
                { name: "Sudadera", price: "$200 MXN" },
                { name: "Acccesorio Gym", price: "$4,500 MXN" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    borderRadius: 18,
                    backgroundColor: "#FFFFFF",
                    padding: 6,
                    boxShadow:
                      "0 8px 14px rgba(15,23,42,0.06), 0 1px 2px rgba(0,0,0,0.02)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      height: 60,
                      borderRadius: 14,
                      backgroundColor: "#E5E7EB",
                      backgroundImage: `url("${MOCK_IMAGES[idx]}")`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#111827",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.name}
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: "#4B5563",
                    }}
                  >
                    {item.price}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sección “cómo funciona” */}
        <section
          id="como-funciona"
          style={{
            marginTop: 40,
            paddingTop: 16,
            borderTop: "1px solid #E5E7EB",
          }}
        >
          <h2
            style={{
              margin: "0 0 12px 0",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            ¿Cómo funciona Lokaly?
          </h2>
          <ol
            style={{
              margin: 0,
              paddingLeft: 18,
              fontSize: 14,
              color: "#4B5563",
            }}
          >
            <li>Registra tu colonia o residencial.</li>
            <li>Invita a tus vecinos a unirse.</li>
            <li>Publica productos o servicios.</li>
            <li>Coordina la entrega directamente por chat.</li>
          </ol>
        </section>

        <footer
          style={{
            marginTop: 32,
            fontSize: 11,
            color: "#9CA3AF",
            textAlign: "center",
          }}
        >
          Lokaly · Compra y vende entre vecinos
        </footer>
      </div>
    </div>
  );
}