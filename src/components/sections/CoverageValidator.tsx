"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, MapPin, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { checkCoverage } from "@/lib/data/coverage";
import { cn } from "@/lib/utils";

export function CoverageValidator() {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [result, setResult] = useState<{
    message: string;
    eta?: string;
  } | null>(null);

  const handleVerify = async () => {
    setStatus("loading");
    setResult(null);
    await new Promise((r) => setTimeout(r, 900));
    const res = checkCoverage(address);
    setResult({ message: res.message, eta: res.eta });
    setStatus(res.covered ? "success" : "error");
  };

  return (
    <section id="cobertura" className="py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Cobertura"
          title="¿Llegamos a tu zona?"
          description="Ingresa tu dirección y verifica si entregamos en tu barrio. Cubrimos las principales zonas norte de Bogotá."
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto mt-12 max-w-4xl"
        >
          <div className="glass-card overflow-hidden rounded-3xl shadow-xl shadow-[#1F4D36]/5">
            <div className="grid lg:grid-cols-5">
              <div className="p-6 sm:p-8 lg:col-span-3">
                <div className="mb-6 flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1F4D36]/10">
                    <MapPin className="h-5 w-5 text-[#1F4D36]" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-[#1F4D36]">
                      Validador de cobertura
                    </p>
                    <p className="text-sm text-[#1B1B1B]/60">
                      Ej: Chapinero, Calle 100, Usaquén
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    placeholder="Tu dirección o barrio en Bogotá"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (status !== "idle") setStatus("idle");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                    aria-label="Dirección para verificar cobertura"
                  />
                  <Button
                    onClick={handleVerify}
                    disabled={!address.trim() || status === "loading"}
                    className="shrink-0 sm:min-w-[180px]"
                  >
                    {status === "loading" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      "Verificar cobertura"
                    )}
                  </Button>
                </div>

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
                        {result.eta && (
                          <p className="mt-1 text-[#1F4D36]/70">
                            Tiempo estimado: {result.eta}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="relative min-h-[220px] bg-gradient-to-br from-[#C5E1A5]/30 to-[#1F4D36]/10 lg:col-span-2 lg:min-h-0">
                <div className="absolute inset-4 overflow-hidden rounded-2xl border border-[#1F4D36]/10 bg-white/50">
                  <svg
                    viewBox="0 0 200 200"
                    className="h-full w-full"
                    aria-hidden
                  >
                    <defs>
                      <pattern
                        id="grid"
                        width="20"
                        height="20"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 20 0 L 0 0 0 20"
                          fill="none"
                          stroke="#1F4D36"
                          strokeWidth="0.3"
                          opacity="0.15"
                        />
                      </pattern>
                    </defs>
                    <rect width="200" height="200" fill="url(#grid)" />
                    <circle cx="100" cy="90" r="55" fill="#8BC34A" opacity="0.2" />
                    <circle
                      cx="100"
                      cy="90"
                      r="35"
                      fill="none"
                      stroke="#1F4D36"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      opacity="0.5"
                    />
                    <circle cx="100" cy="90" r="8" fill="#1F4D36" />
                    <text
                      x="100"
                      y="165"
                      textAnchor="middle"
                      fill="#1F4D36"
                      fontSize="10"
                      fontWeight="600"
                      opacity="0.7"
                    >
                      Zona norte · Bogotá
                    </text>
                  </svg>
                  <motion.div
                    className="absolute left-1/2 top-[42%] h-3 w-3 -translate-x-1/2 rounded-full bg-[#8BC34A] shadow-lg shadow-[#8BC34A]/50"
                    animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
