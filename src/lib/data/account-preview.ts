/**
 * Datos de EJEMPLO para "Mi cuenta" mientras no existen pedidos ni suscripciones
 * reales (fases 3 y 4). Se reemplazan por consultas a la base de datos.
 */

export const PREVIEW_PLAN = {
  name: "Plan Smart",
  category: "Bowls + ensaladas",
  total: 20,
  used: 6,
  scheduled: 9,
  startsOn: "2026-11-01",
  endsOn: "2026-12-01",
  price: 349000,
};

export function formatLongDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(new Date(y, m - 1, d));
}

export function formatShortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(new Date(y, m - 1, d));
}

