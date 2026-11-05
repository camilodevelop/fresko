import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, ChefHat, FileCheck2, KeyRound, Mail, MapPin, Package, Phone, Repeat, ShieldCheck, Truck } from "lucide-react";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { Panel, StatusBadge } from "@/components/dashboard/ui";
import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { formatDeliveryDate } from "@/lib/delivery";
import { formatPhone } from "@/lib/phone";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { SUBSCRIPTION_STATUS, subscriptionState, todayBogota } from "@/lib/subscriptions";
import { formatPrice } from "@/lib/utils";
import { UserRoleToggle } from "../UserRoleToggle";
import { UserStatusCard } from "../UserStatusCard";

const fmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" });
const fmtDay = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" });
const DOCS: Record<string, string> = { terminos: "Términos y condiciones", privacidad: "Tratamiento de datos", marketing: "Comunicaciones comerciales" };
const PROVIDERS: Record<string, string> = { email: "Correo y contraseña", google: "Google" };

export default async function UsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("users.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();

  const { data: user } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, avatar_url, created_at, marketing_opt_in, active, deactivated_at, deactivation_reason, deactivated_by, user_roles(role_id)")
    .eq("id", id)
    .maybeSingle();
  if (!user) notFound();

  const [{ data: roles }, { data: auth }, { data: addresses }, { data: orders, count: orderCount }, { data: subs }, { data: consents }, { data: history }] =
    await Promise.all([
      supabase.from("roles").select("id, key, name").order("created_at"),
      supabase.rpc("admin_user_auth", { p_user_id: id }),
      supabase.from("addresses").select("id, label, address, details, is_default, zones(name)").eq("user_id", id).order("is_default", { ascending: false }),
      supabase
        .from("orders")
        .select("id, code, kind, status, total, delivery_date, slot_label, created_at", { count: "exact" })
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase.from("subscriptions").select("id, code, plan_name, portions, status, expires_on, total, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
      supabase.from("user_consents").select("document, version, accepted, method, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(12),
      supabase.from("user_status_events").select("active, reason, created_at, created_by").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
    ]);

  const assigned = new Set(user.user_roles.map((r) => r.role_id));
  const staffRoles = (roles ?? []).filter((r) => r.key !== "cliente");
  const isStaff = staffRoles.some((r) => assigned.has(r.id));
  const authInfo = auth?.[0];

  // Actividad del equipo: lo que ha hecho en la operación.
  const [{ count: batches }, { count: packed }, { count: delivered }, { data: zones }, { data: totals }, { data: trips }] = await Promise.all([
    supabase.from("prep_batches").select("id", { count: "exact", head: true }).eq("started_by", id),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("packed_by", id),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("delivered_by", id),
    supabase.from("courier_assignments").select("zone_id, slot_id, active, zones(name), delivery_slots(start_time, end_time)").eq("user_id", id),
    supabase.from("orders").select("total").eq("user_id", id).in("status", ["confirmado", "en_preparacion", "en_camino", "entregado"]),
    supabase
      .from("delivery_routes")
      .select("started_at, completed_at, returned_at, duration_s")
      .eq("courier_id", id)
      .not("started_at", "is", null)
      .not("returned_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(100),
  ]);
  // Tiempos reales de sus rutas (salida → regreso), regreso (última parada → cocina) y desvío frente al estimado.
  const mins = (a: string | null, b: string | null) => (a && b ? (new Date(b).getTime() - new Date(a).getTime()) / 60000 : null);
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x !== null && x >= 0);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  const tripAvg = avg((trips ?? []).map((t) => mins(t.started_at, t.returned_at)));
  const backAvg = avg((trips ?? []).map((t) => mins(t.completed_at, t.returned_at)));
  const drift = avg((trips ?? []).map((t) => (t.duration_s > 0 ? (mins(t.started_at, t.returned_at) ?? 0) / (t.duration_s / 60) : null)));
  const fmtM = (m: number | null) => (m === null ? "—" : m >= 60 ? `${Math.floor(m / 60)} h ${Math.round(m % 60)} min` : `${Math.round(m)} min`);
  const spent = (totals ?? []).reduce((s, o) => s + (o.total ?? 0), 0);

  // Nombres de quien inactivó y de quien hizo cada cambio de estado.
  const actorIds = [...new Set([user.deactivated_by, ...(history ?? []).map((h) => h.created_by)].filter((x): x is string => Boolean(x)))];
  const { data: actors } = actorIds.length ? await supabase.from("profiles").select("id, full_name, email").in("id", actorIds) : { data: [] };
  const nameOf = new Map((actors ?? []).map((a) => [a.id, a.full_name || a.email || "Admin"]));
  const today = todayBogota();

  return (
    <div className="space-y-6">
      <Link href={`/admin/usuarios${isStaff ? "" : "?vista=clientes"}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1F4D36]/70 hover:text-[#1F4D36]">
        <ArrowLeft className="h-4 w-4" /> Usuarios
      </Link>

      {/* Encabezado */}
      <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-[#1F4D36]/[0.07] bg-white p-5 sm:p-6">
        <UserAvatar name={user.full_name} email={user.email} src={user.avatar_url} size={64} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-[#1F4D36]">{user.full_name || "Sin nombre"}</h1>
            <StatusBadge tone={isStaff ? "dark" : "gray"}>{isStaff ? "Equipo" : "Cliente"}</StatusBadge>
            {!user.active && <StatusBadge tone="red">Inactivo</StatusBadge>}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#1B1B1B]/60">
            <span className="flex items-center gap-1.5">
              <Mail className="h-4 w-4" /> {user.email}
            </span>
            {user.phone && (
              <a href={`tel:${user.phone}`} className="flex items-center gap-1.5 hover:text-[#1F4D36]">
                <Phone className="h-4 w-4" /> {formatPhone(user.phone)}
              </a>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" /> Registrado el {fmtDay.format(new Date(user.created_at))}
            </span>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* Resumen */}
          <div className="grid gap-3 sm:grid-cols-3">
            {isStaff ? (
              <>
                <Stat icon={ChefHat} label="Tandas en cocina" value={batches ?? 0} />
                <Stat icon={Package} label="Pedidos alistados" value={packed ?? 0} />
                <Stat icon={Truck} label="Pedidos entregados" value={delivered ?? 0} />
              </>
            ) : (
              <>
                <Stat icon={Package} label="Pedidos" value={orderCount ?? 0} />
                <Stat icon={Repeat} label="Suscripciones" value={subs?.length ?? 0} />
                <Stat icon={ShieldCheck} label="Total comprado" value={formatPrice(spent)} />
              </>
            )}
          </div>

          {/* Rutas del domiciliario */}
          {(trips?.length ?? 0) > 0 && (
            <Panel icon={Truck} title="Rutas" description={`Promedios de sus últimas ${trips!.length} ${trips!.length === 1 ? "ruta" : "rutas"} con regreso registrado.`}>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-[#1B1B1B]/50">Duración (salida → regreso)</dt>
                  <dd className="font-display text-xl font-bold text-[#1F4D36]">{fmtM(tripAvg)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#1B1B1B]/50">Regreso (última parada → cocina)</dt>
                  <dd className="font-display text-xl font-bold text-[#1F4D36]">{fmtM(backAvg)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-[#1B1B1B]/50">Frente a lo estimado</dt>
                  <dd className="font-display text-xl font-bold text-[#1F4D36]">
                    {drift === null ? "—" : `${drift >= 1 ? "+" : "−"}${Math.abs(Math.round((drift - 1) * 100))}%`}
                  </dd>
                </div>
              </dl>
            </Panel>
          )}

          {/* Pedidos */}
          <Panel icon={Package} title="Pedidos" description={orderCount ? `Los ${Math.min(10, orderCount)} más recientes de ${orderCount}.` : undefined} bodyClassName="p-0">
            {orders?.length ? (
              <ul className="mt-4 divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/pedidos/${o.code}`} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm transition hover:bg-[#F8F7F2]/70 sm:px-6">
                      <span className="w-20 font-display font-bold text-[#1F4D36]">{o.code}</span>
                      <span className="min-w-0 flex-1 text-[#1B1B1B]/60">
                        {formatDeliveryDate(o.delivery_date, { weekday: "short", day: "numeric", month: "short" }, true)} · {o.slot_label}
                        {o.kind === "suscripcion" && <span className="ml-2 text-xs text-[#7CB342]">Plan</span>}
                      </span>
                      <OrderStatusBadge status={o.status} />
                      <span className="w-24 text-right font-semibold tabular-nums text-[#1F4D36]">{formatPrice(o.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-5 pt-2 text-sm text-[#1B1B1B]/50 sm:px-6">{isStaff ? "No tiene pedidos como cliente." : "Aún no ha hecho pedidos."}</p>
            )}
          </Panel>

          {/* Suscripciones */}
          {subs && subs.length > 0 && (
            <Panel icon={Repeat} title="Suscripciones" bodyClassName="p-0">
              <ul className="mt-4 divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">
                {subs.map((s) => {
                  const st = SUBSCRIPTION_STATUS[subscriptionState(s.status, s.expires_on, today)] ?? SUBSCRIPTION_STATUS.activa;
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm sm:px-6">
                      <span className="w-24 font-display font-bold text-[#1F4D36]">{s.code}</span>
                      <span className="min-w-0 flex-1 text-[#1B1B1B]/60">
                        {s.plan_name} · {s.portions} platos · vence {fmtDay.format(new Date(`${s.expires_on}T12:00:00-05:00`))}
                      </span>
                      <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                      <span className="w-24 text-right font-semibold tabular-nums text-[#1F4D36]">{formatPrice(s.total)}</span>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}

          {/* Direcciones */}
          <Panel icon={MapPin} title="Direcciones" bodyClassName="p-0">
            {addresses?.length ? (
              <ul className="mt-4 divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">
                {addresses.map((a) => (
                  <li key={a.id} className="px-5 py-3 text-sm sm:px-6">
                    <p className="font-semibold text-[#1F4D36]">
                      {a.label || "Dirección"}
                      {a.is_default && <span className="ml-2 text-xs font-normal text-[#7CB342]">Principal</span>}
                    </p>
                    <p className="text-[#1B1B1B]/65">
                      {a.address}
                      {a.details && ` · ${a.details}`}
                    </p>
                    <p className="text-xs text-[#1B1B1B]/45">{a.zones?.name ?? "Fuera de cobertura"}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 pb-5 pt-2 text-sm text-[#1B1B1B]/50 sm:px-6">No tiene direcciones guardadas.</p>
            )}
          </Panel>
        </div>

        <aside className="space-y-6">
          <UserStatusCard
            userId={user.id}
            active={user.active}
            isMe={user.id === session.userId}
            deactivatedAt={user.deactivated_at}
            reason={user.deactivation_reason}
            by={user.deactivated_by ? (nameOf.get(user.deactivated_by) ?? null) : null}
          />

          <Panel icon={ShieldCheck} title="Roles" description="Con algún rol entra al panel; sin roles es cliente.">
            <div className="mt-3 space-y-2">
              {staffRoles.map((role) => (
                <label key={role.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#F8F7F2] px-3 py-2 text-sm font-medium text-[#1B1B1B]/70">
                  <span>{role.name}</span>
                  <UserRoleToggle userId={user.id} roleId={role.id} roleName={role.name} checked={assigned.has(role.id)} locked={user.id === session.userId && role.key === "admin"} />
                </label>
              ))}
            </div>
            {zones && zones.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold uppercase tracking-wider text-[#1B1B1B]/40">Zonas como domiciliario</p>
                <ul className="mt-1.5 space-y-1 text-sm text-[#1B1B1B]/70">
                  {zones.map((z, i) => (
                    <li key={i} className={z.active ? "" : "opacity-50"}>
                      {z.zones?.name} · {z.delivery_slots ? `${z.delivery_slots.start_time.slice(0, 5)} – ${z.delivery_slots.end_time.slice(0, 5)}` : "todas las franjas"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel icon={KeyRound} title="Acceso">
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[#1B1B1B]/50">Último ingreso</dt>
                <dd className="text-right text-[#1F4D36]">{authInfo?.last_sign_in_at ? fmt.format(new Date(authInfo.last_sign_in_at)) : "Nunca"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#1B1B1B]/50">Ingresa con</dt>
                <dd className="text-right text-[#1F4D36]">{(authInfo?.providers ?? []).map((p) => PROVIDERS[p] ?? p).join(", ") || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#1B1B1B]/50">Correo confirmado</dt>
                <dd className="text-right text-[#1F4D36]">{authInfo?.email_confirmed_at ? "Sí" : "No"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[#1B1B1B]/50">Recibe promociones</dt>
                <dd className="text-right text-[#1F4D36]">{user.marketing_opt_in ? "Sí" : "No"}</dd>
              </div>
            </dl>
          </Panel>

          {consents && consents.length > 0 && (
            <Panel icon={FileCheck2} title="Consentimientos">
              <ul className="mt-3 space-y-2 text-sm">
                {consents.map((c, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="text-[#1B1B1B]/65">
                      {DOCS[c.document] ?? c.document} <span className="text-xs text-[#1B1B1B]/40">v{c.version}</span>
                    </span>
                    <span className={c.accepted ? "text-right text-[#2E6B1F]" : "text-right text-red-700"}>
                      {c.accepted ? "Aceptó" : "Rechazó"}
                      <span className="block text-[11px] text-[#1B1B1B]/40">{fmtDay.format(new Date(c.created_at))}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {history && history.length > 0 && (
            <Panel icon={CalendarClock} title="Historial de la cuenta">
              <ul className="mt-3 space-y-2 text-sm">
                {history.map((h, i) => (
                  <li key={i}>
                    <p className={h.active ? "font-semibold text-[#2E6B1F]" : "font-semibold text-red-700"}>{h.active ? "Activada" : "Inactivada"}</p>
                    {h.reason && <p className="text-[#1B1B1B]/60">{h.reason}</p>}
                    <p className="text-[11px] text-[#1B1B1B]/40">
                      {fmt.format(new Date(h.created_at))}
                      {h.created_by ? ` · ${nameOf.get(h.created_by) ?? ""}` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-[#1F4D36]/[0.07] bg-white p-4">
      <Icon className="h-5 w-5 text-[#7CB342]" />
      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-[#1F4D36]">{value}</p>
      <p className="text-xs text-[#1B1B1B]/50">{label}</p>
    </div>
  );
}
