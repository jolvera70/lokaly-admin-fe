// src/api.ts

export const PUBLIC_ORIGIN = "";
export const PUBLIC_PREFIX = "/api/public";
export const publicUrl = (path: string) => `${PUBLIC_ORIGIN}${PUBLIC_PREFIX}${path}`;
export const BASE_URL = "/api/public"; 
export const PUBLIC_BASE_URL = "/api/public"; // ✅ siempre relativo (proxy en dev)

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

export type PublisherCatalogMeResponse = {
  id?: string;

  phoneE164?: string;
  phoneLocal?: string;
  catalogSlug?: string;

  creditsTotal?: number;
  creditsUsed?: number;
  creditsValidUntil?: string; // ISO date string

  paused?: boolean;
  deleted?: boolean;
};

/**
 * GET mi catálogo del publisher (sesión por cookie lokaly_pub)
 *
 * ✅ AJUSTA AQUÍ el endpoint si tu BE lo expone distinto:
 * - Ejemplos comunes:
 *   - GET /api/public/v1/catalog/me
 *   - GET /api/public/v1/publish/me
 *   - GET /api/public/v1/publisher/me
 */
export async function getMyPublisherCatalog(): Promise<PublisherCatalogMeResponse> {
  const res = await fetch(`${PUBLIC_BASE_URL}/v1/catalog/me`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err: any = new Error(txt || "No se pudo cargar tu catálogo.");
    err.status = res.status;
    throw err;
  }

  return res.json();
}

/** =========================
 *  Publish Product (consume credits)
 *  ========================= */

export type PublishProductResponse = {
  productId?: string;
  status?: "PUBLISHED" | "OK";
  catalogSlug?: string;
};

/**
 * Publica el producto y consume 1 crédito
 *
 * ✅ AJUSTA AQUÍ el endpoint si tu BE lo expone distinto:
 * - Ejemplos comunes:
 *   - POST /api/public/v1/catalog/products/{productId}/publish
 *   - POST /api/public/v1/publish/products/{productId}
 *   - POST /api/public/v1/catalog/publish/{productId}
 */
export async function publishProduct(productId: string): Promise<PublishProductResponse> {
  const res = await fetch(`${PUBLIC_BASE_URL}/v1/catalog/products/${productId}/publish`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}), // por si tu BE espera body, si no, no afecta
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err: any = new Error(txt || "No se pudo publicar el producto.");
    err.status = res.status;
    throw err;
  }

  // algunos endpoints devuelven vacío
  const text = await res.text();
  return text ? JSON.parse(text) : { productId, status: "OK" };
}
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
  const headers = new Headers(init.headers || undefined);

  // ✅ Si es FormData, NO debemos enviar Content-Type manual.
  // El browser lo calcula con boundary.
  if (init.body instanceof FormData) {
    headers.delete("Content-Type");
  }

  return fetch(input, {
    ...init,
    headers,
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
  const res = await publicFetch(publicUrl(`/v1/publish/session`), {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
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
  email: string;
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

export async function sendPublicOtp(phoneE164: string, email: string): Promise<SendOtpResponse> {
  const res = await publicFetch(publicUrl(`/v1/otp/send`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneE164, email } satisfies SendOtpRequest),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Error al enviar OTP");
  }
  return res.json();
}

export async function verifyPublicOtp(otpSessionId: string, code: string): Promise<void> {
  const res = await publicFetch(publicUrl(`/v1/otp/verify`), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otpSessionId, code } satisfies VerifyOtpRequest),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    // si quieres detectar status: throw Object.assign(new Error(text||...), { status: res.status })
    const err = new Error(text || "OTP inválido o expirado");
    (err as any).status = res.status;
    throw err;
  }

  // 204 -> no json
}

export type CreateProductDraftResponse = {
  productId: string;
};

export async function createPublishProductDraft(params: {
  title: string;
  price: string;
  description?: string;
  primaryIndex?: number;
  featured: boolean;
  quantity: number;
  images: File[];
}): Promise<CreateProductDraftResponse> {
  const fd = new FormData();
  fd.append("title", params.title);
  fd.append("price", params.price);
  fd.append("description", params.description ?? "");
  fd.append("primaryIndex", String(params.primaryIndex ?? 0));
  fd.append("featured", String(Boolean(params.featured)));
  fd.append("quantity", String(Math.max(1, Number(params.quantity || 1))));  
  params.images.forEach((file) => fd.append("images", file));

  const res = await publicFetch(publicUrl(`/v1/catalog/products/draft`), {
    method: "POST",
    credentials: "include",
    body: fd,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || "No se pudo guardar el producto");
    (err as any).status = res.status;
    throw err;
  }

  return res.json();
}

// =========================
// PUBLIC: Catalog plans
// =========================

export type CatalogPlanDto = {
  key: string;            // ej: "ONE", "PACK3", "PACK5", "PACK10"
  title: string;          // ej: "Paquete 5"
  subtitle?: string;      // ej: "5 publicaciones"
  price: number;          // ej: 65
  credits: number;        // ej: 5
  highlight?: "MOST_SOLD" | "RECOMMENDED" | null;
  blurb?: string;
  enabled?: boolean;      // opcional
};

export async function fetchCatalogPlans(): Promise<CatalogPlanDto[]> {
  const res = await publicFetch(publicUrl(`/v1/catalog/plans`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "No se pudieron cargar los planes");
  }

  return res.json();
}

// =========================
// PUBLIC: Catalog checkout (publicación)
// =========================

export type CatalogCheckoutPlanKey = "ONE" | "PACK3" | "PACK5" | "PACK10";

export type CreateCatalogCheckoutResponse = {
  orderId: string; // ✅ viene del BE
  status: "PENDING" | "COMPLETED" | "CANCELLED";
  amount: number;
  currency: string;
  credits: number;
  daysValid: number;
  checkoutUrl?: string;
};

export async function createCatalogCheckout(planKey: CatalogCheckoutPlanKey) {
  const res = await publicFetch(publicUrl(`/v1/catalog/checkout`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planKey }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || "No se pudo crear el checkout");
    (err as any).status = res.status;
    throw err;
  }

  return (await res.json()) as CreateCatalogCheckoutResponse;
}

export async function fakeCompleteCatalogCheckout(checkoutId: string) {
  const res = await publicFetch(publicUrl(`/v1/catalog/checkout/${checkoutId}/fake-complete`), {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || "No se pudo completar el checkout");
    (err as any).status = res.status;
    throw err;
  }

  // puede devolver json o 204
  return res.headers.get("content-type")?.includes("application/json")
    ? res.json()
    : undefined;
}

export async function publishCatalogProduct(productId: string) {
  const res = await publicFetch(publicUrl(`/v1/catalog/products/${productId}/publish`), {
    method: "POST",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || "No se pudo publicar el producto");
    (err as any).status = res.status;
    throw err;
  }

  return res.json();
}

// ===== PUBLIC: Catalog Products (manage) =====

export type CatalogImageDto = {
  originalUrl: string;
  mediumUrl: string;
  thumbUrl: string;
};

export type CatalogProductDto = {
  id: string;
  title: string;
  price: string;
  description?: string | null;
  imageUrls?: CatalogImageDto[];
  active?: boolean;     // o paused (depende tu modelo)
  paused?: boolean;     // si tu response lo trae
  deleted?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export async function listMyCatalogProducts(opts?: { draft?: boolean }) {
  const qs = opts?.draft === undefined ? "" : `?draft=${opts.draft ? "true" : "false"}`;
  const res = await publicFetch(publicUrl(`/v1/catalog/products${qs}`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || "No se pudieron cargar tus productos");
    (err as any).status = res.status;
    throw err;
  }

  return (await res.json()) as CatalogProductDto[];
}

export async function setCatalogProductPaused(productId: string, paused: boolean) {
  const res = await publicFetch(publicUrl(`/v1/catalog/products/${productId}/paused`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paused }),
  });

if (!res.ok) {
  const contentType = res.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await res.json().catch(() => null)
    : await res.text().catch(() => "");

  const err = new Error(
    typeof payload === "string"
      ? payload || "No se pudo actualizar el estado del producto"
      : payload?.message || "No se pudo actualizar el estado del producto"
  );
  (err as any).status = res.status;
  (err as any).payload = payload;
  throw err;
}
}

export async function deleteCatalogProduct(productId: string) {
  const res = await publicFetch(publicUrl(`/v1/catalog/products/${productId}`), {
    method: "DELETE",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || "No se pudo eliminar el producto");
    (err as any).status = res.status;
    throw err;
  }
}

export async function getMyCatalogStats(range: "7d" | "30d" | "all" = "7d") {
  const res = await publicFetch(publicUrl(`/v1/catalog/stats?range=${range}`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => ""));
  return (await res.json()) as CatalogStatsDto;
}

export async function listMyCatalogOrders() {
  const res = await publicFetch(publicUrl(`/v1/catalog/orders`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(await res.text().catch(() => ""));
  return (await res.json()) as CatalogOrderDto[];
}

// =========================
// Seller Dashboard (STUBS)
// =========================

// Ajusta estos types si ya tienes un modelo real de Order o Catalog
export type CatalogOrderDto = {
  id: string;
  productId?: string;
  productTitle?: string;
  quantity?: number;
  unitPrice?: string;
  totalPrice?: string;
  note?: string;
  buyerName?: string;
  buyerPhone?: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "DELIVERED" | string;
  createdAt?: string;
};

export type CatalogStatsDto = {
  catalogViews: number;
  productViews: number;
  ordersTotal: number;
  ordersPending: number;
};

export type CatalogDashboardDto = {
  catalog: {
    id?: string;
    catalogSlug?: string;
    phoneLocal?: string;
    creditsTotal?: number;
    creditsUsed?: number;
    creditsValidUntil?: string | null;
  } | null;
  stats: CatalogStatsDto | null;
  products: CatalogProductDto[];
  orders: CatalogOrderDto[];
};

/**
 * ✅ STUB: por ahora no llama backend.
 * Luego lo conectas a /api/public/v1/catalog/dashboard o /catalog/me
 */
export async function fetchMyCatalogDashboard(): Promise<CatalogDashboardDto> {
  // Si quieres, puedes intentar llamar getMyPublisherCatalog + listMyCatalogProducts aquí,
  // pero para "ver la página" lo dejamos simple.
  return {
    catalog: null,
    stats: null,
    products: [],
    orders: [],
  };
}

/**
 * ✅ STUBS para acciones de pedidos (por ahora no hacen nada)
 * Después los conectas a tus endpoints reales.
 */
export async function acceptCatalogOrder(orderId: string): Promise<void> {
  void orderId;
  return;
}

export async function rejectCatalogOrder(orderId: string): Promise<void> {
  void orderId;
  return;
}
export type CatalogStatsSummary = {
  catalogViews: number;
  uniqueVisitors: number;
  productViews: number;
  productClicks: number;
  whatsappClicks: number;
  orderIntent: number;
  orderSubmitOk: number;
};

export async function fetchCatalogStatsSummary(
  catalogId: string,
  days: number
): Promise<CatalogStatsSummary> {
  const res = await fetch(
    `/api/public/v1/stats/catalog/${encodeURIComponent(catalogId)}/summary?days=${days}`,
    { credentials: "include" }
  );

  if (!res.ok) {
    const msg =
      res.status === 401
        ? "Sesión expirada. Vuelve a iniciar sesión."
        : "No se pudieron cargar las estadísticas.";
    throw new Error(msg);
  }

  return (await res.json()) as CatalogStatsSummary;
}

export async function getSellerConsent() {
  const res = await fetch("/api/public/v1/legal/seller/consent", {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function acceptSellerConsent(version: string) {
  const res = await fetch("/api/public/v1/legal/seller/consent", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || "CONSENT_FAILED");
  }
  return res.json();
}

export type CheckoutOrderStatus = "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";

export type CheckoutOrderDto = {
  id: string;
  status: CheckoutOrderStatus;
  amount: number;
  currency: string;
  credits: number;
  daysValid: number;
  paidAt?: string | null;
  creditsAppliedAt?: string | null;
};

export async function getCheckoutOrder(orderId: string, token?: string): Promise<CheckoutOrderDto> {
  const t = token ? `?t=${encodeURIComponent(token)}` : "";
  const res = await publicFetch(
    publicUrl(`/v1/catalog/checkout/${encodeURIComponent(orderId)}${t}`),
    {
      method: "GET",
      headers: { Accept: "application/json" },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(text || "No se pudo consultar el checkout");
    (err as any).status = res.status;
    throw err;
  }

  return (await res.json()) as CheckoutOrderDto;
}

export async function confirmCheckout(orderId: string, sessionId: string): Promise<CheckoutOrderDto> {
  const res = await publicFetch(publicUrl(`/v1/catalog/checkout/confirm`), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ orderId, sessionId }),
  });

    if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw Object.assign(new Error(txt || "CONFIRM_FAILED"), { status: res.status });
  }
  return (await res.json()) as CheckoutOrderDto;
}

export async function activatePilotPlan(body: { planKey: "PILOT" }) {
  const res = await fetch("/api/public/v1/catalog/pilot/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err: any = new Error("PILOT_ACTIVATE_FAILED");
    err.status = res.status;
    err.body = txt;
    throw err;
  }

  return res.json().catch(() => ({}));
}