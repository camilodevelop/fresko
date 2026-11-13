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

/**
 * Imagen para el bowl realista: PNG con transparencia (ingrediente en montoncito, vista 3/4).
 * Quita el halo semitransparente, recorta al contenido, reduce a 640 px y la sube como WebP.
 */
export async function uploadBowlImage(file: File): Promise<{ url?: string; error?: string }> {
  if (!TYPES.includes(file.type)) return { error: "Usa una imagen PNG o WebP con fondo transparente." };
  if (file.size > MAX_BYTES) return { error: "La imagen pesa más de 10 MB. Usa una más liviana." };
  try {
    const bitmap = await createImageBitmap(file);
    const src = document.createElement("canvas");
    src.width = bitmap.width;
    src.height = bitmap.height;
    const ctx = src.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    const img = ctx.getImageData(0, 0, src.width, src.height);
    const px = img.data;
    let minX = src.width, minY = src.height, maxX = -1, maxY = -1;
    let transparent = 0;
    for (let i = 0; i < px.length; i += 4) {
      const a = px[i + 3];
      if (a < 250) transparent++;
      // Halo: lo casi transparente desaparece; el borde queda suave.
      const na = a <= 90 ? 0 : a >= 245 ? 255 : Math.round(((a - 90) * 255) / 155);
      px[i + 3] = na;
      if (na > 8) {
        const p = i / 4;
        const x = p % src.width;
        const y = (p - x) / src.width;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (transparent < px.length / 40 || maxX < 0) return { error: "La imagen debe tener fondo transparente (PNG recortado)." };
    ctx.putImageData(img, 0, 0);
    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const scale = Math.min(1, 640 / w);
    const out = document.createElement("canvas");
    out.width = Math.round(w * scale);
    out.height = Math.round(h * scale);
    out.getContext("2d")!.drawImage(src, minX, minY, w, h, 0, 0, out.width, out.height);
    const blob = await new Promise<Blob>((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error("imagen"))), "image/webp", 0.85));
    const path = `bowl/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
    const supabase = createClient();
    const { error } = await supabase.storage.from("products").upload(path, blob, { contentType: "image/webp" });
    if (error) throw error;
    return { url: supabase.storage.from("products").getPublicUrl(path).data.publicUrl };
  } catch {
    return { error: "No se pudo subir la imagen. Intenta con otra." };
  }
}
