"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  Check,
  ImagePlus,
  Images,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  FALLBACK_PRODUCT_IMAGE,
  isCutoutImage,
  STOCK_PRODUCT_IMAGES,
} from "@/lib/product-image";
import { cn } from "@/lib/utils";

/** Foto del producto: vista previa, subir (clic o arrastrar), galería incluida y quitar. */
export function ProductImagePicker({
  value,
  uploading,
  onUpload,
  onChange,
  gallery: images = STOCK_PRODUCT_IMAGES,
  fallback = FALLBACK_PRODUCT_IMAGE,
  emptyLabel = "Sin foto · se usa la genérica",
}: {
  value: string | null;
  uploading: boolean;
  onUpload: (file?: File) => void;
  onChange: (url: string | null) => void;
  /** Fotos incluidas para elegir rápido. */
  gallery?: { src: string; label: string }[];
  /** Imagen que se muestra cuando no hay foto (null = recuadro vacío). */
  fallback?: string | null;
  emptyLabel?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [gallery, setGallery] = useState(false);
  const src = value || fallback;

  return (
    <div>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onUpload(e.dataTransfer.files?.[0]);
        }}
        aria-label={value ? "Cambiar foto" : "Subir foto"}
        className={cn(
          "group relative block aspect-square w-full overflow-hidden rounded-2xl border bg-[radial-gradient(ellipse_80%_70%_at_50%_42%,#FFFFFF_0%,#F6F9F3_65%,#EAF2E3_100%)] transition-all",
          dragging
            ? "border-2 border-dashed border-[#8BC34A] ring-4 ring-[#8BC34A]/20"
            : "border-[#1F4D36]/10 hover:border-[#8BC34A]",
        )}
      >
        {src && (
          <Image
            src={src}
            alt=""
            fill
            sizes="220px"
            className={cn(
              isCutoutImage(src) ? "object-contain p-4" : "object-cover",
              !value && "opacity-45 grayscale-[30%]",
            )}
          />
        )}
        {!value && src && (
          <span className="absolute inset-x-3 top-3 rounded-full bg-white/90 px-2 py-1 text-center text-[10px] font-semibold text-[#1B1B1B]/55 shadow-sm">
            {emptyLabel}
          </span>
        )}
        <span
          className={cn(
            "absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#10291D]/55 text-sm font-semibold text-white transition-opacity",
            dragging || !value
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100",
            !value && !dragging && "bg-transparent text-[#1F4D36]",
          )}
        >
          {dragging ? (
            <>
              <Upload className="h-6 w-6" /> Suelta la imagen
            </>
          ) : (
            <>
              <ImagePlus className="h-6 w-6" />{" "}
              {value ? "Cambiar foto" : "Subir foto"}
            </>
          )}
        </span>
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/75">
            <Loader2 className="h-6 w-6 animate-spin text-[#1F4D36]" />
          </span>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          onUpload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <div className="mt-2 flex gap-2">
        {images.length > 0 && (
          <button
            type="button"
            onClick={() => setGallery((g) => !g)}
            aria-expanded={gallery}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs font-semibold transition-colors",
              gallery
                ? "border-[#1F4D36] bg-[#1F4D36] text-white"
                : "border-[#1F4D36]/15 text-[#1F4D36] hover:bg-[#F4F8F2]",
            )}
          >
            <Images className="h-3.5 w-3.5" /> Galería
          </button>
        )}
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#1F4D36]/15 px-2.5 py-1.5 text-xs font-semibold text-[#1B1B1B]/55 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" /> Quitar
          </button>
        )}
      </div>

      {gallery && (
        <div className="mt-2 grid grid-cols-4 gap-1.5 rounded-2xl border border-[#1F4D36]/10 bg-white p-2">
          {images.map((img) => {
            const selected = value === img.src;
            return (
              <button
                key={img.src}
                type="button"
                title={img.label}
                aria-label={`Usar foto: ${img.label}`}
                aria-pressed={selected}
                onClick={() => {
                  onChange(img.src);
                  setGallery(false);
                }}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-lg ring-offset-1 transition",
                  selected
                    ? "ring-2 ring-[#8BC34A]"
                    : "hover:ring-2 hover:ring-[#1F4D36]/30",
                )}
              >
                <Image
                  src={img.src}
                  alt=""
                  fill
                  sizes="48px"
                  className="object-cover"
                />
                {selected && (
                  <span className="absolute inset-0 flex items-center justify-center bg-[#1F4D36]/45">
                    <Check className="h-4 w-4 text-white" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-[11px] leading-snug text-[#1B1B1B]/40">
        Haz clic o arrastra una imagen. Foto cuadrada de al menos 800 px (JPG,
        PNG o WebP). Los cambios se aplican al guardar.
      </p>
    </div>
  );
}
