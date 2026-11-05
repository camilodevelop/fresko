import { getExampleNumber, isValidPhoneNumber, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import examples from "libphonenumber-js/mobile/examples";

/** Países disponibles en el selector (Colombia primero). Se pueden agregar más códigos ISO. */
export const PHONE_COUNTRIES: { iso: CountryCode; name: string; flag: string }[] = [
  { iso: "CO", name: "Colombia", flag: "🇨🇴" },
  { iso: "MX", name: "México", flag: "🇲🇽" },
  { iso: "PE", name: "Perú", flag: "🇵🇪" },
  { iso: "EC", name: "Ecuador", flag: "🇪🇨" },
  { iso: "VE", name: "Venezuela", flag: "🇻🇪" },
  { iso: "CL", name: "Chile", flag: "🇨🇱" },
  { iso: "AR", name: "Argentina", flag: "🇦🇷" },
  { iso: "BR", name: "Brasil", flag: "🇧🇷" },
  { iso: "PA", name: "Panamá", flag: "🇵🇦" },
  { iso: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { iso: "GT", name: "Guatemala", flag: "🇬🇹" },
  { iso: "SV", name: "El Salvador", flag: "🇸🇻" },
  { iso: "HN", name: "Honduras", flag: "🇭🇳" },
  { iso: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { iso: "DO", name: "República Dominicana", flag: "🇩🇴" },
  { iso: "PR", name: "Puerto Rico", flag: "🇵🇷" },
  { iso: "UY", name: "Uruguay", flag: "🇺🇾" },
  { iso: "PY", name: "Paraguay", flag: "🇵🇾" },
  { iso: "BO", name: "Bolivia", flag: "🇧🇴" },
  { iso: "US", name: "Estados Unidos", flag: "🇺🇸" },
  { iso: "CA", name: "Canadá", flag: "🇨🇦" },
  { iso: "ES", name: "España", flag: "🇪🇸" },
];

export const DEFAULT_PHONE_COUNTRY: CountryCode = "CO";

export type PhoneValue = { country: CountryCode; number: string };

/** Indicativo del país: "CO" → "+57". */
export function dialCode(country: CountryCode) {
  const example = getExampleNumber(country, examples);
  return example ? `+${example.countryCallingCode}` : "";
}

/** Número de ejemplo en formato nacional, para el placeholder. */
export function examplePhone(country: CountryCode) {
  return getExampleNumber(country, examples)?.formatNational() ?? "";
}

/** País + número nacional → E.164 (+573001234567), o null si no es válido. */
export function toE164(value: PhoneValue): string | null {
  const digits = value.number.replace(/[^\d+]/g, "");
  if (!digits) return null;
  const parsed = parsePhoneNumberFromString(digits, value.country);
  return parsed && parsed.isValid() ? parsed.number : null;
}

export function isValidPhone(value: PhoneValue) {
  const digits = value.number.replace(/[^\d+]/g, "");
  return digits.length > 0 && isValidPhoneNumber(digits, value.country);
}

/**
 * Lee un teléfono guardado. Acepta E.164 (+52…) y el formato antiguo de 10 dígitos
 * colombianos (3001234567).
 */
export function parseStoredPhone(stored: string | null | undefined): PhoneValue {
  const raw = (stored ?? "").trim();
  if (!raw) return { country: DEFAULT_PHONE_COUNTRY, number: "" };
  const parsed = parsePhoneNumberFromString(raw.startsWith("+") ? raw : raw, raw.startsWith("+") ? undefined : DEFAULT_PHONE_COUNTRY);
  if (parsed?.country) return { country: parsed.country, number: parsed.formatNational() };
  return { country: DEFAULT_PHONE_COUNTRY, number: raw };
}

/** "+573001234567" → "+57 300 1234567". */
export function formatPhone(stored: string | null | undefined) {
  const raw = (stored ?? "").trim();
  if (!raw) return "";
  const parsed = parsePhoneNumberFromString(raw, raw.startsWith("+") ? undefined : DEFAULT_PHONE_COUNTRY);
  return parsed ? parsed.formatInternational() : raw;
}

/** Solo dígitos con indicativo, para enlaces de WhatsApp (wa.me/573001234567). */
export function whatsappDigits(stored: string | null | undefined) {
  const raw = (stored ?? "").trim();
  if (!raw) return "";
  const parsed = parsePhoneNumberFromString(raw, raw.startsWith("+") ? undefined : DEFAULT_PHONE_COUNTRY);
  return parsed ? parsed.number.replace("+", "") : raw.replace(/\D/g, "");
}
