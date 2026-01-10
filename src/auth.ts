export type AppRole = string;

export type AuthClaims = {
  role?: string | null;
  seller?: boolean | null;
};

/**
 * Normaliza el role a MAYÚSCULAS
 */
export function normalizeRole(role?: string | null) {
  return (role || "").trim().toUpperCase();
}

/**
 * Roles que pueden acceder al panel ADMIN
 */
export function isAdminRole(role?: string | null) {
  const r = normalizeRole(role);
  return r === "SUPERADMIN" || r === "ADMIN" || r === "ADMINISTRADOR";
}

/**
 * 🔑 ÚNICA fuente de verdad para saber si es vendedor
 * 👉 viene del JWT (claim seller)
 */
export function isSellerUser(seller?: boolean | null) {
  return seller === true;
}

/**
 * 🧑‍💼 Acceso a panel VENDEDOR
 * - seller=true
 * - admins también pueden entrar (soporte)
 */
export function canAccessSellerPanel(
  role?: string | null,
  seller?: boolean | null
) {
    console.log("isSeller "+seller)
  return isSellerUser(seller) || isAdminRole(role);
}

/**
 * 🛡️ Acceso a panel ADMIN
 * - SOLO admins
 */
export function canAccessAdminPanel(role?: string | null) {
  return isAdminRole(role);
}