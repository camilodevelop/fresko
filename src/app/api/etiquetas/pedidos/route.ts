import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { buildBagLabelsPdf, type BagLabel } from "@/lib/labels";
import { allergenLabel } from "@/lib/nutrition";
import { formatPhone } from "@/lib/phone";
import { formatDeliveryDate } from "@/lib/delivery";

/** Página simple para explicar en la pestaña de impresión por qué no se generó el PDF. */
const notice = (text: string, status: number) =>
  new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Etiquetas</title><body style="font-family:system-ui;padding:40px;color:#1F4D36"><h2>No se imprimieron las etiquetas</h2><p>${text.replace(/</g, "&lt;")}</p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );

/**
 * PDF con la etiqueta de cada pedido, en el orden recibido: /api/etiquetas/pedidos?ids=a,b,c
 * Imprimir es empezar el alistamiento: la canasta de esos pedidos queda fija (si cocina ya terminó).
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!(session?.permissions.has("kitchen.prepare") || session?.permissions.has("orders.manage"))) {
    return new NextResponse("No autorizado", { status: 403 });
  }
  const ids = (request.nextUrl.searchParams.get("ids") ?? "").split(",").filter((x) => /^[0-9a-f-]{36}$/.test(x)).slice(0, 200);
  if (!ids.length) return new NextResponse("Sin pedidos", { status: 400 });

  const supabase = await createClient();
  const { data: stops } = await supabase
    .from("route_stops")
    .select("order_id, route_id, delivery_routes!inner(status)")
    .in("order_id", ids);
  for (const routeId of new Set((stops ?? []).filter((x) => x.delivery_routes.status === "planificada").map((x) => x.route_id))) {
    const { error } = await supabase.rpc("lock_route_packing", { p_route_id: routeId });
    if (error) return notice(error.hint || error.message, 409);
  }

  const [{ data: orders }, { data: setting }] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, code, delivery_date, slot_label, contact_name, contact_phone, address_snapshot, notes, zones(name), order_items(name, quantity, options, products(allergens))"
      )
      .in("id", ids),
    supabase.from("settings").select("value").eq("key", "label_size").maybeSingle(),
  ]);

  type Row = {
    id: string;
    code: string;
    delivery_date: string;
    slot_label: string;
    contact_name: string;
    contact_phone: string;
    address_snapshot: { address?: string; details?: string };
    notes: string;
    zones: { name: string } | null;
    order_items: { name: string; quantity: number; options: { id: string; name: string }[]; products: { allergens: string[] } | null }[];
  };
  const rows = (orders ?? []) as unknown as Row[];
  const optionIds = [...new Set(rows.flatMap((o) => o.order_items.flatMap((i) => (Array.isArray(i.options) ? i.options.map((x) => x.id) : []))))];
  const { data: options } = optionIds.length
    ? await supabase.from("builder_options").select("id, allergens").in("id", optionIds)
    : { data: [] as { id: string; allergens: string[] }[] };
  const optionAllergens = new Map((options ?? []).map((o) => [o.id, o.allergens]));

  const origin = request.nextUrl.origin;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const labels: BagLabel[] = ids
    .map((id) => byId.get(id))
    .filter((o): o is Row => Boolean(o))
    .map((o) => {
      const allergens = new Set<string>();
      for (const i of o.order_items) {
        (i.products?.allergens ?? []).forEach((a) => allergens.add(a));
        (Array.isArray(i.options) ? i.options : []).forEach((op) => (optionAllergens.get(op.id) ?? []).forEach((a) => allergens.add(a)));
      }
      return {
        code: o.code,
        zone: o.zones?.name ?? "",
        dateLabel: formatDeliveryDate(o.delivery_date, { weekday: "short", day: "numeric", month: "short" }, true),
        slotLabel: o.slot_label,
        customer: o.contact_name || "Cliente",
        phone: o.contact_phone ? formatPhone(o.contact_phone) : "",
        address: o.address_snapshot?.address ?? "",
        details: o.address_snapshot?.details ?? "",
        notes: o.notes,
        items: o.order_items.map((i) => ({
          quantity: i.quantity,
          name: i.name,
          options: Array.isArray(i.options) ? i.options.map((x) => x.name).join(", ") : "",
        })),
        allergens: [...allergens].map(allergenLabel).join(", "),
        qrUrl: `${origin}/admin/pedidos/${o.code}`,
      };
    });
  if (!labels.length) return new NextResponse("Pedidos no encontrados", { status: 404 });

  const pdf = await buildBagLabelsPdf(labels, typeof setting?.value === "string" ? setting.value : "102x152");
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="etiquetas-${labels.length === 1 ? labels[0].code : `${labels.length}-pedidos`}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
