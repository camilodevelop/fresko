import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, daysBetween, loadFinance, statementFor } from "@/lib/finance";

/** CSV para Excel (separador ";", UTF-8 con BOM): estado de resultados, pedidos con costo y detalle de pérdidas y nómina. */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.permissions.has("reports.view")) return new NextResponse("No autorizado", { status: 403 });
  const sp = request.nextUrl.searchParams;
  const valid = (d: string | null) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null);
  const to = valid(sp.get("hasta")) ?? new Date(Date.now() - 5 * 3_600_000).toISOString().slice(0, 10);
  let from = valid(sp.get("desde")) ?? `${to.slice(0, 8)}01`;
  if (from > to) from = to;
  if (daysBetween(from, to) > 366) from = addDays(to, -365);
  const kitchenId = sp.get("cocina");

  const supabase = await createClient();
  const report = await loadFinance({ from, to });
  const s = statementFor(report, kitchenId);
  const { data: kitchens } = await supabase.from("kitchens").select("id, name");
  const kname = (id: string | null | undefined) => (id ? (kitchens?.find((k) => k.id === id)?.name ?? "") : "General");

  const { data: orders } = await supabase
    .from("orders")
    .select("id, code, total, tax_amount, paid_at, status, contact_name, kitchen_id, channel")
    .eq("kind", "pedido")
    .neq("payment_status", "reembolsado")
    .gte("paid_at", `${from}T00:00:00-05:00`)
    .lt("paid_at", `${addDays(to, 1)}T00:00:00-05:00`)
    .order("paid_at");
  const rows = (orders ?? []).filter((o) => !kitchenId || o.kitchen_id === kitchenId);
  const { data: costs } = rows.length ? await supabase.from("order_food_costs").select("order_id, food_cost").in("order_id", rows.map((o) => o.id)) : { data: [] };
  const costOf = new Map((costs ?? []).map((c) => [c.order_id, Number(c.food_cost)]));

  const cell = (v: string | number) => {
    const t = typeof v === "number" ? String(Math.round(v)) : v;
    return /[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const lines: (string | number)[][] = [
    [`FRESKO · Cuentas del ${from} al ${to}`, kitchenId ? kname(kitchenId) : "Consolidado"],
    [],
    ["ESTADO DE RESULTADOS", "Valor"],
    ["Ventas de pedidos", s.salesOrders],
    ["  de ellas en mostrador", s.salesCounter],
    ["  de ellas en puntos de venta", s.salesPoints],
    ["Ventas de planes", s.salesPlans],
    ["Ventas cobradas", s.grossSales],
    ["Impuestos incluidos", -s.taxes],
    ["Ventas netas", s.netSales],
    ["Costo de ingredientes y empaques", -s.foodCost],
    ["Utilidad bruta", s.grossProfit],
    ["Pérdidas de inventario", -s.lossInventory],
    ["Platos dañados en cocina", -s.lossKitchen],
    ["Pedidos no entregados o cancelados", -s.lossOrders],
    ["Alimentación del equipo (platos sobrantes)", -s.lossStaff],
    ["Donaciones de platos", -s.lossDonation],
    ["Platos vencidos o dañados", -s.lossDishes],
    ["Faltantes de platos", -s.lossMissing],
    ["Nómina", -s.payroll],
    ["Gastos fijos", -s.fixedExpenses],
    ["Otros gastos e imprevistos", -s.otherExpenses],
    ["Otros ingresos", s.otherIncome],
    ["Utilidad real", s.profit],
    [],
    ["PEDIDOS COBRADOS", "Fecha de pago", "Cocina", "Canal", "Cliente", "Estado", "Cobrado", "Impuesto", "Venta neta", "Costo comida", "Utilidad bruta"],
    ...rows.map((o) => {
      const net = o.total - o.tax_amount;
      const cost = costOf.get(o.id) ?? 0;
      return [o.code, new Date(o.paid_at ?? "").toLocaleString("es-CO", { timeZone: "America/Bogota" }), kname(o.kitchen_id), o.channel === "mostrador" ? "Mostrador" : o.channel === "punto" ? "Punto de venta" : "Domicilio", o.contact_name, o.status, o.total, o.tax_amount, net, cost, net - cost];
    }),
    [],
    ["PÉRDIDAS", "Valor"],
    ...report.lossDetail.filter((l) => !kitchenId || l.kitchen === kitchenId).map((l) => [l.label, l.amount]),
    [],
    ["NÓMINA", "Cocina", "Tipo", "Pago", "Días", "Costo del período"],
    ...report.payrollDetail
      .filter((e) => !kitchenId || e.kitchen === kitchenId)
      .map((e) => [e.name, kname(e.kitchen === "general" ? null : e.kitchen), e.payType === "diario" ? "Por día" : "Mensual", e.amount, e.days, e.cost]),
  ];
  const csv = "﻿" + lines.map((l) => l.map(cell).join(";")).join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fresko-cuentas-${from}-a-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
