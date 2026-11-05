/** Motivos de novedad (mismos valores que la base de datos). */
export const INCIDENT_REASONS = [
  { id: "falta_insumo", label: "Falta de insumo" },
  { id: "plato_danado", label: "Plato dañado o mal preparado" },
  { id: "sin_preparar", label: "No se alcanzó a preparar" },
  { id: "incompleto", label: "Pedido incompleto" },
  { id: "cliente", label: "El cliente pidió no entregar" },
  { id: "direccion", label: "Problema con la dirección" },
  { id: "otro", label: "Otro" },
  { id: "cliente_ausente", label: "El cliente no estaba" },
  { id: "sin_contacto", label: "No contestó" },
  { id: "rechazado", label: "El cliente rechazó el pedido" },
  { id: "danado_transito", label: "Se dañó en el camino" },
] as const;

/** Motivos que el domiciliario puede reportar al no poder entregar. */
export const DELIVERY_REASONS = (["cliente_ausente", "sin_contacto", "direccion", "rechazado", "danado_transito", "otro"] as const).map(
  (id) => INCIDENT_REASONS.find((r) => r.id === id)!
);

/** En alistamiento no aplican los motivos de la entrega. */
export const PACKING_REASONS = INCIDENT_REASONS.filter((r) => ["falta_insumo", "plato_danado", "sin_preparar", "incompleto", "cliente", "direccion", "otro"].includes(r.id));

export const STAGE_LABEL: Record<string, string> = { cocina: "Cocina", alistamiento: "Alistamiento", entrega: "Entrega" };

export type IncidentReason = (typeof INCIDENT_REASONS)[number]["id"];

export const incidentLabel = (id: string) => INCIDENT_REASONS.find((r) => r.id === id)?.label ?? id;
