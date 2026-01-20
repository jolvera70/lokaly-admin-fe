// src/api/publishOrders.ts
export type OrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "DELIVERED";

export interface OrderDto {
  id: string;
  productTitle: string;
  buyerName: string;
  buyerPhone: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  note?: string;
  status: OrderStatus;
  createdAt: string;
}

export async function fetchPublishOrders(status?: OrderStatus) {
  const qs = status ? `?status=${status}` : "";
  const res = await fetch(`/api/public/v1/publish/orders${qs}`, {
    credentials: "include", // 🔑 cookie lokaly_pub
  });
  if (!res.ok) throw new Error("Failed to load orders");
  return res.json() as Promise<OrderDto[]>;
}

export async function updatePublishOrderStatus(
  orderId: string,
  status: OrderStatus
) {
  const res = await fetch(
    `/api/public/v1/publish/orders/${orderId}/status`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );
  if (!res.ok) throw new Error("Failed to update order");
  return res.json();
}