"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { dbError } from "@/lib/orders";

export type AddressInput = {
  id?: string;
  label: string;
  address: string;
  details: string;
  lat: number;
  lng: number;
  isDefault: boolean;
};

export type AddressResult = { ok?: string; error?: string; id?: string };

function refresh() {
  revalidatePath("/cuenta", "layout");
  revalidatePath("/carrito");
}

export async function saveAddress(input: AddressInput): Promise<AddressResult> {
  const session = await requireSession("/cuenta/direcciones");
  const label = input.label.trim().slice(0, 40);
  const address = input.address.trim().slice(0, 200);
  if (!label) return { error: "Ponle un nombre a la dirección (Casa, Oficina…)." };
  if (address.length < 5) return { error: "Escribe la dirección completa." };
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return { error: "Ubica la dirección en el mapa." };

  const supabase = await createClient();
  const row = {
    label,
    address,
    details: input.details.trim().slice(0, 200),
    lat: input.lat,
    lng: input.lng,
    is_default: input.isDefault,
  };
  const { data, error } = input.id
    ? await supabase.from("addresses").update(row).eq("id", input.id).eq("user_id", session.userId).select("id").single()
    : await supabase.from("addresses").insert(row).select("id").single();
  if (error || !data) return { error: dbError(error, "No se pudo guardar la dirección.") };

  refresh();
  return { ok: input.id ? "Dirección actualizada." : "Dirección guardada.", id: data.id };
}

export async function deleteAddress(id: string): Promise<AddressResult> {
  const session = await requireSession("/cuenta/direcciones");
  const supabase = await createClient();
  const { data: removed, error } = await supabase
    .from("addresses")
    .delete()
    .eq("id", id)
    .eq("user_id", session.userId)
    .select("is_default")
    .single();
  if (error) return { error: "No se pudo eliminar la dirección." };
  // Si era la principal, la más antigua que quede pasa a serlo.
  if (removed?.is_default) {
    const { data: next } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", session.userId)
      .order("created_at")
      .limit(1)
      .maybeSingle();
    if (next) await supabase.from("addresses").update({ is_default: true }).eq("id", next.id);
  }
  refresh();
  return { ok: "Dirección eliminada." };
}

export async function setDefaultAddress(id: string): Promise<AddressResult> {
  const session = await requireSession("/cuenta/direcciones");
  const supabase = await createClient();
  const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id).eq("user_id", session.userId);
  if (error) return { error: "No se pudo actualizar la dirección." };
  refresh();
  return { ok: "Dirección principal actualizada." };
}
