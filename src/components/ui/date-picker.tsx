"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];
const MONTH = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
const LABEL = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const FULL = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** Fechas como "AAAA-MM-DD" (sin zona horaria), igual que un input type="date". */
const toIso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m: m - 1, d };
};
const asDate = (iso: string) => {
  const { y, m, d } = parse(iso);
  return new Date(Date.UTC(y, m, d));
};
const todayIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
const addDays = (iso: string, n: number) => {
  const t = asDate(iso);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
};

/**
 * Selector de fecha con calendario propio (el nativo del navegador se ve distinto en cada equipo).
 * Teclado: flechas para moverse por días/semanas, Enter para elegir, Esc para cerrar.
 */
export function DatePicker({
  value,
  onChange,
  placeholder = "Elegir fecha",
  clearable = false,
  className,
  "aria-label": ariaLabel = "Fecha",
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  clearable?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const today = todayIso();
  const start = value || today;
  const [view, setView] = useState(() => ({ y: parse(start).y, m: parse(start).m }));
  const [focus, setFocus] = useState(start);
  const box = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const id = useId();

  // Cerrar al hacer clic afuera.
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  // Mantener el foco del teclado en el día activo.
  useEffect(() => {
    if (open) grid.current?.querySelector<HTMLButtonElement>(`[data-day="${focus}"]`)?.focus();
  }, [open, focus, view]);

  const openAt = (iso: string) => {
    const { y, m } = parse(iso);
    setView({ y, m });
    setFocus(iso);
    setOpen(true);
  };
  const pick = (iso: string) => {
    onChange(iso);
    setOpen(false);
  };
  const moveFocus = (iso: string) => {
    const { y, m } = parse(iso);
    setFocus(iso);
    setView({ y, m });
  };
  const shiftMonth = (n: number) => {
    const d = new Date(Date.UTC(view.y, view.m + n, 1));
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
  };

  // Celdas del mes: semanas de lunes a domingo, con días del mes anterior/siguiente atenuados.
  const first = new Date(Date.UTC(view.y, view.m, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => addDays(toIso(view.y, view.m, 1), i - lead));

  const label = value ? (value === today ? `Hoy · ${LABEL.format(asDate(value))}` : LABEL.format(asDate(value))) : placeholder;

  return (
    <div ref={box} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => (open ? setOpen(false) : openAt(start))}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-full border bg-[#F8F7F2] pl-3 pr-3 text-sm transition",
          open ? "border-[#8BC34A] bg-white" : "border-[#1F4D36]/12 hover:border-[#1F4D36]/25",
          clearable && value && "pr-8"
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-[#1F4D36]/60" />
        <span className={cn("truncate first-letter:uppercase", value ? "font-medium text-[#1F4D36]" : "text-[#1B1B1B]/40")}>{label}</span>
      </button>
      {clearable && value && (
        <button
          type="button"
          aria-label="Quitar fecha"
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#1B1B1B]/35 hover:text-[#1F4D36]"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {open && (
        <div
          id={id}
          role="dialog"
          aria-label="Calendario"
          className="absolute right-0 z-40 mt-2 w-[296px] rounded-3xl border border-[#1F4D36]/10 bg-white p-4 shadow-[0_18px_50px_-12px_rgba(31,77,54,0.35)]"
          onKeyDown={(e) => {
            const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
            if (step) {
              e.preventDefault();
              moveFocus(addDays(focus, step));
            } else if (e.key === "Escape") {
              e.preventDefault();
              setOpen(false);
              box.current?.querySelector("button")?.focus();
            }
          }}
        >
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Mes anterior"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#1F4D36] hover:bg-[#F4F8F2]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="font-display text-sm font-bold text-[#1F4D36] first-letter:uppercase" aria-live="polite">
              {MONTH.format(first)}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Mes siguiente"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#1F4D36] hover:bg-[#F4F8F2]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/35">
            {WEEKDAYS.map((w, i) => (
              <span key={i} className="pb-1.5">
                {w}
              </span>
            ))}
          </div>
          <div ref={grid} role="grid" className="grid grid-cols-7 gap-y-1">
            {cells.map((iso) => {
              const { m, d } = parse(iso);
              const outside = m !== view.m;
              const selected = iso === value;
              const isToday = iso === today;
              return (
                <button
                  key={iso}
                  type="button"
                  data-day={iso}
                  tabIndex={iso === focus ? 0 : -1}
                  aria-label={FULL.format(asDate(iso))}
                  aria-pressed={selected}
                  onClick={() => pick(iso)}
                  className={cn(
                    "relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums outline-none transition",
                    "focus-visible:ring-2 focus-visible:ring-[#8BC34A]",
                    selected
                      ? "bg-[#1F4D36] font-bold text-white shadow-sm"
                      : outside
                        ? "text-[#1B1B1B]/25 hover:bg-[#F4F8F2]"
                        : "text-[#1B1B1B]/75 hover:bg-[#E8F3DC] hover:text-[#1F4D36]",
                    isToday && !selected && "font-bold text-[#1F4D36] ring-1 ring-inset ring-[#8BC34A]"
                  )}
                >
                  {d}
                  {isToday && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#8BC34A]" />}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#1F4D36]/[0.06] pt-3">
            <button type="button" onClick={() => pick(today)} className="rounded-full bg-[#E8F3DC] px-3.5 py-1.5 text-xs font-semibold text-[#1F4D36] hover:bg-[#d9ecc6]">
              Hoy
            </button>
            <button type="button" onClick={() => pick(addDays(today, 1))} className="rounded-full px-3 py-1.5 text-xs font-semibold text-[#1F4D36]/70 hover:bg-[#F4F8F2] hover:text-[#1F4D36]">
              Mañana
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const SHORT = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", timeZone: "UTC" });
const SHORT_Y = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/**
 * Rango de fechas en un solo calendario: el primer toque es "desde", el segundo "hasta" y se
 * aplica de una vez (sin botón). Al pasar el cursor se ve el rango que va a quedar.
 */
export function DateRangePicker({
  from,
  to,
  onChange,
  max,
  className,
  active = true,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
  /** Último día que se puede elegir (por ejemplo, hoy). */
  max?: string;
  className?: string;
  /** Resaltado cuando el rango elegido no es uno de los rápidos. */
  active?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [view, setView] = useState(() => ({ y: parse(to).y, m: parse(to).m }));
  const box = useRef<HTMLDivElement>(null);
  const id = useId();
  const today = todayIso();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const toggle = () => {
    if (!open) {
      setView({ y: parse(to).y, m: parse(to).m });
      setStart(null);
      setHover(null);
    }
    setOpen(!open);
  };
  const shiftMonth = (n: number) => {
    const d = new Date(Date.UTC(view.y, view.m + n, 1));
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() });
  };
  const pick = (iso: string) => {
    if (!start) {
      setStart(iso);
      return;
    }
    const [a, b] = iso < start ? [iso, start] : [start, iso];
    setStart(null);
    setOpen(false);
    onChange(a, b);
  };

  // Rango que se ve: el elegido, o el que se está armando (inicio → cursor).
  const [lo, hi] = start ? [start, hover ?? start].sort() : [from, to];
  const first = new Date(Date.UTC(view.y, view.m, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((lead + daysInMonth) / 7) * 7 }, (_, i) => addDays(toIso(view.y, view.m, 1), i - lead));
  const sameYear = from.slice(0, 4) === to.slice(0, 4) && from.slice(0, 4) === today.slice(0, 4);
  const fmt = (d: string) => (sameYear ? SHORT : SHORT_Y).format(asDate(d));
  const label = from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`;

  return (
    <div ref={box} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`Rango de fechas: ${label}`}
        onClick={toggle}
        className={cn(
          "flex h-9 items-center gap-2 rounded-full border bg-white px-3.5 text-xs font-semibold transition",
          open || active ? "border-[#1F4D36] text-[#1F4D36]" : "border-[#1F4D36]/12 text-[#1F4D36]/70 hover:border-[#1F4D36]/30"
        )}
      >
        <CalendarDays className="h-4 w-4 text-[#1F4D36]/60" />
        {label}
      </button>

      {open && (
        <div
          id={id}
          role="dialog"
          aria-label="Elegir rango de fechas"
          className="absolute left-0 z-40 mt-2 w-[296px] rounded-3xl border border-[#1F4D36]/10 bg-white p-4 shadow-[0_18px_50px_-12px_rgba(31,77,54,0.35)] sm:left-auto sm:right-0"
        >
          <p className="mb-2 text-center text-[11px] font-semibold text-[#1B1B1B]/45" aria-live="polite">
            {start ? "Ahora toca el día final" : "Toca el día inicial"}
          </p>
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => shiftMonth(-1)} aria-label="Mes anterior" className="flex h-8 w-8 items-center justify-center rounded-full text-[#1F4D36] hover:bg-[#F4F8F2]">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="font-display text-sm font-bold text-[#1F4D36] first-letter:uppercase">{MONTH.format(first)}</p>
            <button type="button" onClick={() => shiftMonth(1)} aria-label="Mes siguiente" className="flex h-8 w-8 items-center justify-center rounded-full text-[#1F4D36] hover:bg-[#F4F8F2]">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/35">
            {WEEKDAYS.map((w, i) => (
              <span key={i} className="pb-1.5">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => setHover(null)}>
            {cells.map((iso) => {
              const { m, d } = parse(iso);
              const outside = m !== view.m;
              const disabled = Boolean(max && iso > max);
              const inRange = iso >= lo && iso <= hi;
              const edge = iso === lo || iso === hi;
              const isToday = iso === today;
              return (
                <div
                  key={iso}
                  className={cn(
                    "flex h-9 items-center justify-center",
                    inRange && !outside && "bg-[#E8F3DC]",
                    iso === lo && "rounded-l-full",
                    iso === hi && "rounded-r-full"
                  )}
                >
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={FULL.format(asDate(iso))}
                    aria-pressed={edge}
                    onClick={() => pick(iso)}
                    onMouseEnter={() => start && setHover(iso)}
                    className={cn(
                      "relative flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums outline-none transition focus-visible:ring-2 focus-visible:ring-[#8BC34A]",
                      disabled
                        ? "cursor-not-allowed text-[#1B1B1B]/15"
                        : edge && !outside
                          ? "bg-[#1F4D36] font-bold text-white shadow-sm"
                          : outside
                            ? "text-[#1B1B1B]/25 hover:bg-[#F4F8F2]"
                            : inRange
                              ? "text-[#1F4D36] hover:bg-white"
                              : "text-[#1B1B1B]/75 hover:bg-[#E8F3DC] hover:text-[#1F4D36]",
                      isToday && !edge && "font-bold text-[#1F4D36]"
                    )}
                  >
                    {d}
                    {isToday && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-[#8BC34A]" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
