"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, Loader2, MapPin, Search, XCircle } from "lucide-react";
import { saveAddress, type AddressInput } from "@/app/actions/addresses";
import type { MapSuggestion } from "@/components/coverage/CoverageMap";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormValidation } from "@/hooks/use-form-validation";
import { findZone, type CoverageZone, type LatLng } from "@/lib/data/coverage";
import { notify } from "@/lib/notify";
import { first, rules } from "@/lib/validation";
import { cn } from "@/lib/utils";

const CoverageMap = dynamic(() => import("@/components/coverage/CoverageMap").then((m) => m.CoverageMap), {
  ssr: false,
  loading: () => <div className="h-full min-h-[260px] animate-pulse rounded-2xl bg-[#F4F8F2]" />,
});

const LABELS = ["Casa", "Oficina", "Otro"];

export type AddressFormValue = AddressInput;

export function AddressForm({
  zones,
  initial,
  onSaved,
  onCancel,
  submitLabel = "Guardar dirección",
}: {
  zones: CoverageZone[];
  initial?: Partial<AddressInput>;
  onSaved?: (id: string) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [label, setLabel] = useState(initial?.label ?? "Casa");
  const [customLabel, setCustomLabel] = useState(initial?.label && !LABELS.includes(initial.label) ? initial.label : "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [details, setDetails] = useState(initial?.details ?? "");
  const [point, setPoint] = useState<LatLng | null>(initial?.lat !== undefined && initial?.lng !== undefined ? { lat: initial.lat, lng: initial.lng } : null);
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [suggestions, setSuggestions] = useState<MapSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, start] = useTransition();
  const skipSearch = useRef(true);

  const finalLabel = label === "Otro" ? customLabel.trim() : label;
  const zone = point ? findZone(point, zones) : undefined;

  const v = useFormValidation(
    () => ({
      label: label === "Otro" ? rules.required(customLabel, "Escribe un nombre para la dirección.") : null,
      address: first(rules.required(address, "Escribe la dirección."), rules.minLength(address, 5, "Escribe la dirección completa.")),
      point: !point ? "Busca la dirección o toca el mapa para ubicarla." : !zone ? "Esta ubicación está fuera de nuestra cobertura." : null,
    }),
    () => ({ label, customLabel, address, point, zone }),
    `addr-${initial?.id ?? "new"}`
  );

  // Sugerencias mientras se escribe (con pausa para no saturar el buscador).
  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    const q = address.trim();
    if (q.length < 4) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?suggest=1&q=${encodeURIComponent(q)}`, { signal: controller.signal });
        const data = res.ok ? await res.json() : { results: [] };
        setSuggestions((data.results ?? []).slice(0, 5));
      } catch {
        // búsqueda cancelada
      } finally {
        setSearching(false);
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [address]);

  const pick = (place: MapSuggestion) => {
    skipSearch.current = true;
    setAddress(place.label.split(",").slice(0, 2).join(",").trim());
    setPoint({ lat: place.lat, lng: place.lng });
    setSuggestions([]);
    requestAnimationFrame(v.revalidate);
  };

  const onMapClick = async (coords: LatLng) => {
    setPoint(coords);
    setSuggestions([]);
    requestAnimationFrame(v.revalidate);
    if (address.trim().length >= 5) return;
    try {
      const res = await fetch(`/api/geocode?lat=${coords.lat}&lng=${coords.lng}`);
      if (res.ok) {
        const place = await res.json();
        if (place?.label) {
          skipSearch.current = true;
          setAddress(String(place.label).split(",").slice(0, 2).join(",").trim());
        }
      }
    } catch {
      // sin dirección sugerida
    }
  };

  const submit = () =>
    start(async () => {
      const r = await saveAddress({
        id: initial?.id,
        label: finalLabel,
        address,
        details,
        lat: point!.lat,
        lng: point!.lng,
        isDefault,
      });
      if (notify(r) && r.id) onSaved?.(r.id);
    });

  return (
    <form {...v.formProps(submit)} className="grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-[#1B1B1B]/60">Nombre</p>
          <div className="flex flex-wrap gap-1.5">
            {LABELS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={label === l}
                onClick={() => setLabel(l)}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-semibold transition-colors",
                  label === l ? "bg-[#1F4D36] text-white" : "bg-[#F4F8F2] text-[#1F4D36] hover:bg-[#E8F3DC]"
                )}
              >
                {l}
              </button>
            ))}
          </div>
          {label === "Otro" && (
            <div className="mt-2">
              <Input {...v.field("label")} className="h-11" value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} placeholder="Casa de mamá, Gimnasio…" maxLength={40} aria-label="Nombre de la dirección" />
              <FieldError name={v.idFor("label")} error={v.error("label")} />
            </div>
          )}
        </div>

        <Field label="Dirección" name={v.idFor("address")} error={v.error("address")} hint="Escribe calle y número; elige una sugerencia o toca el mapa.">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#1B1B1B]/35" />
            <Input
              {...v.field("address")}
              className="h-11 pl-10 pr-10"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Calle 38 Sur # 78-20"
              autoComplete="street-address"
              maxLength={200}
            />
            {searching && <Loader2 className="absolute right-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 animate-spin text-[#1F4D36]/50" />}
            {suggestions.length > 0 && (
              <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-[#1F4D36]/10">
                {suggestions.map((s, i) => (
                  <li key={`${s.lat}-${s.lng}-${i}`}>
                    <button
                      type="button"
                      onClick={() => pick(s)}
                      className="flex w-full items-start gap-2 px-4 py-2.5 text-left text-sm hover:bg-[#F4F8F2]"
                    >
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1F4D36]/50" />
                      <span className="text-[#1B1B1B]/75">{s.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Field>

        <Field label="Detalles" optional name={v.idFor("details")} hint="Apartamento, torre, conjunto o indicaciones para el domiciliario.">
          <Input {...v.field("details")} className="h-11" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Apto 502, torre 3" maxLength={200} />
        </Field>

        <label className="flex items-center gap-2 text-sm font-medium text-[#1B1B1B]/70">
          <input type="checkbox" className="h-4 w-4 accent-[#1F4D36]" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
          Usar como dirección principal
        </label>

      </div>

      <div>
        <div
          tabIndex={-1}
          aria-invalid={v.error("point") ? true : undefined}
          className={cn("relative h-[280px] overflow-hidden rounded-2xl outline-none ring-1 lg:h-full lg:min-h-[320px]", v.error("point") ? "ring-2 ring-red-300" : "ring-[#1F4D36]/10")}
        >
          <CoverageMap
            zones={zones}
            marker={point}
            covered={point ? Boolean(zone) : null}
            suggestions={suggestions}
            onMapClick={onMapClick}
            onSuggestionClick={pick}
          />
        </div>
        {point && !v.error("point") && (
          <p className={cn("mt-2 flex items-center gap-1.5 text-xs font-semibold", zone ? "text-[#2E6B1F]" : "text-red-600")}>
            {zone ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {zone ? `En cobertura · ${zone.name}` : "Fuera de cobertura"}
          </p>
        )}
        <FieldError name={v.idFor("point")} error={v.error("point")} />
      </div>

      {/* Debajo del mapa: en móvil primero se ubica el punto y luego se guarda. */}
      <div className="flex flex-wrap gap-2 lg:col-span-2">
        <Button type="submit" disabled={pending} className="max-sm:flex-1">
          {pending ? "Guardando…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
