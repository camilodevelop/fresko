export type BuilderStep = "base" | "vegetables" | "proteins" | "toppings" | "sauce";

export type BuilderOption = {
  id: string;
  name: string;
  emoji: string;
  price: number;
  /** Visual layer config for bowl preview */
  layer: {
    type: "base" | "veg" | "protein" | "topping" | "sauce";
    color: string;
    size: number;
    x: number;
    y: number;
    rotate?: number;
    opacity?: number;
  };
};

export const BUILDER_STEPS: { id: BuilderStep; label: string; max?: number }[] = [
  { id: "base", label: "Elige tu base", max: 1 },
  { id: "vegetables", label: "Vegetales", max: 5 },
  { id: "proteins", label: "Proteínas", max: 2 },
  { id: "toppings", label: "Toppings", max: 3 },
  { id: "sauce", label: "Salsa", max: 1 },
];

// Las opciones y el precio base vienen de la base de datos (panel → Catálogo → Armador).
