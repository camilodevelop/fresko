"use client";

import { useId } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { BuilderOption, BuilderStep } from "@/lib/data/builder";

/** Vista superior del bowl: la base al fondo y cada ingrediente en su sección, con su foto. */
type BowlPreviewProps = {
  parts: Record<BuilderStep, BuilderOption[]>;
};

const C = 100; // centro del lienzo (viewBox 0 0 200 200)
const FOOD_R = 80; // radio del área de comida
const INNER_R = 30; // círculo central donde se ve la base

const point = (r: number, a: number) => [C + r * Math.cos(a), C + r * Math.sin(a)] as const;

/** Sector de anillo entre dos ángulos (radianes). */
function sectorPath(r1: number, r2: number, a1: number, a2: number) {
  const large = a2 - a1 > Math.PI ? 1 : 0;
  const [x1, y1] = point(r2, a1);
  const [x2, y2] = point(r2, a2);
  const [x3, y3] = point(r1, a2);
  const [x4, y4] = point(r1, a1);
  return `M${x1} ${y1} A${r2} ${r2} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r1} ${r1} 0 ${large} 0 ${x4} ${y4} Z`;
}

/** Anillo completo (un solo ingrediente). */
function ringPath(r1: number, r2: number) {
  return `M${C - r2} ${C} a${r2} ${r2} 0 1 0 ${2 * r2} 0 a${r2} ${r2} 0 1 0 ${-2 * r2} 0 Z M${C - r1} ${C} a${r1} ${r1} 0 1 1 ${2 * r1} 0 a${r1} ${r1} 0 1 1 ${-2 * r1} 0 Z`;
}

export function BowlPreview({ parts }: BowlPreviewProps) {
  const uid = useId().replace(/:/g, "");
  const base = parts.base[0] ?? null;
  const sauce = parts.sauce[0] ?? null;
  // Proteínas primero, luego vegetales y toppings: cada uno ocupa una sección.
  const items = [...parts.proteins, ...parts.vegetables, ...parts.toppings];
  const n = items.length;
  const total = n + (base ? 1 : 0) + (sauce ? 1 : 0);
  const start = -Math.PI / 2 - (n > 1 ? Math.PI / n : 0);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[360px]">
      <svg viewBox="0 0 200 200" className="h-full w-full drop-shadow-[0_18px_30px_rgba(31,77,54,0.18)]" role="img" aria-label="Vista previa de tu bowl">
        <defs>
          <radialGradient id={`${uid}-ceramic`} cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#F4F2EC" />
            <stop offset="100%" stopColor="#E4E1D8" />
          </radialGradient>
          <radialGradient id={`${uid}-inside`} cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#FBFAF6" />
            <stop offset="100%" stopColor="#ECE9E0" />
          </radialGradient>
          <radialGradient id={`${uid}-depth`} cx="50%" cy="50%" r="50%">
            <stop offset="78%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.22" />
          </radialGradient>
          <clipPath id={`${uid}-food`}>
            <circle cx={C} cy={C} r={FOOD_R} />
          </clipPath>
          <clipPath id={`${uid}-center`}>
            <circle cx={C} cy={C} r={INNER_R} />
          </clipPath>
          <clipPath id={`${uid}-sauce`}>
            <circle cx={170} cy={34} r={17} />
          </clipPath>
          {items.map((item, i) => (
            <clipPath key={item.id} id={`${uid}-s${i}`}>
              <path d={n === 1 ? ringPath(INNER_R, FOOD_R) : sectorPath(INNER_R, FOOD_R, start + (i * 2 * Math.PI) / n, start + ((i + 1) * 2 * Math.PI) / n)} />
            </clipPath>
          ))}
        </defs>

        {/* Bowl de cerámica */}
        <circle cx={C} cy={C} r={95} fill={`url(#${uid}-ceramic)`} stroke="#DAD6CB" strokeWidth={0.8} />
        <circle cx={C} cy={C} r={FOOD_R + 3} fill={`url(#${uid}-inside)`} stroke="#E2DED4" strokeWidth={0.6} />

        <g clipPath={`url(#${uid}-food)`}>
          {/* Base: cubre todo el fondo */}
          <AnimatePresence>
            {base && (
              <motion.g key={base.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
                <Food option={base} x={C - FOOD_R} y={C - FOOD_R} size={FOOD_R * 2} />
              </motion.g>
            )}
          </AnimatePresence>

          {/* Secciones */}
          <AnimatePresence>
            {items.map((item, i) => {
              const a1 = start + (i * 2 * Math.PI) / n;
              const a2 = start + ((i + 1) * 2 * Math.PI) / n;
              const mid = n === 1 ? -Math.PI / 2 : (a1 + a2) / 2;
              const rm = (INNER_R + FOOD_R) / 2;
              const [cx, cy] = point(rm, mid);
              // La foto se centra en la sección y se escala según su tamaño.
              const size = n <= 2 ? FOOD_R * 2 : Math.min(150, Math.max(70, rm * ((2 * Math.PI) / n) * 1.6));
              return (
                <motion.g
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  style={{ transformOrigin: `${cx}px ${cy}px` }}
                >
                  <g clipPath={`url(#${uid}-s${i})`}>
                    <Food option={item} x={n <= 2 ? C - FOOD_R : cx - size / 2} y={n <= 2 ? C - FOOD_R : cy - size / 2} size={size} labelAt={[cx, cy]} />
                  </g>
                  {n > 1 && (
                    <path d={sectorPath(INNER_R, FOOD_R, a1, a2)} fill="none" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={1.4} strokeLinejoin="round" />
                  )}
                  <title>{item.name}</title>
                </motion.g>
              );
            })}
          </AnimatePresence>

          {/* Centro: se ve la base */}
          {n > 0 && (
            <circle cx={C} cy={C} r={INNER_R} fill="none" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={1.4} />
          )}
          {/* Profundidad del bowl */}
          <circle cx={C} cy={C} r={FOOD_R} fill={`url(#${uid}-depth)`} pointerEvents="none" />
        </g>

        {!base && n === 0 && (
          <text x={C} y={C + 3} textAnchor="middle" fontSize={8} fill="#1F4D36" fillOpacity={0.4} fontWeight={600}>
            Elige tu base
          </text>
        )}

        {/* Brillo del borde */}
        <path d="M 30 62 A 82 82 0 0 1 92 14" fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" opacity={0.9} />

        {/* Salsa en un recipiente pequeño */}
        <AnimatePresence>
          {sauce && (
            <motion.g
              key={sauce.id}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              style={{ transformOrigin: "170px 34px" }}
            >
              <circle cx={170} cy={34} r={23} fill={`url(#${uid}-ceramic)`} stroke="#DAD6CB" strokeWidth={0.8} />
              <g clipPath={`url(#${uid}-sauce)`}>
                <Food option={sauce} x={153} y={17} size={34} labelAt={[170, 34]} />
                <circle cx={170} cy={34} r={17} fill="none" stroke="#000" strokeOpacity={0.12} strokeWidth={2} />
              </g>
              <title>{sauce.name}</title>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      <motion.p
        key={total}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-4 py-1.5 text-xs font-medium text-[#1F4D36] shadow-md backdrop-blur-sm"
      >
        {total === 0 ? "Selecciona ingredientes" : `${total} ingrediente${total > 1 ? "s" : ""}`}
      </motion.p>
    </div>
  );
}

/** Foto del ingrediente; si no tiene, un fondo suave con su emoji. */
function Food({ option, x, y, size, labelAt }: { option: BuilderOption; x: number; y: number; size: number; labelAt?: readonly [number, number] }) {
  if (option.image) {
    return <image href={option.image} x={x} y={y} width={size} height={size} preserveAspectRatio="xMidYMid slice" />;
  }
  const [lx, ly] = labelAt ?? [x + size / 2, y + size / 2];
  return (
    <>
      <rect x={x} y={y} width={size} height={size} fill="#EEF3E8" />
      <text x={lx} y={ly + 5} textAnchor="middle" fontSize={labelAt ? 14 : 28}>
        {option.emoji}
      </text>
    </>
  );
}
