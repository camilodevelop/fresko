import { roundPlan } from "@/lib/pricing";

/** Plato dentro de una entrega del plan (borrador del cliente). */
export type PlanDish = {
  /** Clave local para editar la lista. */
  key: string;
  slug: string;
  name: string;
  image: string;
  /** Precio de venta del plato (con opciones del armador). */
  price: number;
  quantity: number;
  /** Opciones del armador (ids) y su descripción. */
  options?: string[];
  details?: string;
};

/** Entrega del plan: un día, una franja, una dirección y uno o varios platos. */
export type PlanDelivery = {
  date: string;
  slotId: string;
  addressId: string;
  notes: string;
  dishes: PlanDish[];
};

export type PlanTerms = { portions: number; discount: number; baseValue: number; validityDays: number };

export const SUBSCRIPTION_STATUS: Record<string, { label: string; tone: "green" | "amber" | "gray" | "red" }> = {
  pendiente_pago: { label: "Pendiente de pago", tone: "amber" },
  activa: { label: "Activa", tone: "green" },
  vencida: { label: "Vencida", tone: "gray" },
  cancelada: { label: "Cancelada", tone: "red" },
};

/** Estado que ve la gente: una suscripción activa con la vigencia cumplida está vencida. */
export function subscriptionState(status: string, expiresOn: string, today: string) {
  return status === "activa" && expiresOn < today ? "vencida" : status;
}

/** Valor de un plato dentro del plan: nunca menos que el valor base. */
export const planValue = (price: number, base: number) => Math.max(price, base);

export const portionsOf = (deliveries: PlanDelivery[]) =>
  deliveries.reduce((s, d) => s + d.dishes.reduce((x, i) => x + i.quantity, 0), 0);

/**
 * Total al comprar: platos programados a su valor y las porciones libres al valor base,
 * con el descuento del plan. Es el mismo cálculo de la base de datos.
 */
export function planPurchaseTotal(deliveries: PlanDelivery[], terms: PlanTerms) {
  const scheduled = deliveries.flatMap((d) => d.dishes);
  const value = scheduled.reduce((s, i) => s + planValue(i.price, terms.baseValue) * i.quantity, 0);
  const used = portionsOf(deliveries);
  const free = Math.max(0, terms.portions - used);
  const gross = value + free * terms.baseValue;
  return {
    used,
    free,
    gross,
    discount: gross - roundPlan(gross * (1 - terms.discount)),
    total: roundPlan(gross * (1 - terms.discount)),
    /** Lo que suman los platos más caros que el valor base (antes del descuento). */
    extras: scheduled.reduce((s, i) => s + Math.max(0, i.price - terms.baseValue) * i.quantity, 0),
  };
}

/** Diferencia a pagar al programar o cambiar una entrega (estimado; la base de datos confirma). */
export function planChangeCharge(newDishes: PlanDish[], oldDishes: { planValue: number; quantity: number }[], terms: PlanTerms) {
  const newValue = newDishes.reduce((s, i) => s + planValue(i.price, terms.baseValue) * i.quantity, 0);
  const newCount = newDishes.reduce((s, i) => s + i.quantity, 0);
  const oldValue = oldDishes.reduce((s, i) => s + i.planValue * i.quantity, 0);
  const oldCount = oldDishes.reduce((s, i) => s + i.quantity, 0);
  const credit = oldValue + (newCount - oldCount) * terms.baseValue;
  return Math.max(0, roundPlan((newValue - credit) * (1 - terms.discount)));
}

/** Fecha de hoy en Bogotá (YYYY-MM-DD). */
export function todayBogota(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(now);
}

export function addDaysIso(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string) {
  const [a, b] = [fromIso, toIso].map((iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  });
  return Math.round((b - a) / 86_400_000);
}
