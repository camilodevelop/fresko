import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

/** Ajusta a `max` px (sin recortar) y convierte a WebP conservando transparencia. */
async function toWebp(file: File, max: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("imagen"))), "image/webp", 0.88));
}

/**
 * Sube una foto al bucket público "products" (carpeta opcional) y devuelve su URL pública,
 * o un mensaje de error listo para mostrar.
 */
export async function uploadCatalogImage(file: File, folder = "", max = 900): Promise<{ url?: string; error?: string }> {
  if (!TYPES.includes(file.type)) return { error: "Usa una imagen JPG, PNG o WebP." };
  if (file.size > MAX_BYTES) return { error: "La imagen pesa más de 10 MB. Usa una más liviana." };
  try {
    const blob = await toWebp(file, max);
    const path = `${folder ? `${folder}/` : ""}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("products").upload(path, blob, { contentType: "image/webp" });
    if (error) throw error;
    return { url: supabase.storage.from("products").getPublicUrl(path).data.publicUrl };
  } catch {
    return { error: "No se pudo subir la foto. Intenta con otra imagen." };
  }
}
