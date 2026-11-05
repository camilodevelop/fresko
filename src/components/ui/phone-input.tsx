"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import type { CountryCode } from "libphonenumber-js";
import { Input } from "@/components/ui/input";
import { PHONE_COUNTRIES, dialCode, examplePhone, toE164, type PhoneValue } from "@/lib/phone";
import { cn } from "@/lib/utils";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Selector de país compacto (bandera + indicativo) con lista buscable. */
function CountryPicker({ value, onChange }: { value: CountryCode; onChange: (c: CountryCode) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();
  const current = PHONE_COUNTRIES.find((c) => c.iso === value) ?? PHONE_COUNTRIES[0];

  const options = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter((c) => normalize(c.name).includes(q) || dialCode(c.iso).includes(q.replace(/^\+?/, "+")));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const close = (focusButton = true) => {
    setOpen(false);
    setQuery("");
    if (focusButton) ref.current?.querySelector<HTMLButtonElement>("button[data-trigger]")?.focus();
  };

  const pick = (c: CountryCode) => {
    onChange(c);
    close();
  };

  // Navegación con flechas entre las opciones.
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>("[role=option]") ?? []);
    const index = items.findIndex((el) => el === document.activeElement);
    const next = e.key === "ArrowDown" ? Math.min(items.length - 1, index + 1) : Math.max(-1, index - 1);
    if (next === -1) ref.current?.querySelector<HTMLInputElement>("input[type=search]")?.focus();
    else items[next]?.focus();
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        data-trigger
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`País del celular: ${current.name} ${dialCode(current.iso)}`}
        onClick={() => (open ? close(false) : setOpen(true))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={cn(
          "flex h-12 items-center gap-1.5 rounded-2xl border bg-white pl-3 pr-2.5 text-sm text-[#1B1B1B] shadow-sm transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8BC34A]/50",
          open ? "border-[#8BC34A]" : "border-[#1F4D36]/15 hover:border-[#1F4D36]/30"
        )}
      >
        <span className="text-lg leading-none" aria-hidden>
          {current.flag}
        </span>
        <span className="font-medium tabular-nums">{dialCode(current.iso)}</span>
        <ChevronDown className={cn("h-4 w-4 text-[#1B1B1B]/40 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-2xl bg-white shadow-2xl shadow-[#1F4D36]/15 ring-1 ring-[#1F4D36]/10"
          onKeyDown={onListKey}
        >
          <div className="relative border-b border-[#1F4D36]/[0.06] p-2">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1B1B1B]/35" />
            <input
              type="search"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar país o indicativo"
              aria-label="Buscar país"
              className="h-10 w-full rounded-xl bg-[#F8F7F2] pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#8BC34A]/40"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (options[0]) pick(options[0].iso);
                }
              }}
            />
          </div>
          <div id={listId} role="listbox" aria-label="Países" className="max-h-64 overflow-y-auto p-1.5">
            {options.length === 0 && <p className="px-3 py-4 text-center text-sm text-[#1B1B1B]/45">Sin resultados</p>}
            {options.map((c) => {
              const selected = c.iso === value;
              return (
                <button
                  key={c.iso}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => pick(c.iso)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm outline-none transition-colors",
                    "hover:bg-[#F4F8F2] focus-visible:bg-[#F4F8F2]",
                    selected && "bg-[#E8F3DC]"
                  )}
                >
                  <span className="text-lg leading-none" aria-hidden>
                    {c.flag}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[#1B1B1B]/80">{c.name}</span>
                  <span className="tabular-nums text-[#1B1B1B]/45">{dialCode(c.iso)}</span>
                  {selected ? <Check className="h-4 w-4 text-[#1F4D36]" /> : <span className="w-4" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Celular con selector de país (indicativo) y número nacional.
 * Con `hiddenName` envía en el formulario el número en formato E.164 (+573001234567).
 */
export function PhoneInput({
  value,
  onChange,
  inputProps,
  hiddenName,
  className,
}: {
  value: PhoneValue;
  onChange: (value: PhoneValue) => void;
  /** Props del campo del número (name, id, aria-*), p. ej. las de useFormValidation().field(). */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
  /** Si se pasa, envía un campo oculto con este nombre y el número en E.164. */
  hiddenName?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex gap-2", className)}>
      <CountryPicker value={value.country} onChange={(country) => onChange({ country, number: value.number })} />
      <Input
        {...inputProps}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={examplePhone(value.country)}
        value={value.number}
        onChange={(e) => onChange({ country: value.country, number: e.target.value.replace(/[^\d\s()-]/g, "").slice(0, 20) })}
        className="min-w-0 flex-1"
      />
      {hiddenName && <input type="hidden" name={hiddenName} value={toE164(value) ?? ""} />}
    </div>
  );
}
