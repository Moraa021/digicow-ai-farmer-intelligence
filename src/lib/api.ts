import type { AddFarmerPayload, Farmer, RecommendationResponse } from "./types";

interface PriorityOverride {
  score: number;
  reason: string;
  updatedAt: number;
}

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data?.detail || data?.message || JSON.stringify(data);
    } catch {
      detail = await res.text();
    }
    throw new Error(detail || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  listFarmers: () => request<Farmer[]>("/farmers"),
  getFarmer: (name: string) =>
    request<Farmer>(`/farmers/${encodeURIComponent(name)}`),
  recommend: (farmer_name: string) =>
    request<RecommendationResponse>("/recommend", {
      method: "POST",
      body: JSON.stringify({ farmer_name }),
    }),
  sendSMS: (to: string, message: string) =>
    request<{ message: string; response?: string }>("/send-sms", {
      method: "POST",
      body: JSON.stringify({ to, message }),
    }),
  addFarmer: (payload: AddFarmerPayload) =>
    request<Farmer>("/farmers/add", {
      method: "POST",
      body: JSON.stringify({
        name: payload.name,
        location: payload.location ?? "",
        phone: payload.phone ?? "",
        income: payload.income ?? 0,
        cow_count: payload.cow_count ?? 0,
        cows: payload.cows ?? [],
        diseases: payload.diseases ?? [],
        milk_production: payload.milk_production ?? 0,
        soil: payload.soil ?? "",
      }),
    }),
  updateFarmer: (payload: AddFarmerPayload) =>
    request<Farmer>(`/farmers/${encodeURIComponent(payload.name)}`, {
      method: "PUT",
      body: JSON.stringify({
        name: payload.name,
        location: payload.location ?? "",
        phone: payload.phone ?? "",
        income: payload.income ?? 0,
        cow_count: payload.cow_count ?? 0,
        cows: payload.cows ?? [],
        diseases: payload.diseases ?? [],
        milk_production: payload.milk_production ?? 0,
        soil: payload.soil ?? "",
      }),
    }),
  deleteFarmer: (name: string) =>
    request<{ message?: string }>(
      `/farmers/delete/${encodeURIComponent(name)}`,
      { method: "DELETE" },
    ),
  getPriorityOverride: (name: string) =>
    request<PriorityOverride | null>(`/priority-override/${encodeURIComponent(name)}`),
  setPriorityOverride: (name: string, payload: { score: number; reason: string }) =>
    request<PriorityOverride>(`/priority-override/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  clearPriorityOverride: (name: string) =>
    request<null>(`/priority-override/${encodeURIComponent(name)}`, {
      method: "DELETE",
    }),
};