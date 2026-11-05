/**
 * Validadores de formularios. Devuelven el mensaje de error o null.
 * Los mensajes van en español, en tono de instrucción ("Escribe…", "Elige…").
 */

export type Errors = Record<string, string | null | undefined>;

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v)).trim();
const num = (v: unknown) => {
  const s = str(v).replace(",", ".");
  return s === "" ? NaN : Number(s);
};

export const rules = {
  required: (v: unknown, msg = "Este campo es obligatorio.") => (str(v) ? null : msg),

  minLength: (v: unknown, n: number, msg?: string) =>
    str(v).length >= n ? null : msg ?? `Debe tener al menos ${n} caracteres.`,

  email: (v: unknown, msg = "Escribe un correo válido, por ejemplo nombre@correo.com.") =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(str(v)) ? null : msg,

  /** Celular colombiano: 10 dígitos que empiezan por 3 (acepta +57 y espacios). Vacío = válido. */
  phoneCO: (v: unknown, msg = "Escribe un celular de 10 dígitos que empiece por 3.") => {
    const digits = str(v).replace(/\D/g, "").replace(/^57(?=3\d{9}$)/, "");
    return !digits || /^3\d{9}$/.test(digits) ? null : msg;
  },

  /** Número dentro de un rango (incluye los extremos). */
  range: (v: unknown, min: number, max: number, msg?: string) => {
    const n = num(v);
    if (Number.isNaN(n)) return msg ?? "Escribe un número.";
    return n >= min && n <= max ? null : msg ?? `Debe estar entre ${min} y ${max}.`;
  },

  /** Entero mayor o igual a `min`. */
  integer: (v: unknown, min = 0, msg?: string) => {
    const n = num(v);
    if (Number.isNaN(n)) return msg ?? "Escribe un número.";
    if (!Number.isInteger(n)) return "Debe ser un número entero.";
    return n >= min ? null : msg ?? (min > 0 ? `Debe ser mayor o igual a ${min}.` : "No puede ser negativo.");
  },

  /** Número > 0 (cantidades). */
  positive: (v: unknown, msg = "Debe ser mayor a 0.") => {
    const n = num(v);
    return !Number.isNaN(n) && n > 0 ? null : msg;
  },

  /** Valor en pesos (entero ≥ min). */
  money: (v: unknown, min = 0, msg?: string) => {
    const n = num(String(v ?? "").replace(/[^\d.,-]/g, ""));
    if (Number.isNaN(n)) return msg ?? "Escribe un valor en pesos.";
    if (!Number.isInteger(n)) return "Usa pesos sin decimales.";
    return n >= min ? null : msg ?? (min > 0 ? "Debe ser mayor a $0." : "No puede ser negativo.");
  },

  pattern: (v: unknown, re: RegExp, msg: string) => (re.test(str(v)) ? null : msg),

  /** Igualdad con otro valor (p. ej. confirmar contraseña). */
  equals: (v: unknown, other: unknown, msg: string) => (str(v) === str(other) ? null : msg),
};

/** Devuelve el primer error de una lista de reglas ya evaluadas. */
export function first(...results: (string | null | undefined)[]) {
  return results.find(Boolean) ?? null;
}

/** Quita las claves sin error. */
export function clean(errors: Errors): Record<string, string> {
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => Boolean(v))) as Record<string, string>;
}
