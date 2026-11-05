"use client";

import { useEffect } from "react";

/**
 * Lleva la página arriba al montarse. Para pantallas a las que se llega por una acción
 * (confirmar pedido, pagar) desde el final de otra página: así lo importante se ve de una vez.
 */
export function ScrollToTop() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);
  return null;
}
