import { Link } from "react-router-dom";

const MOCK_IMAGES = [
  "https://images.unsplash.com/photo-1518655048521-f130df041f66?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
  "https://images.unsplash.com/photo-1584466977773-e625c37cdd50?auto=format&fit=crop&w=600&q=80",
];

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80";

// 🔗 URLs reales de las tiendas (pon las correctas cuando las tengas)
const IOS_APP_URL = "https://apps.apple.com/app/idXXXXXXXXX"; // TODO: reemplazar
const ANDROID_APP_URL =
  "https://play.google.com/store/apps/details?id=com.tuempresa.lokaly"; // TODO: reemplazar

export function LandingPage() {
  const handleSmartDownload = () => {
    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const storeUrl = isIOS ? IOS_APP_URL : ANDROID_APP_URL;
    window.open(storeUrl, "_blank");
  };

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
                Catálogos para vender entre vecinos
              </div>
            </div>
          </div>

          <nav
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 12,
            }}
          >
            <a
              href="#beneficios"
              style={{
                color: "#4B5563",
                textDecoration: "none",
              }}
            >
              Beneficios
            </a>
            <a
              href="#como-funciona"
              style={{
                color: "#4B5563",
                textDecoration: "none",
              }}
            >
              Cómo funciona
            </a>
          </nav>
        </header>

        {/* Hero */}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.25fr) minmax(0, 1fr)",
            gap: 32,
            alignItems: "center",
          }}
        >
          {/* Texto principal */}
          <div>
            {/* Badge contextual (vienen de un catálogo público) */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 10px",
                borderRadius: 999,
                backgroundColor: "#FEF3C7",
                color: "#92400E",
                fontSize: 11,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  backgroundColor: "#FACC15",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  color: "#111827",
                }}
              >
                ★
              </span>
              <span>Viste un catálogo creado con Lokaly</span>
            </div>

            <h1
              style={{
                margin: "6px 0 10px 0",
                fontSize: 34,
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              Crea tu catálogo
              <br />
              y vende en tu colonia.
            </h1>

            <p
              style={{
                margin: "0 0 14px 0",
                fontSize: 15,
                color: "#4B5563",
              }}
            >
              Lokaly te ayuda a mostrar tus productos con un catálogo elegante,
              compartir tu link por WhatsApp y recibir pedidos de tus vecinos
              sin complicarte con tiendas en línea complejas.
            </p>

            <ul
              style={{
                margin: "0 0 18px 0",
                paddingLeft: 18,
                fontSize: 13,
                color: "#4B5563",
              }}
            >
              <li>Publica tus productos desde la app en minutos.</li>
              <li>Comparte tu catálogo con un solo link.</li>
              <li>Vende solo en tu colonia o residencial.</li>
            </ul>

            {/* CTA principal → descarga de la app */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 12,
              }}
            >
              <button
                onClick={handleSmartDownload}
                style={{
                  padding: "11px 20px",
                  borderRadius: 999,
                  backgroundColor: "#111827",
                  color: "#FACC15",
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow:
                    "0 14px 28px rgba(15,23,42,0.35), 0 3px 6px rgba(0,0,0,0.25)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Descargar app Lokaly
                <span style={{ fontSize: 16 }}>⬇</span>
              </button>

              <a
                href="#como-funciona"
                style={{
                  padding: "11px 18px",
                  borderRadius: 999,
                  border: "1px solid #D1D5DB",
                  backgroundColor: "#FFFFFF",
                  color: "#111827",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Ver cómo funciona
              </a>
            </div>

            {/* Botones de tienda específicos */}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              {/* App Store */}
              <a
                href={IOS_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "8px 14px",
                  borderRadius: 12,
                  backgroundColor: "#111827",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                🍎 Descargar en App Store
              </a>

              {/* Google Play */}
              <a
                href={ANDROID_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "8px 14px",
                  borderRadius: 12,
                  backgroundColor: "#111827",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 500,
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
                fontSize: 11,
                color: "#6B7280",
              }}
            >
              ¿Ya tienes la app? Abre Lokaly en tu teléfono y administra tus
              productos desde ahí.
            </p>
          </div>

          {/* Mockup tipo app: catálogo en el vecindario */}
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
                  Catálogo público · Lokaly
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#6B7280",
                  }}
                >
                  Ejemplo de cómo se ve tu tienda para los vecinos
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
                  Tu catálogo para compartir
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: "#6B7280",
                  }}
                >
                  Copia el link y compártelo por WhatsApp, grupos o redes.
                </div>
              </div>
            </div>

            {/* Grid de productos ejemplo */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {[
                { name: "Pasteles personalizados", price: "$250 MXN" },
                { name: "Clases de regularización", price: "$120 MXN" },
                { name: "Servicios de plomería", price: "$400 MXN" },
                { name: "Accesorios y ropa", price: "Desde $150 MXN" },
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

        {/* Beneficios principales */}
        <section
          id="beneficios"
          style={{
            marginTop: 40,
          }}
        >
          <h2
            style={{
              margin: "0 0 12px 0",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            Pensado para quienes venden en su colonia
          </h2>
          <p
            style={{
              margin: "0 0 18px 0",
              fontSize: 14,
              color: "#4B5563",
            }}
          >
            Lokaly es ideal para negocios pequeños, emprendedores y vecinos que
            venden desde casa y quieren verse profesionales sin complicarse.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <div
              style={{
                borderRadius: 18,
                backgroundColor: "#FFFFFF",
                padding: 14,
                boxShadow: "0 10px 18px rgba(15,23,42,0.05)",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>📲</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Un solo link para todo
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#4B5563",
                }}
              >
                Comparte tu catálogo en WhatsApp, grupos de vecinos y redes sin
                mandar fotos una por una.
              </p>
            </div>

            <div
              style={{
                borderRadius: 18,
                backgroundColor: "#FFFFFF",
                padding: 14,
                boxShadow: "0 10px 18px rgba(15,23,42,0.05)",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>🏘️</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Vende cerca de ti
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#4B5563",
                }}
              >
                Diseñado para residenciales, privadas y colonias: vende donde ya
                tienes confianza.
              </p>
            </div>

            <div
              style={{
                borderRadius: 18,
                backgroundColor: "#FFFFFF",
                padding: 14,
                boxShadow: "0 10px 18px rgba(15,23,42,0.05)",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 6 }}>⚡</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                Fácil y rápido
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#4B5563",
                }}
              >
                No necesitas saber de tiendas en línea. Solo sube fotos, precio
                y descripción desde la app.
              </p>
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
            Crea tu catálogo en 4 pasos
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
              gap: 14,
              fontSize: 13,
              color: "#4B5563",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#9CA3AF",
                  marginBottom: 2,
                }}
              >
                PASO 1
              </div>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 3,
                }}
              >
                Descarga Lokaly
              </div>
              <p style={{ margin: 0 }}>
                Instala la app desde App Store o Google Play.
              </p>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#9CA3AF",
                  marginBottom: 2,
                }}
              >
                PASO 2
              </div>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 3,
                }}
              >
                Crea tu cuenta
              </div>
              <p style={{ margin: 0 }}>
                Regístrate y elige la colonia o residencial donde vendes.
              </p>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#9CA3AF",
                  marginBottom: 2,
                }}
              >
                PASO 3
              </div>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 3,
                }}
              >
                Publica tus productos
              </div>
              <p style={{ margin: 0 }}>
                Sube fotos, precios y descripciones desde la app.
              </p>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#9CA3AF",
                  marginBottom: 2,
                }}
              >
                PASO 4
              </div>
              <div
                style={{
                  fontWeight: 600,
                  marginBottom: 3,
                }}
              >
                Comparte tu catálogo
              </div>
              <p style={{ margin: 0 }}>
                Envía tu link por WhatsApp y grupos de vecinos y empieza a
                vender.
              </p>
            </div>
          </div>

          {/* CTA final → descarga */}
          <div
            style={{
              marginTop: 20,
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontSize: 12,
                color: "#6B7280",
                marginBottom: 10,
              }}
            >
              Descarga Lokaly y crea tu catálogo hoy mismo:
            </p>

            <div
              style={{
                display: "inline-flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <a
                href={IOS_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  backgroundColor: "#111827",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                🍎 App Store
              </a>
              <a
                href={ANDROID_APP_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  backgroundColor: "#111827",
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 500,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                🤖 Google Play
              </a>
            </div>
          </div>
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