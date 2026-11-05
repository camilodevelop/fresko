"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { SubscriptionManager as Manager } from "./SubscriptionManager";

// Usa la hora local para saber qué días siguen abiertos: se monta solo en el cliente.
const SubscriptionManager = dynamic(() => import("./SubscriptionManager").then((m) => m.SubscriptionManager), {
  ssr: false,
  loading: () => <div className="py-16 text-center text-sm text-[#1B1B1B]/40">Cargando tu calendario…</div>,
});

export function ManagerLoader(props: ComponentProps<typeof Manager>) {
  return <SubscriptionManager {...props} />;
}
