// src/lib/coloniesApi.ts

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://lokaly.site:8080";

export type Colony = {
  id: string;
  name: string;
  city: string;
  state: string;
  zipCode?: string;
  notes?: string;
  createdAt?: string;
};

export type ClusterDetail = {
  id: string;
  name: string;
  city: string;
  createdAt?: string;
  description?: string;
};

export type ClusterSummary = {
  id: string;
  name: string;
  city: string;
  state: string;
  zipCode?: string;
  notes?: string;
  createdAt?: string;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ===== CLUSTERS ===== */

export async function fetchClusters(): Promise<ClusterSummary[]> {
  const res = await fetch(`${API_BASE}/api/admin/clusters`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return handleResponse<ClusterSummary[]>(res);
}

export async function fetchClusterById(clusterId: string): Promise<ClusterDetail> {
  const res = await fetch(`${API_BASE}/api/admin/clusters/${clusterId}`);
  return handleResponse<ClusterDetail>(res);
}

export const fetchCluster = fetchClusterById;

export async function createCluster(body: {
  name: string;
  city: string;
  description?: string;
}): Promise<ClusterDetail> {
  const res = await fetch(`${API_BASE}/api/admin/clusters`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<ClusterDetail>(res);
}

/* ===== COLONIAS ===== */

export async function fetchColonies(clusterId: string): Promise<Colony[]> {
  const res = await fetch(
    `${API_BASE}/api/admin/clusters/${clusterId}/colonies`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    }
  );
  return handleResponse<Colony[]>(res);
}

export async function createColony(
  clusterId: string,
  body: { name: string; city: string; state: string; zipCode?: string; notes?: string }
): Promise<Colony> {
  const res = await fetch(
    `${API_BASE}/api/admin/clusters/${clusterId}/colonies`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  return handleResponse<Colony>(res);
}

export async function updateColony(
  clusterId: string,
  colonyId: string,
  body: { name: string; city: string; state: string; zipCode?: string; notes?: string }
): Promise<Colony> {
  const res = await fetch(
    `${API_BASE}/api/admin/clusters/${clusterId}/colonies/${colonyId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  return handleResponse<Colony>(res);
}

export async function deleteColony(
  clusterId: string,
  colonyId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/api/admin/clusters/${clusterId}/colonies/${colonyId}`,
    { method: "DELETE" }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
}