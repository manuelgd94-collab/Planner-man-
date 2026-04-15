const PIN_KEY = 'planner:auth:pin';
const LOCKED_KEY = 'planner:auth:locked';

function hashPin(pin: string): string {
  // Simple hash — not cryptographic, just obfuscation for a local app
  let hash = 0;
  for (let i = 0; i < pin.length; i++) {
    hash = (hash << 5) - hash + pin.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

export function hasPin(): boolean {
  return !!localStorage.getItem(PIN_KEY);
}

export function setPin(pin: string): void {
  localStorage.setItem(PIN_KEY, hashPin(pin));
}

export function verifyPin(pin: string): boolean {
  const stored = localStorage.getItem(PIN_KEY);
  return stored === hashPin(pin);
}

export function isLocked(): boolean {
  return localStorage.getItem(LOCKED_KEY) !== 'false';
}

export function setLocked(locked: boolean): void {
  localStorage.setItem(LOCKED_KEY, String(locked));
}

export function removePin(): void {
  localStorage.removeItem(PIN_KEY);
  localStorage.removeItem(LOCKED_KEY);
}
