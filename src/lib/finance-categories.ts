/** Categorías de gastos e ingresos manuales (mismos valores que la base de datos). */
export const EXPENSE_CATEGORIES = {
  arriendo: "Arriendo",
  servicios: "Servicios públicos",
  internet_software: "Internet y software",
  contador: "Contador y asesorías",
  publicidad: "Publicidad",
  mantenimiento: "Mantenimiento",
  transporte: "Transporte",
  nomina_extra: "Nómina adicional",
  impuestos_tasas: "Impuestos y tasas",
  imprevistos: "Imprevistos",
  otros_egresos: "Otros egresos",
  otros_ingresos: "Otros ingresos",
} as const;
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;
