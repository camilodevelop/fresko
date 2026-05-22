"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { BuilderOption } from "@/lib/data/builder";

type BowlPreviewProps = {
  layers: BuilderOption[];
};

export function BowlPreview({ layers }: BowlPreviewProps) {
  const baseLayers = layers.filter((l) => l.layer.type === "base");
  const vegLayers = layers.filter((l) => l.layer.type === "veg");
  const proteinLayers = layers.filter((l) => l.layer.type === "protein");
  const toppingLayers = layers.filter((l) => l.layer.type === "topping");
  const sauceLayers = layers.filter((l) => l.layer.type === "sauce");

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px]">
      <div className="absolute inset-6 rounded-full bg-gradient-to-b from-[#C5E1A5]/30 to-transparent blur-xl" />

      <div className="relative h-full w-full">
        <Image
          src="/images/bowl.png"
          alt="Vista previa de tu bowl"
          fill
          className="relative z-0 object-contain"
          sizes="340px"
          priority
        />

        <div className="absolute inset-[12%] z-10 overflow-hidden rounded-full">
          <AnimatePresence>
            {baseLayers.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: item.layer.opacity ?? 0.85, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                className="absolute rounded-full"
                style={{
                  left: `${item.layer.x - item.layer.size / 2}%`,
                  top: `${item.layer.y - item.layer.size / 2}%`,
                  width: `${item.layer.size}%`,
                  height: `${item.layer.size}%`,
                  backgroundColor: item.layer.color,
                  filter: "blur(2px)",
                }}
              />
            ))}

            {vegLayers.map((item, i) => (
              <IngredientDot key={item.id} item={item} index={i} />
            ))}
            {proteinLayers.map((item, i) => (
              <IngredientDot key={item.id} item={item} index={i} sizeBoost={1.2} />
            ))}
            {toppingLayers.map((item, i) => (
              <IngredientDot key={item.id} item={item} index={i} sizeBoost={0.9} />
            ))}

            {sauceLayers.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: item.layer.opacity ?? 0.25 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle at 50% 40%, ${item.layer.color} 0%, transparent 70%)`,
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      <motion.p
        key={layers.length}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white/90 px-4 py-1.5 text-xs font-medium text-[#1F4D36] shadow-md backdrop-blur-sm"
      >
        {layers.length === 0
          ? "Selecciona ingredientes"
          : `${layers.length} ingrediente${layers.length > 1 ? "s" : ""}`}
      </motion.p>
    </div>
  );
}

function IngredientDot({
  item,
  index,
  sizeBoost = 1,
}: {
  item: BuilderOption;
  index: number;
  sizeBoost?: number;
}) {
  const size = item.layer.size * sizeBoost;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0, y: -20 }}
      animate={{
        opacity: item.layer.opacity ?? 1,
        scale: 1,
        y: 0,
        rotate: item.layer.rotate ?? 0,
      }}
      exit={{ opacity: 0, scale: 0 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 22,
        delay: index * 0.05,
      }}
      className="absolute flex items-center justify-center rounded-full shadow-md ring-2 ring-white/50"
      style={{
        left: `${item.layer.x - size / 2}%`,
        top: `${item.layer.y - size / 2}%`,
        width: `${size}%`,
        height: `${size}%`,
        backgroundColor: item.layer.color,
      }}
    >
      <span className="text-[10px] sm:text-xs">{item.emoji}</span>
    </motion.div>
  );
}
