"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { clean, type Errors } from "@/lib/validation";

type Values = Record<string, unknown>;

/** Lee los valores de un <form> por `name` (para formularios no controlados). */
function readForm(form: HTMLElement | null): Values {
  if (!(form instanceof HTMLFormElement)) return {};
  const data = new FormData(form);
  const values: Values = {};
  for (const [k, v] of data.entries()) values[k] = typeof v === "string" ? v : v.name;
  return values;
}

/**
 * Validación consistente para todos los formularios:
 * - muestra el error de un campo al salir de él (blur) o al intentar enviar;
 * - mientras se corrige, revalida en vivo los campos que ya tienen error;
 * - al enviar con errores no envía y lleva el foco al primer campo inválido.
 *
 * Uso: <form {...v.formProps(onValid?)}> y en cada control {...v.field("nombre")}.
 * Si `onValid` se pasa, el envío nativo se cancela siempre y se llama `onValid` cuando todo es válido
 * (formularios controlados). Si no, el formulario sigue su `action` normal cuando es válido.
 */
export function useFormValidation<V extends Values = Values>(
  validate: (values: V) => Errors,
  getValues?: () => V,
  /** Prefijo para los id (evita choques si hay varios formularios en la página). */
  prefix = "f"
) {
  // Callback ref en estado (no useRef) para poder usarla sin leer refs durante el render.
  const [form, setForm] = useState<HTMLElement | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);

  // Siempre la última versión de las funciones (evita validar valores viejos tras un cambio).
  const latest = useRef({ validate, getValues, form });
  useLayoutEffect(() => {
    latest.current = { validate, getValues, form };
  });

  const run = useCallback(() => {
    const { validate: fn, getValues: get, form: el } = latest.current;
    const result = clean(fn(get ? get() : (readForm(el) as V)));
    setErrors(result);
    return result;
  }, []);

  const focusFirst = () =>
    requestAnimationFrame(() => {
      const el = latest.current.form?.querySelector<HTMLElement>('[aria-invalid="true"]');
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });

  const visible = (name: string) => (submitted || touched[name] ? errors[name] : undefined);

  const formProps = (onValid?: () => void) => ({
    ref: setForm,
    noValidate: true,
    "data-validation-root": "",
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => {
      setSubmitted(true);
      const result = run();
      const invalid = Object.keys(result).length > 0;
      if (onValid || invalid) e.preventDefault();
      if (invalid) focusFirst();
      else onValid?.();
    },
    onBlur: (e: React.FocusEvent<HTMLFormElement>) => {
      const name = (e.target as unknown as HTMLInputElement).name;
      // Ignora campos de otro formulario anidado en el árbol de React.
      if (!name || !(e.target as HTMLElement).closest("[data-validation-root]")?.isSameNode(latest.current.form)) return;
      setTouched((t) => (t[name] ? t : { ...t, [name]: true }));
      run();
    },
    onChange: (e: React.FormEvent<HTMLFormElement>) => {
      const name = (e.target as unknown as HTMLInputElement).name;
      // Revalida en vivo solo si ese campo ya mostraba error (no molesta mientras se escribe la primera vez).
      if (name && (errors[name] || submitted)) requestAnimationFrame(run);
    },
  });

  /**
   * Para contenedores que NO son <form> (p. ej. cuando adentro hay otro formulario,
   * porque HTML no permite anidarlos). Se valida con `submit(onValid)` desde un botón.
   */
  const containerProps = () => ({
    ref: setForm,
    onBlur: (e: React.FocusEvent<HTMLElement>) => {
      const name = (e.target as unknown as HTMLInputElement).name;
      if (!name || !(e.target as HTMLElement).closest("[data-validation-root]")?.isSameNode(latest.current.form)) return;
      setTouched((t) => (t[name] ? t : { ...t, [name]: true }));
      run();
    },
    onChange: (e: React.FormEvent<HTMLElement>) => {
      const name = (e.target as unknown as HTMLInputElement).name;
      if (name && (errors[name] || submitted)) requestAnimationFrame(run);
    },
    "data-validation-root": "",
  });

  /** Valida todo y, si está bien, ejecuta `onValid` (botón de un contenedor sin <form>). */
  const submit = (onValid: () => void) => {
    setSubmitted(true);
    const result = run();
    if (Object.keys(result).length > 0) focusFirst();
    else onValid();
  };

  /** id del control (para <Field name={v.idFor(...)}> y el mensaje de error). */
  const idFor = (name: string) => `${prefix}-${name}`;

  /** Props de nombre y accesibilidad para un control. */
  const field = (name: string) => {
    const error = visible(name);
    return {
      name,
      id: idFor(name),
      "aria-invalid": error ? (true as const) : undefined,
      "aria-describedby": error ? `${idFor(name)}-error` : undefined,
    };
  };

  /** Valida desde código (formularios sin <form>, p. ej. filas en una tabla). */
  const check = () => {
    setSubmitted(true);
    const result = run();
    const ok = Object.keys(result).length === 0;
    if (!ok) focusFirst();
    return ok;
  };

  const reset = () => {
    setErrors({});
    setTouched({});
    setSubmitted(false);
  };

  /** Limpia los valores del formulario (no controlado) y sus errores. */
  const resetForm = () => {
    const el = latest.current.form;
    if (el instanceof HTMLFormElement) el.reset();
    reset();
  };

  return { formProps, containerProps, submit, field, idFor, error: visible, errors, check, reset, resetForm, revalidate: run };
}
