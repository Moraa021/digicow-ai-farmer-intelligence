import { api } from "./api";

// Browser-only persistence for features the backend doesn't expose yet.
// Stored under namespaced keys per farmer name.

const isBrowser = () => typeof window !== "undefined";

function read<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Advice Log ----------
export interface AdviceEntry {
  id: string;
  topic: string;
  note: string;
  createdAt: number;
}

const adviceKey = (name: string) => `digicow.advice.${name}`;

export function listAdvice(name: string): AdviceEntry[] {
  return read<AdviceEntry[]>(adviceKey(name), []).sort(
    (a, b) => b.createdAt - a.createdAt,
  );
}

export function addAdvice(name: string, topic: string, note: string) {
  const list = read<AdviceEntry[]>(adviceKey(name), []);
  list.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    topic,
    note,
    createdAt: Date.now(),
  });
  write(adviceKey(name), list);
}

export function removeAdvice(name: string, id: string) {
  const list = read<AdviceEntry[]>(adviceKey(name), []).filter(
    (e) => e.id !== id,
  );
  write(adviceKey(name), list);
}

// ---------- Priority Override ----------
export interface PriorityOverride {
  score: number;
  reason: string;
  updatedAt: number;
}

const priorityKey = (name: string) => `digicow.priority.${name}`;
const priorityCache = new Map<string, PriorityOverride | null>();

export function getPriorityOverride(name: string): PriorityOverride | null {
  const cached = priorityCache.get(name);
  if (cached !== undefined) return cached;

  const stored = read<PriorityOverride | null>(priorityKey(name), null);
  if (stored) {
    priorityCache.set(name, stored);
    return stored;
  }

  if (isBrowser()) {
    void loadPriorityOverride(name);
  }
  return null;
}

export async function loadPriorityOverride(
  name: string,
): Promise<PriorityOverride | null> {
  try {
    const remote = await api.getPriorityOverride(name);
    if (remote) {
      priorityCache.set(name, remote);
      write(priorityKey(name), remote);
      return remote;
    }
    priorityCache.set(name, null);
    if (isBrowser()) {
      window.localStorage.removeItem(priorityKey(name));
    }
    return null;
  } catch {
    const fallback = read<PriorityOverride | null>(priorityKey(name), null);
    if (fallback) {
      priorityCache.set(name, fallback);
    }
    return fallback;
  }
}

export async function setPriorityOverride(
  name: string,
  score: number,
  reason: string,
) {
  const override: PriorityOverride = {
    score,
    reason,
    updatedAt: Date.now(),
  };
  priorityCache.set(name, override);
  write(priorityKey(name), override);

  try {
    await api.setPriorityOverride(name, { score, reason });
  } catch {
    // fall back to local persistence when the backend is unavailable
  }
}

export async function clearPriorityOverride(name: string) {
  priorityCache.set(name, null);
  if (!isBrowser()) return;
  window.localStorage.removeItem(priorityKey(name));

  try {
    await api.clearPriorityOverride(name);
  } catch {
    // fall back to local persistence when the backend is unavailable
  }
}

export function effectivePriority(
  name: string,
  apiScore: number | undefined,
): number {
  const o = getPriorityOverride(name);
  if (o) return o.score;
  return apiScore ?? 0;
}
