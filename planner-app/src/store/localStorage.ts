export const SCHEMA_VERSION = 1;
const PREFIX = `planner:v${SCHEMA_VERSION}`;

export const KEYS = {
  habits: `${PREFIX}:habits`,
  settings: `${PREFIX}:settings`,
  daily: (date: string) => `${PREFIX}:daily:${date}`,
  monthly: (yearMonth: string) => `${PREFIX}:monthly:${yearMonth}`,
  annual: (year: number) => `${PREFIX}:annual:${year}`,
  meta: 'planner:meta:schemaVersion',
};

export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

export function listKeys(prefix: string): string[] {
  const result: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(prefix)) result.push(key);
  }
  return result;
}
