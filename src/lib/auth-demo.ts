export const FRESKO_DEMO_USER_KEY = "fresko_demo_user";

export type DemoUser = {
  name: string;
  email?: string;
  phone?: string;
  phoneVerified: boolean;
};

export function saveDemoUser(user: DemoUser) {
  window.localStorage.setItem(FRESKO_DEMO_USER_KEY, JSON.stringify(user));
}

export function readDemoUser(): DemoUser | null {
  try {
    const raw = window.localStorage.getItem(FRESKO_DEMO_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as DemoUser;
  } catch {
    return null;
  }
}

/** Colombia: 10 dígitos, suele empezar en 3 */
export function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("57") && digits.length === 12) return digits.slice(2);
  return digits;
}

export function isValidColombianPhone(value: string): boolean {
  const phone = normalizePhone(value);
  return /^3\d{9}$/.test(phone);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function formatPhoneDisplay(value: string): string {
  const phone = normalizePhone(value);
  if (phone.length !== 10) return value;
  return `+57 ${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
}

export const DEMO_OTP = "123456";
