import type { AddFarmerPayload, Farmer, RecommendationResponse } from "./types";

interface PriorityOverride {
  score: number;
  reason: string;
  updatedAt: number;
}

interface PendingOperation {
  id: string;
  type: "add" | "update" | "delete";
  name: string;
  payload?: AddFarmerPayload;
  timestamp: number;
}

const API_BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:5000");

const FARMERS_CACHE_KEY = "digicow.local.farmers";
const PENDING_OPS_KEY = "digicow.local.pendingOps";
const isBrowser = () => typeof window !== "undefined";

function readStorage<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function readCachedFarmers(): Farmer[] {
  return readStorage<Farmer[]>(FARMERS_CACHE_KEY, []);
}

function writeCachedFarmers(farmers: Farmer[]) {
  writeStorage(FARMERS_CACHE_KEY, farmers);
}

function readPendingOps(): PendingOperation[] {
  return readStorage<PendingOperation[]>(PENDING_OPS_KEY, []);
}

function writePendingOps(ops: PendingOperation[]) {
  writeStorage(PENDING_OPS_KEY, ops);
}

function upsertCachedFarmer(farmer: Farmer) {
  const list = readCachedFarmers();
  const index = list.findIndex((item) => item.name === farmer.name);
  if (index >= 0) {
    list[index] = { ...list[index], ...farmer };
  } else {
    list.push(farmer);
  }
  writeCachedFarmers(list.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)));
}

function removeCachedFarmer(name: string) {
  const list = readCachedFarmers().filter((item) => item.name !== name);
  writeCachedFarmers(list);
}

function queuePendingOp(op: PendingOperation) {
  const pending = readPendingOps();
  pending.push(op);
  writePendingOps(pending);
}

function clearPendingOp(id: string) {
  const pending = readPendingOps().filter((item) => item.id !== id);
  writePendingOps(pending);
}

async function flushPendingOps() {
  if (!isBrowser()) return;
  const pending = readPendingOps();
  if (!pending.length) return;
  writePendingOps([]);

  for (const op of pending) {
    try {
      if (op.type === "delete") {
        await api.deleteFarmer(op.name);
      } else if (op.type === "update") {
        await api.updateFarmer(op.payload!);
      } else {
        await api.addFarmer(op.payload!);
      }
      clearPendingOp(op.id);
    } catch {
      // keep the operation queued until the next successful retry
      queuePendingOp(op);
    }
  }
}

if (isBrowser()) {
  window.addEventListener("online", () => {
    void flushPendingOps();
  });
}

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
  listFarmers: async () => {
    try {
      const farmers = await request<Farmer[]>("/farmers");
      writeCachedFarmers(farmers);
      return farmers;
    } catch {
      return readCachedFarmers();
    }
  },
  getFarmer: async (name: string) => {
    try {
      const farmer = await request<Farmer>(`/farmers/${encodeURIComponent(name)}`);
      upsertCachedFarmer(farmer);
      return farmer;
    } catch {
      const cached = readCachedFarmers().find((item) => item.name === name);
      if (cached) return cached;
      throw new Error("Farmer not available offline");
    }
  },
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
  addFarmer: async (payload: AddFarmerPayload) => {
    const optimistic: Farmer = {
      name: payload.name,
      location: payload.location ?? "",
      phone: payload.phone ?? "",
      income: payload.income ?? 0,
      priority: 0,
      cow_count: payload.cow_count ?? 0,
      cows: payload.cows ?? [],
      diseases: payload.diseases ?? [],
      milk_production: payload.milk_production ?? 0,
      soil: payload.soil ?? "",
    };
    upsertCachedFarmer(optimistic);
    queuePendingOp({ id: `${Date.now()}-${payload.name}`, type: "add", name: payload.name, payload, timestamp: Date.now() });
    try {
      const farmer = await request<Farmer>("/farmers/add", {
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
      });
      upsertCachedFarmer(farmer);
      return farmer;
    } catch {
      return optimistic;
    }
  },
  updateFarmer: async (payload: AddFarmerPayload) => {
    const optimistic: Farmer = {
      name: payload.name,
      location: payload.location ?? "",
      phone: payload.phone ?? "",
      income: payload.income ?? 0,
      priority: 0,
      cow_count: payload.cow_count ?? 0,
      cows: payload.cows ?? [],
      diseases: payload.diseases ?? [],
      milk_production: payload.milk_production ?? 0,
      soil: payload.soil ?? "",
    };
    upsertCachedFarmer(optimistic);
    queuePendingOp({ id: `${Date.now()}-${payload.name}`, type: "update", name: payload.name, payload, timestamp: Date.now() });
    try {
      const farmer = await request<Farmer>(`/farmers/${encodeURIComponent(payload.name)}`, {
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
      });
      upsertCachedFarmer(farmer);
      return farmer;
    } catch {
      return optimistic;
    }
  },
  deleteFarmer: async (name: string) => {
    removeCachedFarmer(name);
    queuePendingOp({ id: `${Date.now()}-${name}`, type: "delete", name, timestamp: Date.now() });
    try {
      return await request<{ message?: string }>(
        `/farmers/delete/${encodeURIComponent(name)}`,
        { method: "DELETE" },
      );
    } catch {
      return { message: "Queued for sync" };
    }
  },
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