"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import type { LatLng } from "@/lib/data/coverage";

export type FormState = { ok?: string; error?: string };

function refresh() {
  revalidatePath("/admin/zonas", "layout");
  revalidatePath("/");
}

export async function createCountry(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("zones.manage");
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return { error: "Código de país de 2 letras (ej. CO, MX)." };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "Moneda de 3 letras (ej. COP, MXN)." };
  if (!name) return { error: "Escribe el nombre del país." };

  const supabase = await createClient();
  const { error } = await supabase.from("countries").insert({ code, name, currency });
  if (error) return { error: error.code === "23505" ? "Ese país ya existe." : error.message };
  refresh();
  return { ok: `País “${name}” agregado.` };
}

export async function createCity(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("zones.manage");
  const countryId = String(formData.get("country_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim() || "America/Bogota";
  if (!countryId || !name) return { error: "Elige el país y escribe la ciudad." };
  try {
    new Intl.DateTimeFormat("es", { timeZone: timezone });
  } catch {
    return { error: "Zona horaria inválida (ej. America/Bogota)." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cities").insert({ country_id: countryId, name, timezone });
  if (error) return { error: error.code === "23505" ? "Esa ciudad ya existe en el país." : error.message };
  refresh();
  return { ok: `Ciudad “${name}” agregada.` };
}

export async function setActive(table: "countries" | "cities" | "zones", id: string, active: boolean): Promise<FormState> {
  await requirePermission("zones.manage");
  if (!["countries", "cities", "zones"].includes(table)) return { error: "Tabla inválida." };
  const supabase = await createClient();
  const { error } = await supabase.from(table).update({ active }).eq("id", id);
  if (error) return { error: "No se pudo cambiar el estado." };
  refresh();
  const labels = {
    countries: ["País activado.", "País desactivado."],
    cities: ["Ciudad activada.", "Ciudad desactivada."],
    zones: ["Zona activada.", "Zona desactivada."],
  } as const;
  return { ok: labels[table][active ? 0 : 1] };
}

export type ZoneInput = {
  id?: string;
  cityId: string;
  name: string;
  color: string;
  cutoffTime: string;
  deliveryDays: number[];
  active: boolean;
  polygon: LatLng[];
  slots: { id?: string; start: string; end: string }[];
};

export async function saveZone(input: ZoneInput): Promise<FormState> {
  await requirePermission("zones.manage");

  const name = input.name.trim();
  if (!name) return { error: "Escribe el nombre de la zona." };
  if (!input.cityId) return { error: "Elige la ciudad." };
  if (input.polygon.length < 3) return { error: "Dibuja la zona con al menos 3 puntos en el mapa." };
  if (input.deliveryDays.length === 0) return { error: "Elige al menos un día de entrega." };
  if (!/^\d{2}:\d{2}$/.test(input.cutoffTime)) return { error: "Hora de corte inválida." };
  if (!/^#[0-9a-fA-F]{6}$/.test(input.color)) return { error: "Color inválido." };
  for (const slot of input.slots) {
    if (!slot.start || !slot.end || slot.end <= slot.start) {
      return { error: "Cada franja debe terminar después de empezar." };
    }
  }
  if (new Set(input.slots.map((s) => s.start)).size !== input.slots.length) {
    return { error: "Hay dos franjas que empiezan a la misma hora." };
  }

  const supabase = await createClient();
  const row = {
    city_id: input.cityId,
    name,
    color: input.color,
    cutoff_time: input.cutoffTime,
    delivery_days: [...input.deliveryDays].sort(),
    active: input.active,
    polygon: input.polygon.map((p) => ({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) })),
  };

  const { data: zone, error } = input.id
    ? await supabase.from("zones").update(row).eq("id", input.id).select("id").single()
    : await supabase.from("zones").insert(row).select("id").single();
  if (error || !zone) {
    return { error: error?.code === "23505" ? "Ya hay una zona con ese nombre en la ciudad." : error?.message };
  }

  // Franjas quitadas: se borran; si ya tienen entregas asociadas, se desactivan.
  const { data: existing } = await supabase
    .from("delivery_slots")
    .select("id")
    .eq("zone_id", zone.id);
  const keepIds = new Set(input.slots.map((s) => s.id).filter(Boolean));
  for (const { id } of (existing ?? []).filter((s) => !keepIds.has(s.id))) {
    const { error: delError } = await supabase.from("delivery_slots").delete().eq("id", id);
    if (delError?.code === "23503") {
      await supabase.from("delivery_slots").update({ active: false }).eq("id", id);
    }
  }
  for (const slot of input.slots) {
    const values = { zone_id: zone.id, start_time: slot.start, end_time: slot.end, active: true };
    const { error: slotError } = slot.id
      ? await supabase.from("delivery_slots").update(values).eq("id", slot.id)
      : await supabase.from("delivery_slots").insert(values);
    if (slotError) return { error: `Franja ${slot.start}: ${slotError.message}` };
  }

  refresh();
  return { ok: input.id ? `Zona “${name}” actualizada.` : `Zona “${name}” creada.` };
}
