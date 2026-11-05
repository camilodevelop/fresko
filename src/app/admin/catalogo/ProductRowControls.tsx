"use client";

import { useOptimistic, useTransition } from "react";
import { Star } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notify";
import { setProductFlag } from "./actions";

export function ProductActiveSwitch({ id, active }: { id: string; active: boolean }) {
  const [value, setValue] = useOptimistic(active);
  const [pending, start] = useTransition();
  return (
    <Switch
      size="sm"
      label="Visible en el menú"
      checked={value}
      disabled={pending}
      onChange={(next) =>
        start(async () => {
          setValue(next);
          notify(await setProductFlag(id, "active", next));
        })
      }
    />
  );
}

export function ProductFeaturedToggle({ id, featured }: { id: string; featured: boolean }) {
  const [value, setValue] = useOptimistic(featured);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={value ? "Quitar de más pedidos" : "Mostrar en más pedidos"}
      title={value ? "En “Más pedidos” de la landing" : "Mostrar en “Más pedidos”"}
      onClick={() =>
        start(async () => {
          setValue(!value);
          notify(await setProductFlag(id, "featured", !value));
        })
      }
      className="rounded-lg p-1.5 hover:bg-[#F4F8F2]"
    >
      <Star className={cn("h-4 w-4", value ? "fill-amber-400 text-amber-400" : "text-[#1B1B1B]/25")} />
    </button>
  );
}
