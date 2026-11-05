"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type { SubscriptionPlanner as Planner } from "./SubscriptionPlanner";

// El calendario guarda el borrador en el navegador: se monta solo en el cliente.
const SubscriptionPlanner = dynamic(() => import("./SubscriptionPlanner").then((m) => m.SubscriptionPlanner), {
  ssr: false,
  loading: () => <div className="mx-auto max-w-6xl px-4 py-20 text-center text-sm text-[#1B1B1B]/40 sm:px-6">Cargando tu plan…</div>,
});

export function PlannerLoader(props: ComponentProps<typeof Planner>) {
  return <SubscriptionPlanner {...props} />;
}
