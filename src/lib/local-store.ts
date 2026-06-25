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

export function getPriorityOverride(name: string): PriorityOverride | null {
  return read<PriorityOverride | null>(priorityKey(name), null);
}

export function setPriorityOverride(
  name: string,
  score: number,
  reason: string,
) {
  write<PriorityOverride>(priorityKey(name), {
    score,
    reason,
    updatedAt: Date.now(),
  });
}

export function clearPriorityOverride(name: string) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(priorityKey(name));
}

export function effectivePriority(
  name: string,
  apiScore: number | undefined,
): number {
  const o = getPriorityOverride(name);
  if (o) return o.score;
  return apiScore ?? 0;
}
