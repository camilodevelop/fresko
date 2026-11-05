import type { Nutrition } from "@/lib/nutrition";

export type BuilderStep = "base" | "vegetables" | "proteins" | "toppings" | "sauce";

export type BuilderOption = {
  id: string;
  name: string;
  emoji: string;
  price: number;
  /** Foto del ingrediente: con ella se arma la vista previa del bowl. */
  image: string | null;
  nutrition: Nutrition | null;
  allergens: string[];
};

export const BUILDER_STEPS: { id: BuilderStep; label: string; max?: number }[] = [
  { id: "base", label: "Elige tu base", max: 1 },
  { id: "vegetables", label: "Vegetales", max: 5 },
  { id: "proteins", label: "Proteínas", max: 2 },
  { id: "toppings", label: "Toppings", max: 3 },
  { id: "sauce", label: "Salsa", max: 1 },
];

// Las opciones y el precio base vienen de la base de datos (panel → Catálogo → Armador).
