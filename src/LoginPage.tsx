import React, { useState } from "react";
import lokalyLogo from "./assets/lokaly-logo.svg";

export type LoginSuccessPayload = {
    accessToken: string;
    name: string;
    role: string;
    seller: boolean;
};

type LoginPageProps = {
    onLoginSuccess: (data: LoginSuccessPayload) => void;
};

const API_URL = "https://lokaly.site/api/admin/auth/login";

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                throw new Error("Credenciales inválidas");
            }

            const data = (await res.json()) as LoginSuccessPayload;

            localStorage.setItem("lokaly_admin_token", data.accessToken);
            localStorage.setItem("lokaly_admin_name", data.name);
            localStorage.setItem("lokaly_admin_role", data.role);
            localStorage.setItem("lokaly_is_seller", String(data.seller));

            onLoginSuccess(data);
        } catch (err: any) {
            setError(err.message || "Error al iniciar sesión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <main
                style={{
                    background: "linear-gradient(145deg, #121212, #050505)",
                    borderRadius: 18,
                    padding: "32px 32px 28px",
                    width: "100%",
                    maxWidth: 420,
                    boxShadow: "0 28px 80px rgba(0, 0, 0, 0.8)",
                    border: "1px solid rgba(216, 178, 90, 0.25)",
                }}
            >
                <header
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 28,
                    }}
                >
                    <img
                        src={lokalyLogo}
                        alt="Lokaly"
                        style={{ height: 60, objectFit: "contain" }}
                    />

<div
  style={{
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(216, 178, 90, 0.45)",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    color: "#f2d58b",
  }}
>
  Panel Web
</div>
                </header>

                <section>
                    <h1 style={{ margin: "0 0 4px", fontSize: 26, fontWeight: 600 }}>
                        Login
                    </h1>
                    <p
                        style={{
                            marginBottom: 22,
                            fontSize: 14,
                            color: "#9b9b9b",
                        }}
                    >
                        Accede al panel de administracion.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 16 }}>
                            <label
                                htmlFor="email"
                                style={{
                                    display: "block",
                                    marginBottom: 6,
                                    fontSize: 13,
                                    color: "#e9e9e9",
                                }}
                            >
                                Correo
                            </label>
                            <input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder=""
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ marginBottom: 8 }}>
                            <label
                                htmlFor="password"
                                style={{
                                    display: "block",
                                    marginBottom: 6,
                                    fontSize: 13,
                                    color: "#e9e9e9",
                                }}
                            >
                                Contraseña
                            </label>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={inputStyle}
                            />
                        </div>

                        {error && (
                            <p
                                style={{
                                    color: "#ff6b6b",
                                    fontSize: 12,
                                    marginTop: 4,
                                    marginBottom: 0,
                                }}
                            >
                                {error}
                            </p>
                        )}

                        <div style={{ marginTop: 16 }}>
                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: "100%",
                                    padding: "11px 16px",
                                    borderRadius: 999,
                                    border: "none",
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: loading ? "default" : "pointer",
                                    background:
                                        "linear-gradient(135deg, #f2d58b, #d8b25a)",
                                    color: "#211a08",
                                    boxShadow: "0 12px 30px rgba(0, 0, 0, 0.7)",
                                    opacity: loading ? 0.8 : 1,
                                }}
                            >
                                {loading ? "Entrando..." : "Entrar"}
                            </button>
                        </div>
                    </form>

                    <p
                        style={{
                            textAlign: "center",
                            marginTop: 10,
                            fontSize: 11,
                            color: "#9b9b9b",
                        }}
                    >
                        Acceso restringido. Si necesitas permisos, contacta a{" "}
                        <span style={{ color: "#f2d58b" }}>soporte Lokaly</span>.
                    </p>
                </section>
            </main>
        </div>
    );
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255, 255, 255, 0.06)",
    background: "rgba(8, 8, 8, 0.9)",
    color: "#f5f5f5",
    fontSize: 14,
    outline: "none",
};