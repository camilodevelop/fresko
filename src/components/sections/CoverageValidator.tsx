"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  Loader2,
  MapPin,
  Navigation,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  checkCoverageByCoords,
  type LatLng,
} from "@/lib/data/coverage";
import { cn } from "@/lib/utils";
import type { MapSuggestion } from "@/components/coverage/CoverageMap";

const CoverageMap = dynamic(
  () => import("@/components/coverage/CoverageMap").then((m) => m.CoverageMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl bg-[#F4F8F2]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#1F4D36]/20 border-t-[#1F4D36]" />
      </div>
    ),
  }
);

type Status = "idle" | "loading" | "success" | "error";

export function CoverageValidator() {
  const [address, setAddress] = useState("");
  const [marker, setMarker] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [covered, setCovered] = useState<boolean | null>(null);
  const [result, setResult] = useState<{
    message: string;
    detail?: string;
  } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<MapSuggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [suggesting, setSuggesting] = useState(false);
  const skipSuggestRef = useRef(false);

  const applyCoords = useCallback((coords: LatLng, label?: string) => {
    setMarker(coords);
    setGeoError(null);
    setSuggestions([]);
    setHighlightedIndex(-1);
    const res = checkCoverageByCoords(coords);
    setCovered(res.covered);
    setResult({ message: res.message, detail: res.detail });
    setStatus(res.covered ? "success" : "error");
    if (label) {
      skipSuggestRef.current = true;
      setAddress(label);
    }
  }, []);

  useEffect(() => {
    if (skipSuggestRef.current) {
      skipSuggestRef.current = false;
      return;
    }

    const query = address.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setSuggesting(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSuggesting(true);
      try {
        const res = await fetch(
          `/api/geocode?suggest=1&q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        const data = (await res.json()) as { results?: MapSuggestion[] };
        setSuggestions(data.results ?? []);
        setHighlightedIndex((data.results?.length ?? 0) > 0 ? 0 : -1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        setSuggesting(false);
      }
    }, 380);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [address]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError("Tu navegador no soporta geolocalización.");
      return;
    }

    setStatus("loading");
    setGeoError(null);
    setResult(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        let label = "Tu ubicación actual";
        try {
          const res = await fetch(
            `/api/geocode?lat=${coords.lat}&lng=${coords.lng}`
          );
          if (res.ok) {
            const data = await res.json();
            if (data.label) label = data.label;
          }
        } catch {
          // keep default
        }

        applyCoords(coords, label);
      },
      (err) => {
        setStatus("idle");
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Permiso de ubicación denegado. Actívalo en el navegador o busca tu dirección."
            : "No pudimos obtener tu ubicación. Intenta de nuevo."
        );
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const selectSuggestion = (place: MapSuggestion) => {
    applyCoords({ lat: place.lat, lng: place.lng }, place.label);
  };

  const handleVerifyAddress = async () => {
    if (!address.trim()) return;

    if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      selectSuggestion(suggestions[highlightedIndex]);
      return;
    }

    setStatus("loading");
    setResult(null);
    setGeoError(null);
    setSuggestions([]);

    try {
      const res = await fetch(
        `/api/geocode?q=${encodeURIComponent(address)}`
      );
      if (res.ok) {
        const data = (await res.json()) as LatLng & { label?: string };
        if (Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
          applyCoords({ lat: data.lat, lng: data.lng }, data.label);
          return;
        }
      }
    } catch {
      // show map error below
    }

    setCovered(null);
    setMarker(null);
    setStatus("error");
    setResult({
      message: "No encontramos esa dirección en el mapa",
      detail:
        "Prueba con calle y carrera (ej. Calle 127 # 91, Suba) o toca el mapa para elegir el punto.",
    });
  };

  return (
    <section id="cobertura" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Cobertura · Envío gratis"
          title="¿Llegamos a tu zona?"
          description="Hoy cubrimos Suba y parte de Usaquén. Usa tu ubicación o busca tu dirección para ver si hay cobertura."
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-12 max-w-5xl"
        >
          <div className="overflow-hidden rounded-3xl border border-[#1F4D36]/8 bg-white/80 shadow-xl shadow-[#1F4D36]/5 backdrop-blur-sm">
            <div className="grid lg:grid-cols-2">
              <div className="p-6 sm:p-8">
                <div className="mb-6 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1F4D36]/10">
                    <MapPin className="h-5 w-5 text-[#1F4D36]" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-[#1F4D36]">
                      Validador de cobertura
                    </p>
                    <p className="text-sm text-[#1B1B1B]/60">
                      Ubicación GPS o búsqueda en el mapa
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  className="mb-4 w-full"
                  onClick={handleUseMyLocation}
                  disabled={status === "loading"}
                >
                  {status === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Navigation className="h-4 w-4" />
                  )}
                  Usar mi ubicación
                </Button>

                <div className="relative mb-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#1F4D36]/10" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#1B1B1B]/40">
                    o busca
                  </span>
                  <div className="h-px flex-1 bg-[#1F4D36]/10" />
                </div>

                <div className="relative">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <Input
                        placeholder="Busca un barrio, centro comercial o dirección"
                        className="pr-10"
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          if (status !== "idle") setStatus("idle");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown" && suggestions.length) {
                            e.preventDefault();
                            setHighlightedIndex((i) =>
                              i < suggestions.length - 1 ? i + 1 : 0
                            );
                            return;
                          }
                          if (e.key === "ArrowUp" && suggestions.length) {
                            e.preventDefault();
                            setHighlightedIndex((i) =>
                              i > 0 ? i - 1 : suggestions.length - 1
                            );
                            return;
                          }
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (
                              highlightedIndex >= 0 &&
                              suggestions[highlightedIndex]
                            ) {
                              selectSuggestion(suggestions[highlightedIndex]);
                              return;
                            }
                            handleVerifyAddress();
                          }
                          if (e.key === "Escape") setSuggestions([]);
                        }}
                        aria-label="Dirección para verificar cobertura"
                        aria-autocomplete="list"
                        autoComplete="off"
                      />
                      {suggesting && (
                        <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#1F4D36]/50" />
                      )}
                      <AnimatePresence>
                        {suggestions.length > 0 && (
                          <motion.ul
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 6 }}
                            className="absolute z-[500] mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-[#1F4D36]/10 bg-white py-1 shadow-lg"
                          >
                            {suggestions.map((place, index) => (
                              <li key={`${place.lat}-${place.lng}-${index}`}>
                                <button
                                  type="button"
                                  onMouseEnter={() => setHighlightedIndex(index)}
                                  onClick={() => selectSuggestion(place)}
                                  className={cn(
                                    "flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors",
                                    highlightedIndex === index
                                      ? "bg-[#C5E1A5]/40 text-[#1F4D36]"
                                      : "text-[#1B1B1B] hover:bg-[#F4F8F2]"
                                  )}
                                >
                                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#1F4D36]/70" />
                                  <span>
                                    <span className="block font-medium">
                                      {place.name || place.label.split(",")[0]}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-[#1B1B1B]/50">
                                      {place.label}
                                    </span>
                                  </span>
                                </button>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                    <Button
                      onClick={handleVerifyAddress}
                      disabled={!address.trim() || status === "loading"}
                      className="shrink-0 sm:min-w-[160px]"
                    >
                      {status === "loading" ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Verificando...
                        </>
                      ) : (
                        "Verificar"
                      )}
                    </Button>
                  </div>
                </div>

                    <p className="mt-3 text-xs text-[#1B1B1B]/45">
                      Ejemplo: Calle 127 # 91, Suba. También puedes tocar el mapa.
                    </p>

                <AnimatePresence mode="wait">
                  {geoError && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="mt-3 text-sm text-amber-800"
                    >
                      {geoError}
                    </motion.p>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {result && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={cn(
                        "mt-4 flex items-start gap-3 rounded-2xl p-4 text-sm",
                        status === "success"
                          ? "bg-[#C5E1A5]/40 text-[#1F4D36]"
                          : "bg-red-50 text-red-800"
                      )}
                    >
                      {status === "success" ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                      ) : (
                        <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
                      )}
                      <div>
                        <p className="font-medium">{result.message}</p>
                        {result.detail && (
                          <p
                            className={cn(
                              "mt-1",
                              status === "success"
                                ? "text-[#1F4D36]/70"
                                : "text-red-700/80"
                            )}
                          >
                            {result.detail}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative min-h-[300px] border-t border-[#1F4D36]/8 bg-[#F4F8F2] p-4 lg:min-h-[420px] lg:border-l lg:border-t-0">
                <CoverageMap
                  marker={marker}
                  covered={covered}
                  suggestions={suggestions}
                  highlightedIndex={highlightedIndex}
                  onMapClick={applyCoords}
                  onSuggestionClick={selectSuggestion}
                />
                <div className="pointer-events-none absolute bottom-6 left-6 right-6 z-[400] flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-semibold text-[#1F4D36] shadow-sm">
                    <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#8BC34A]" />
                    Zona de cobertura: Suba y parte de Usaquén
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
