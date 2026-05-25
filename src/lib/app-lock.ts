import bcrypt from "bcryptjs";

const APP_LOCK_KEY = "mm_app_lock_verified";

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 10);
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function setAppLockVerified(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(APP_LOCK_KEY, "true");
  }
}

export function isAppLockVerified(): boolean {
  if (typeof sessionStorage === "undefined") return true;
  return sessionStorage.getItem(APP_LOCK_KEY) === "true";
}

export function clearAppLockVerified(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(APP_LOCK_KEY);
  }
}
