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

export const BUILDER_OPTIONS: Record<BuilderStep, BuilderOption[]> = {
  base: [
    {
      id: "lechuga",
      name: "Lechuga",
      emoji: "🥬",
      price: 0,
      layer: { type: "base", color: "#7CB342", size: 95, x: 50, y: 58, opacity: 0.85 },
    },
    {
      id: "espinaca",
      name: "Espinaca",
      emoji: "🌿",
      price: 500,
      layer: { type: "base", color: "#558B2F", size: 92, x: 50, y: 56, opacity: 0.9 },
    },
    {
      id: "mix",
      name: "Mix FRESKO",
      emoji: "🥗",
      price: 1000,
      layer: { type: "base", color: "#9CCC65", size: 98, x: 50, y: 57, opacity: 0.88 },
    },
  ],
  vegetables: [
    {
      id: "tomate",
      name: "Tomate",
      emoji: "🍅",
      price: 800,
      layer: { type: "veg", color: "#E53935", size: 14, x: 38, y: 48, rotate: -12 },
    },
    {
      id: "pepino",
      name: "Pepino",
      emoji: "🥒",
      price: 700,
      layer: { type: "veg", color: "#43A047", size: 12, x: 62, y: 50, rotate: 8 },
    },
    {
      id: "zanahoria",
      name: "Zanahoria",
      emoji: "🥕",
      price: 600,
      layer: { type: "veg", color: "#FB8C00", size: 11, x: 55, y: 44, rotate: 20 },
    },
    {
      id: "aguacate",
      name: "Aguacate",
      emoji: "🥑",
      price: 1500,
      layer: { type: "veg", color: "#689F38", size: 18, x: 45, y: 52, rotate: -5 },
    },
    {
      id: "maiz",
      name: "Maíz",
      emoji: "🌽",
      price: 700,
      layer: { type: "veg", color: "#FDD835", size: 10, x: 58, y: 46, rotate: 0 },
    },
    {
      id: "repollo",
      name: "Repollo",
      emoji: "🟣",
      price: 600,
      layer: { type: "veg", color: "#8E24AA", size: 13, x: 42, y: 45, rotate: 15 },
    },
  ],
  proteins: [
    {
      id: "pollo",
      name: "Pollo",
      emoji: "🍗",
      price: 3500,
      layer: { type: "protein", color: "#D4A574", size: 22, x: 50, y: 46, opacity: 0.95 },
    },
    {
      id: "atun",
      name: "Atún",
      emoji: "🐟",
      price: 4000,
      layer: { type: "protein", color: "#FF8A65", size: 20, x: 48, y: 47, opacity: 0.9 },
    },
    {
      id: "tofu",
      name: "Tofu",
      emoji: "🧈",
      price: 3000,
      layer: { type: "protein", color: "#FFF9C4", size: 18, x: 52, y: 48, opacity: 0.92 },
    },
    {
      id: "huevo",
      name: "Huevo",
      emoji: "🥚",
      price: 2000,
      layer: { type: "protein", color: "#FFEB3B", size: 14, x: 54, y: 44, opacity: 0.95 },
    },
  ],
  toppings: [
    {
      id: "queso",
      name: "Queso",
      emoji: "🧀",
      price: 1200,
      layer: { type: "topping", color: "#FFC107", size: 8, x: 40, y: 42 },
    },
    {
      id: "nueces",
      name: "Nueces",
      emoji: "🥜",
      price: 1500,
      layer: { type: "topping", color: "#8D6E63", size: 7, x: 60, y: 43 },
    },
    {
      id: "semillas",
      name: "Semillas",
      emoji: "✨",
      price: 800,
      layer: { type: "topping", color: "#A1887F", size: 6, x: 50, y: 40 },
    },
    {
      id: "croutons",
      name: "Croutons",
      emoji: "🍞",
      price: 900,
      layer: { type: "topping", color: "#D7CCC8", size: 7, x: 46, y: 41 },
    },
  ],
  sauce: [
    {
      id: "limon",
      name: "Limón",
      emoji: "🍋",
      price: 0,
      layer: { type: "sauce", color: "#FFF59D", size: 100, x: 50, y: 50, opacity: 0.25 },
    },
    {
      id: "vinagreta",
      name: "Vinagreta",
      emoji: "🫒",
      price: 0,
      layer: { type: "sauce", color: "#AED581", size: 100, x: 50, y: 50, opacity: 0.2 },
    },
    {
      id: "yogurt",
      name: "Yogurt",
      emoji: "🥛",
      price: 500,
      layer: { type: "sauce", color: "#FFFFFF", size: 100, x: 50, y: 50, opacity: 0.3 },
    },
  ],
};

export const BASE_BOWL_PRICE = 10000;
