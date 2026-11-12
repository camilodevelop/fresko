"use client";

import { LazyMotion } from "framer-motion";

const loadFeatures = () => import("./motion-features").then((mod) => mod.default);

/**
 * Animaciones livianas: los componentes usan `m.*` y el motor de animación se descarga aparte,
 * después de mostrar la página (strict avisa si alguien usa `motion.*`, que lo cargaría completo).
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
