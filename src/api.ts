// src/api.ts

export const BASE_URL = "https://lokaly.site/api/admin";
export const PUBLIC_BASE_URL = "https://lokaly.site/api/public";
export const PUBLIC_ORIGIN = "https://lokaly.site";

export type PlanKey =
  | "ONE_PRODUCT"
  | "THREE_PRODUCTS"
  | "TEN_PRODUCTS"
  | "FORTY_PRODUCTS";

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

function getAdminAuthHeaders() {
  const token = localStorage.getItem("lokaly_admin_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function getNeighborAuthHeaders() {
  const token = localStorage.getItem("neighbor_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * Helper para fetch público que requiere cookies cross-site (lokaly_pub).
 * IMPORTANTE: credentials: "include" para que el navegador guarde y envíe la cookie.
 */
async function publicFetch(input: string, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    credentials: "include",
  });
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
  fortyProducts: SellerPlanConfig;
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

export async function updateSellerPlans(clusterId: string, payload: SellerPlans) {
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
 * ========================= */

export async function signupNeighbor(payload: NeighborSignupRequest): Promise<LoginResponse> {
  const res = await fetch(`${PUBLIC_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Error al registrar vecino");
  }

  return res.json();
}

/* =========================
 * ADMIN: Usuarios / Stats
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
  const res = await fetch(`${BASE_URL}/users`, { headers: getAdminAuthHeaders() });
  if (!res.ok) throw new Error("Error al cargar usuarios");
  return await res.json();
}

export type AdminStats = {
  totalUsers: number;
  totalSellers: number;
  totalProducts: number;
  totalSales: number;
  totalProductViews: number;
  totalCatalogViews: number;
  activeSellersLast7Days: number;
  newUsersLast7Days: number;
};

export type UserSummary = {
  id: string;
  fullName?: string;
  email: string;
  colonyName?: string;
  colonyId?: string;
  role: string;
  seller: boolean;
  sellerPlanKey?:
    | "ONE_PRODUCT"
    | "TRHEE_PRODUCTS"
    | "TEN_PRODUCTS"
    | "FORTY_PRODUCTS"
    | null;

  productCount?: number;
  productViews?: number;
  catalogViews?: number;
  salesCount?: number;
};

export async function fetchAdminStats(): Promise<AdminStats> {
  // ⚠️ aquí sigues usando relativo; si no tienes proxy, cámbialo a `${BASE_URL}/stats`
  const res = await fetch("/api/admin/stats");
  if (!res.ok) throw new Error("No se pudieron cargar las estadísticas");
  return res.json();
}

export async function fetchUsers(): Promise<UserSummary[]> {
  const res = await fetch(`${BASE_URL}/users`, { headers: getAdminAuthHeaders() });
  if (!res.ok) throw new Error("Error al cargar usuarios");
  return await res.json();
}

export async function setUserSeller(userId: string, seller: boolean, planKey?: PlanKey) {
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
 * ========================= */

export async function createSellerCheckout(planKey: PlanKey) {
  const res = await fetch(`${PUBLIC_BASE_URL}/seller/checkout`, {
    method: "POST",
    headers: getNeighborAuthHeaders(),
    body: JSON.stringify({ planKey }),
  });

  if (!res.ok) throw new Error("Error al iniciar compra");
  return res.json();
}

export async function fakeCompleteCheckout(orderId: string) {
  const res = await fetch(`${PUBLIC_BASE_URL}/seller/checkout/${orderId}/fake-complete`, {
    method: "POST",
    headers: getNeighborAuthHeaders(),
  });

  if (!res.ok) throw new Error("Error al completar compra");
  return res.json();
}

export type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "DELIVERED"
  | "CANCELLED";

export type SellerOrderDto = {
  id: string;
  buyerId?: string;
  buyerName?: string;
  buyerEmail?: string | null;
  buyerPhone?: string | null;

  sellerId?: string;
  sellerName?: string;

  productId?: string;
  productTitle?: string;

  quantity?: number;
  note?: string | null;

  unitPrice?: string | number;
  totalPrice?: string | number;

  status?: OrderStatus;
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchSellerOrders(): Promise<SellerOrderDto[]> {
  const res = await fetch(`${PUBLIC_BASE_URL}/orders/seller`, {
    headers: {
      ...getAdminAuthHeaders(),
      "X-User-Role": "SELLER",
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Error al cargar pedidos del vendedor");
  }
  return res.json();
}

export async function acceptSellerOrder(orderId: string): Promise<void> {
  const res = await fetch(`${PUBLIC_BASE_URL}/orders/${orderId}/accept`, {
    method: "POST",
    headers: {
      ...getAdminAuthHeaders(),
      "X-User-Role": "SELLER",
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "No se pudo aceptar el pedido");
  }
}

export async function rejectSellerOrder(orderId: string): Promise<void> {
  const res = await fetch(`${PUBLIC_BASE_URL}/orders/${orderId}/reject`, {
    method: "POST",
    headers: {
      ...getAdminAuthHeaders(),
      "X-User-Role": "SELLER",
    },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "No se pudo rechazar el pedido");
  }
}

export async function markOrderDelivered(orderId: string): Promise<void> {
  const res = await fetch(`${PUBLIC_BASE_URL}/orders/${orderId}/status`, {
    method: "PATCH",
    headers: {
      ...getAdminAuthHeaders(),
      "X-User-Role": "SELLER",
    },
    body: JSON.stringify({ status: "DELIVERED" }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "No se pudo marcar como entregado");
  }
}

/* =========================
 * PUBLIC: Publish session (cookie lokaly_pub)
 * ========================= */

export type PublishSessionDto = {
  phoneE164: string;
  phoneLocal: string;
  expireAt: string; // ISO
};

/**
 * ✅ Este endpoint DEBE ir a lokaly.site, no a localhost,
 * y debe enviar cookie lokaly_pub (credentials include).
 */
export async function getPublishSession(): Promise<PublishSessionDto | null> {
  const res = await publicFetch(`${PUBLIC_BASE_URL}/v1/publish/session`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (res.status === 204 || res.status === 401) return null;
  if (!res.ok) return null;

  return res.json();
}

/* =========================
 * PUBLIC: OTP WhatsApp
 * ========================= */

export type SendOtpRequest = {
  phoneE164: string;
  channel: "WHATSAPP";
};

export type SendOtpResponse = {
  otpSessionId: string;
  phoneE164: string;
  cooldownSeconds: number;
};

export type VerifyOtpRequest = {
  otpSessionId: string;
  code: string;
};

export async function sendPublicOtp(phoneE164: string): Promise<SendOtpResponse> {
  const res = await publicFetch(`${PUBLIC_BASE_URL}/v1/otp/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneE164, channel: "WHATSAPP" } satisfies SendOtpRequest),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Error al enviar OTP");
  }

  return res.json();
}

export async function verifyPublicOtp(otpSessionId: string, code: string): Promise<void> {
  const res = await publicFetch(`${PUBLIC_BASE_URL}/v1/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otpSessionId, code } satisfies VerifyOtpRequest),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "OTP inválido o expirado");
  }

  // 204 -> no json
}