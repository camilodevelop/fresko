/**
 * Datos legales de FRESKO y versiones vigentes de los documentos.
 *
 * ⚠️ Completa los campos marcados con "Por completar" antes de operar con clientes reales.
 * Al modificar un documento, sube su versión (fecha): los usuarios deberán aceptarlo de nuevo.
 */

export const COMPANY = {
  brand: "FRESKO",
  legalName: "Por completar: razón social o nombre del titular",
  taxId: "Por completar: NIT o cédula",
  address: "Por completar: dirección de notificaciones",
  city: "Bogotá D.C., Colombia",
  email: "hola@fresko.co",
  privacyEmail: "hola@fresko.co",
  phone: "+57 300 123 4567",
  website: "https://fresko-tawny.vercel.app",
};

export const LEGAL_VERSIONS = {
  terminos: "2026-11-05",
  privacidad: "2026-11-05",
  cookies: "2026-11-05",
} as const;

export const LEGAL_DOCS = [
  { href: "/legal/terminos", label: "Términos y condiciones", short: "Términos" },
  { href: "/legal/privacidad", label: "Política de tratamiento de datos personales", short: "Tratamiento de datos" },
  { href: "/legal/cookies", label: "Política de cookies", short: "Cookies" },
  { href: "/legal/pqrs", label: "Peticiones, quejas y reclamos (PQRS)", short: "PQRS" },
] as const;

/** "2026-11-05" → "5 de noviembre de 2026" */
export function formatLegalDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d, 12))
  );
}

export const isPending = (value: string) => value.startsWith("Por completar");
