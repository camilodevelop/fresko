"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart/CartProvider";
import type { MenuItem } from "@/lib/data/products";

export function AddToCartButton({ item }: { item: MenuItem }) {
  const { addItem } = useCart();

  return (
    <Button size="sm" variant="secondary" type="button" onClick={() => addItem(item)}>
      <Plus className="h-4 w-4" />
      Agregar
    </Button>
  );
}
