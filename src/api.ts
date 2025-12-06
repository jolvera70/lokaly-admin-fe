// src/api.ts

export const BASE_URL = "http://lokaly.site:8080/api/admin";
export const PUBLIC_BASE_URL = "http://lokaly.site:8080/api/public";
export const PUBLIC_ORIGIN = "http://lokaly.site:8080";

export type PlanKey = "ONE_PRODUCT" | "THREE_PRODUCTS" | "TEN_PRODUCTS" | "UNLIMITED";

export type LoginResponse = {
  token: string;
  role: string;
};

export type NeighborSignupRequest = {
  fullName: string;
  email: string;
  password: string;
  colonyId: string;
  clusterId: string;
  zipCode: string;
};

/* =========================
 * Helpers de headers
 * ========================= */

// Token del ADMIN (panel web)
function getAdminAuthHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };  
  const token = localStorage.getItem("lokaly_admin_token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

    return headers;
}

// Token del VECINO (solo para pruebas desde web, en móvil usas SecureStore)
function getNeighborAuthHeaders() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };  
  const token = localStorage.getItem("neighbor_token");
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };

    return headers;
}

/* =========================
 * Tipos de planes vendedor
 * ========================= */

export type SellerPlanConfig = {
  enabled: boolean;
  price: number;
};

export type SellerPlans = {
  oneProduct: SellerPlanConfig;
  threeProducts: SellerPlanConfig;
  tenProducts: SellerPlanConfig;
  unlimited: SellerPlanConfig;
};

/* =========================
 * ADMIN: Clusters
 * ========================= */

export async function fetchClusters() {
  const res = await fetch(`${BASE_URL}/clusters`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al cargar clusters");
  return await res.json();
}

export async function createCluster(payload: { name: string; city: string }) {
  const res = await fetch(`${BASE_URL}/clusters`, {
    method: "POST",
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("Error al crear cluster");
  return await res.json();
}

export async function fetchClusterById(id: string) {
  const res = await fetch(`${BASE_URL}/clusters/${id}`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al cargar detalle del cluster");
  return res.json();
}

export async function updateCluster(
  id: string,
  body: { name: string; city: string; state?: string }
) {
  const res = await fetch(`${BASE_URL}/clusters/${id}`, {
    method: "PUT",
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error("Error al actualizar el cluster");
  return await res.json();
}

export async function deleteCluster(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/clusters/${id}`, {
    method: "DELETE",
    headers: getAdminAuthHeaders(),
  });

  if (!res.ok) throw new Error("Error al desactivar cluster");
}

/* =========================
 * ADMIN: Planes de vendedor
 * ========================= */

export async function updateSellerPlans(
  clusterId: string,
  payload: SellerPlans
) {
  const res = await fetch(`${BASE_URL}/clusters/${clusterId}/seller-plans`, {
    method: "PUT",
    headers: getAdminAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Error al guardar planes de vendedor");
  }
  return await res.json().catch(() => undefined);
}

/* =========================
 * PUBLIC: Signup vecino
 * (desde admin o desde web para pruebas)
 * ========================= */

export async function signupNeighbor(
  payload: NeighborSignupRequest
): Promise<LoginResponse> {
  const res = await fetch(`${PUBLIC_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Error al registrar vecino");
  }

  return res.json();
}

/* =========================
 * ADMIN: Usuarios
 * ========================= */

export type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  colonyName?: string;
  createdAt?: string;
};

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const res = await fetch(`${BASE_URL}/users`, {
    headers: getAdminAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Error al cargar usuarios");
  }

  return await res.json();
}

export type UserSummary = {
  id: string;
  fullName: string;
  email: string;
  role: "SUPERADMIN" | "VECINO";
  seller: boolean;
  sellerPlanKey?: string | null;
  colonyId?: string | null;
  colonyName?: string | null;
  createdAt?: string;
};

export async function fetchUsers(): Promise<UserSummary[]> {
  const res = await fetch(`${BASE_URL}/users`, {
    headers: getAdminAuthHeaders(),
  });
  if (!res.ok) throw new Error("Error al cargar usuarios");
  return await res.json();
}

/**
 * Actualizar estado de vendedor (activar/desactivar y plan).
 */
export async function setUserSeller(
  userId: string,
  seller: boolean,
  planKey?: PlanKey
) {
  const res = await fetch(`${BASE_URL}/users/${userId}/seller`, {
    method: "POST",
    headers: getAdminAuthHeaders(),
    body: JSON.stringify({ seller, planKey }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Error al actualizar estado de vendedor");
  }
  return await res.json();
}

/* =========================
 * PUBLIC (VECINO): Checkout de planes
 * (Versión web: usa neighbor_token en localStorage)
 * En la app móvil usas SecureStore con otra api.ts
 * ========================= */

export async function createSellerCheckout(planKey: PlanKey) {
  const res = await fetch(`${PUBLIC_BASE_URL}/seller/checkout`, {
    method: "POST",
    headers: getNeighborAuthHeaders(),
    body: JSON.stringify({ planKey }),
  });

  if (!res.ok) throw new Error("Error al iniciar compra");
  return res.json(); // devuelve la orden
}

export async function fakeCompleteCheckout(orderId: string) {
  const res = await fetch(
    `${PUBLIC_BASE_URL}/seller/checkout/${orderId}/fake-complete`,
    {
      method: "POST",
      headers: getNeighborAuthHeaders(),
    }
  );

  if (!res.ok) throw new Error("Error al completar compra");
  return res.json();
}