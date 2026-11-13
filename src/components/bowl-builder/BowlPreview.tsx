"use client";

import { useEffect, useId, useMemo } from "react";
import { AnimatePresence, m } from "framer-motion";
import type { BuilderOption, BuilderStep } from "@/lib/data/builder";
import { cn } from "@/lib/utils";

/**
 * Bowl realista, armado como un poke de verdad:
 *   bowl vacío → base que llena la superficie → cada vegetal/proteína en SU porción (tajadas en
 *   perspectiva que no se pisan y la cubren entera: proteína al frente; los toppings también) →
 *   salsa en zigzag → borde delantero del bowl encima, para que la comida quede "dentro".
 * Todo en un SVG con las coordenadas de las imágenes del bowl (1536 × 1024).
 */
type BowlPreviewProps = {
  parts: Record<BuilderStep, BuilderOption[]>;
  className?: string;
  /** Oculta la etiqueta "N ingredientes" (vistas pequeñas). */
  compact?: boolean;
};

const W = 1536;
const H = 1024;
/** Superficie de la comida (dentro de la boca del bowl). */
const FOOD = { cx: 757, cy: 402, rx: 630, ry: 302 };
/** Punto desde el que salen las porciones (un poco atrás del centro: las del frente se ven más grandes). */
const HUB = { x: 757, y: 410 };
/** Puntos por arco: fijo, para que las porciones cambien de forma con animación. */
const ARC = 24;

/** Cuánto gira cada división del centro al borde (curva suave, no un corte recto de pizza). */
const SWIRL = 0.32;
/** Puntos por división (fijo, por la animación). */
const SPOKE = 10;
/** Solape entre porciones vecinas: la de adelante se mete un poco sobre la de atrás. */
const OVERLAP = 0.06;

/** Punto de la división que sale en el ángulo t, a la distancia r (0 = centro, 1 = borde). */
function spoke(t: number, r: number) {
  const th = t + SWIRL * r + 0.05 * Math.sin(r * 6 + t * 3) * r;
  return { x: HUB.x + FOOD.rx * r * Math.cos(th), y: HUB.y + FOOD.ry * r * Math.sin(th) };
}

/** Contorno de la porción entre dos ángulos, hasta la distancia rMax. */
function wedgePoints(a0: number, a1: number, rMax: number) {
  const pts = [];
  for (let i = 0; i <= SPOKE; i++) pts.push(spoke(a0, (rMax * i) / SPOKE));
  for (let i = 1; i < ARC; i++) pts.push(spoke(a0 + ((a1 - a0) * i) / ARC, rMax));
  for (let i = SPOKE; i >= 0; i--) pts.push(spoke(a1, (rMax * i) / SPOKE));
  return pts;
}

/** Porción estirada hacia afuera para que el montoncito asome sobre el borde. */
function wedgePath(a0: number, a1: number) {
  const pts = wedgePoints(a0 - OVERLAP, a1 + OVERLAP, 1.35);
  return pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + "Z";
}

/** Familia de color para no poner juntos dos ingredientes parecidos (p. ej. aguacate y pepino). */
const COLOR_HINTS: [RegExp, string][] = [
  [/aguacate|pepino|espinaca|lechuga|brocoli|edamame|mix/i, "verde"],
  [/tomate|atun|remolacha/i, "rojo"],
  [/salmon|zanahoria|camaron/i, "naranja"],
  [/maiz|huevo|mango|pina/i, "amarillo"],
  [/repollo|morado/i, "morado"],
  [/pollo|tofu|queso|crouton|nuez|nueces|semilla/i, "beige"],
];
function family(o: BuilderOption) {
  const key = `${o.bowlImage ?? ""} ${o.name}`.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return COLOR_HINTS.find(([re]) => re.test(key))?.[1] ?? o.id;
}

/** Ordena alrededor del bowl: proteínas primero (al frente) y luego alterna colores. */
function arrange(proteins: BuilderOption[], vegetables: BuilderOption[]) {
  const out = [...proteins];
  const rest = [...vegetables];
  while (rest.length) {
    const last = out[out.length - 1];
    const idx = last ? rest.findIndex((o) => family(o) !== family(last) && (out.length < 2 || family(o) !== family(out[0]))) : 0;
    out.push(...rest.splice(idx >= 0 ? idx : 0, 1));
  }
  return out;
}

type Placed = {
  option: BuilderOption;
  path: string;
  x: number;
  y: number;
  w: number;
  protein: boolean;
};

/**
 * Calcula la porción de cada ingrediente y lo escala para que la cubra entera (del centro al borde):
 * así se aprovecha todo el bowl y la base solo asoma en los bordes. Uno solo ocupa medio bowl.
 */
function layout(items: { option: BuilderOption; protein: boolean }[]): Placed[] {
  const n = items.length;
  if (!n) return [];
  // Cubre la caja (bx, by, bw, bh): la imagen va en un cuadro w×w alineada abajo y mide w/1.5 de alto.
  const cover = (bx: number, by: number, bw: number, bh: number, extra: number) => {
    const w = Math.max(bw, bh * 1.5) * extra;
    return { x: bx + bw / 2, y: by + bh / 2 + w * 0.62 - (w * 2) / 3, w };
  };
  const weights = items.map((i) => (i.protein ? 1.3 : 1));
  // Uno solo ocupa la mitad del bowl (la de adelante); la base se ve atrás.
  const total = n === 1 ? weights[0] * 2 : weights.reduce((s, v) => s + v, 0);
  // La primera (proteína) queda centrada al frente: ángulo 90° (abajo en pantalla).
  let a = Math.PI / 2 - (weights[0] / total) * Math.PI;
  return items.map((it, i) => {
    const span = (Math.PI * 2 * weights[i]) / total;
    // Caja de la porción dentro de la superficie (centro + arco).
    const pts = wedgePoints(a, a + span, 1);
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const bx = Math.min(...xs);
    const by = Math.min(...ys);
    const c = cover(bx, by, Math.max(...xs) - bx, Math.max(...ys) - by, 1.12);
    const placed = { ...it, path: wedgePath(a, a + span), ...c };
    a += span;
    return placed;
  });
}

const spring = { type: "spring" as const, stiffness: 170, damping: 24 };

export function BowlPreview({ parts, className, compact = false }: BowlPreviewProps) {
  const uid = useId().replace(/[:«»]/g, "");
  const base = parts.base[0] ?? null;
  const sauce = parts.sauce[0] ?? null;

  const placed = useMemo(() => {
    const order = arrange(parts.proteins, [...parts.vegetables, ...parts.toppings]).slice(0, 10);
    const proteinIds = new Set(parts.proteins.map((p) => p.id));
    // De atrás hacia adelante: los del frente se pintan encima.
    return layout(order.map((option) => ({ option, protein: proteinIds.has(option.id) }))).sort((p, q) => p.y - q.y);
  }, [parts.proteins, parts.vegetables, parts.toppings]);

  const total = placed.length + (base ? 1 : 0) + (sauce ? 1 : 0);
  const img = (o: BuilderOption | null) => o?.bowlImage ?? o?.image ?? "";

  useEffect(() => {
    for (const src of ["/images/bowl/bowl.webp", "/images/bowl/bowl-front.webp"]) new Image().src = src;
  }, []);

  return (
    <div className={cn("relative mx-auto w-full max-w-[560px] select-none", className)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block h-auto w-full"
        role="img"
        aria-label={total ? `Tu bowl con ${total} ingredientes` : "Bowl vacío"}
      >
        <defs>
          {/* Bordes de las porciones irregulares, como piezas acomodadas a mano (no un corte recto). */}
          <filter id={`${uid}-soft`} filterUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <feTurbulence type="fractalNoise" baseFrequency="0.016" numOctaves="2" seed="7" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="90" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <filter id={`${uid}-edge`}>
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id={`${uid}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#2A1E0A" floodOpacity="0.32" />
          </filter>
          <filter id={`${uid}-wall`}>
            <feGaussianBlur stdDeviation="26" />
          </filter>
          {/* Superficie de la comida (borde suave) */}
          <mask id={`${uid}-surface`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <ellipse cx={FOOD.cx} cy={FOOD.cy} rx={FOOD.rx} ry={FOOD.ry} fill="white" filter={`url(#${uid}-edge)`} />
          </mask>
          {/* Hasta dónde pueden llegar las porciones: dentro de la boca del bowl por los lados,
              y un poco por encima del borde trasero (la comida se ve amontonada). */}
          <mask id={`${uid}-piles`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <g filter={`url(#${uid}-edge)`} fill="white">
              <ellipse cx={FOOD.cx} cy={FOOD.cy} rx={FOOD.rx * 0.99} ry={FOOD.ry} />
              <ellipse cx={FOOD.cx} cy={FOOD.cy - 70} rx={FOOD.rx * 0.9} ry={FOOD.ry} />
            </g>
          </mask>
          {/* Una máscara por porción (la forma se anima al reacomodarse) */}
          {placed.map((p) => (
            <mask key={p.option.id} id={`${uid}-w-${p.option.id}`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
              <m.path initial={{ d: p.path }} animate={{ d: p.path }} transition={spring} fill="white" filter={`url(#${uid}-soft)`} />
            </mask>
          ))}
          <clipPath id={`${uid}-sauce`}>
            <m.rect
              key={sauce?.id ?? "none"}
              x="0"
              y="0"
              height={H}
              initial={{ width: 0 }}
              animate={{ width: W }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </clipPath>
        </defs>

        {/* Sombra en la mesa y bowl vacío */}
        <ellipse cx="760" cy="975" rx="340" ry="42" fill="#3C2A10" opacity="0.28" filter={`url(#${uid}-wall)`} />
        <image href="/images/bowl/bowl.webp" x="0" y="0" width={W} height={H} />

        {/* Base: llena la superficie */}
        <AnimatePresence>
          {base && (
            <m.g
              key={base.id}
              mask={`url(#${uid}-surface)`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <image
                href={img(base)}
                x={FOOD.cx - FOOD.rx * 1.08}
                y={FOOD.cy - FOOD.ry * 1.25}
                width={FOOD.rx * 2.16}
                height={FOOD.ry * 2.5}
                preserveAspectRatio="xMidYMid slice"
              />
            </m.g>
          )}
        </AnimatePresence>
        {/* Profundidad: la pared interior del bowl sombrea el borde de la comida */}
        {base && (
          <g mask={`url(#${uid}-surface)`} pointerEvents="none">
            <ellipse
              cx={FOOD.cx}
              cy={FOOD.cy}
              rx={FOOD.rx}
              ry={FOOD.ry}
              fill="none"
              stroke="#32280F"
              strokeOpacity="0.3"
              strokeWidth="46"
              filter={`url(#${uid}-wall)`}
            />
          </g>
        )}

        {/* Vegetales y proteínas, cada uno en su porción */}
        <g filter={`url(#${uid}-shadow)`}>
          <g mask={`url(#${uid}-piles)`}>
            <AnimatePresence>
              {placed.map((p) => (
                <m.g
                  key={p.option.id}
                  mask={`url(#${uid}-w-${p.option.id})`}
                  initial={{ opacity: 0, y: -40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.2 } }}
                  transition={spring}
                >
                  <m.image
                    href={img(p.option)}
                    preserveAspectRatio="xMidYMax meet"
                    initial={false}
                    animate={{
                      x: p.x - p.w / 2,
                      y: p.y - p.w * 0.62,
                      width: p.w,
                      height: p.w,
                    }}
                    transition={spring}
                  />
                </m.g>
              ))}
            </AnimatePresence>
          </g>
        </g>

        {/* Salsa en zigzag: se dibuja de izquierda a derecha */}
        {sauce?.bowlImage && (
          <g clipPath={`url(#${uid}-sauce)`}>
            <image
              href={sauce.bowlImage}
              x={757 - 360}
              y={390 - 230}
              width={720}
              height={460}
              preserveAspectRatio="xMidYMid meet"
              transform="rotate(6 757 390)"
            />
          </g>
        )}

        {/* Borde delantero del bowl: la comida queda adentro */}
        <image href="/images/bowl/bowl-front.webp" x="0" y="0" width={W} height={H} pointerEvents="none" />
      </svg>

      {!compact && (
        <m.p
          key={total}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-[2%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-4 py-1.5 text-xs font-medium text-[#1F4D36] shadow-md backdrop-blur-sm"
        >
          {total === 0 ? "Empieza eligiendo la base" : `${total} ingrediente${total > 1 ? "s" : ""}`}
        </m.p>
      )}
    </div>
  );
}

/** Precarga las imágenes del bowl de todas las opciones (al abrir el armador). */
export function usePreloadBowl(options: Record<BuilderStep, BuilderOption[]>) {
  useEffect(() => {
    const t = setTimeout(() => {
      for (const list of Object.values(options)) for (const o of list) if (o.bowlImage) new Image().src = o.bowlImage;
    }, 300);
    return () => clearTimeout(t);
  }, [options]);
}
