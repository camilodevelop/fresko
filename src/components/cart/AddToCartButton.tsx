"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartProvider";
import type { MenuItem } from "@/lib/data/products";
import { toast } from "@/lib/notify";

export function AddToCartButton({ item }: { item: MenuItem }) {
  const { addItem } = useCart();
  const router = useRouter();

  return (
    <Button
      size="sm"
      variant="secondary"
      type="button"
      onClick={() => {
        addItem(item);
        toast.success(`${item.name} agregado al carrito`, {
          action: { label: "Ver carrito", onClick: () => router.push("/carrito") },
        });
      }}
    >
      <Plus className="h-4 w-4" />
      Agregar
    </Button>
  );
}
