import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, ShieldCheck, ShoppingBag, Users } from "lucide-react";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { EmptyState, PageHeader, Panel } from "@/components/dashboard/ui";
import { requirePermission } from "@/lib/supabase/auth";
import { formatPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { UserRoleToggle } from "./UserRoleToggle";

const PAGE_SIZE = 50;

type Role = { id: string; key: string; name: string };
type Person = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  active: boolean;
  user_roles: { role_id: string }[];
  orders?: { count: number }[];
};

const fmtDate = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Bogota" });

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ q?: string; vista?: string; pagina?: string }> }) {
  const session = await requirePermission("users.manage");
  const { q = "", vista, pagina } = await searchParams;
  const view = vista === "clientes" ? "clientes" : "equipo";
  const page = Math.max(1, Number(pagina) || 1);
  const supabase = await createClient();

  const { data: roles } = await supabase.from("roles").select("id, key, name").order("created_at");
  const staffRoles = (roles ?? []).filter((r) => r.key !== "cliente");

  // Equipo: quien tiene al menos un rol distinto de cliente. El resto son clientes.
  const { data: staffLinks } = staffRoles.length
    ? await supabase.from("user_roles").select("user_id").in("role_id", staffRoles.map((r) => r.id))
    : { data: [] as { user_id: string }[] };
  const teamIds = [...new Set((staffLinks ?? []).map((r) => r.user_id))];

  const term = q.trim().replace(/[%,()]/g, "");
  const search = term ? `full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%` : null;

  let teamQuery = supabase
    .from("profiles")
    .select("id, full_name, email, phone, avatar_url, created_at, active, user_roles(role_id)", { count: "exact" })
    .in("id", teamIds.length ? teamIds : ["00000000-0000-0000-0000-000000000000"])
    .order("full_name");
  if (search) teamQuery = teamQuery.or(search);

  let clientQuery = supabase
    .from("profiles")
    .select("id, full_name, email, phone, avatar_url, created_at, active, user_roles(role_id), orders!orders_user_id_fkey(count)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (teamIds.length) clientQuery = clientQuery.not("id", "in", `(${teamIds.join(",")})`);
  if (search) clientQuery = clientQuery.or(search);

  const [{ data: team, count: teamCount }, { data: clients, count: clientCount }] = await Promise.all([teamQuery, clientQuery]);
  const people = ((view === "equipo" ? team : clients) ?? []) as unknown as Person[];
  const pages = Math.max(1, Math.ceil((clientCount ?? 0) / PAGE_SIZE));

  const href = (patch: Record<string, string | number | null>) => {
    const p = new URLSearchParams();
    const next = { q: term || null, vista: view, pagina: null as string | number | null, ...patch };
    for (const [k, v] of Object.entries(next)) if (v !== null && v !== "" && !(k === "pagina" && v === 1)) p.set(k, String(v));
    return `/admin/usuarios${p.size ? `?${p}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        eyebrow="Configuración"
        title="Usuarios"
        description="El equipo, con sus roles en el sistema, y los clientes, separados. Toca a una persona para ver su ficha completa, activarla o inactivarla."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <nav className="flex gap-1 rounded-full bg-white p-1 ring-1 ring-[#1F4D36]/[0.08]" aria-label="Tipo de usuario">
          {(
            [
              { key: "equipo", label: "Equipo", icon: ShieldCheck, count: teamCount ?? 0 },
              { key: "clientes", label: "Clientes", icon: ShoppingBag, count: clientCount ?? 0 },
            ] as const
          ).map((t) => (
            <Link
              key={t.key}
              href={href({ vista: t.key })}
              aria-current={view === t.key ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition",
                view === t.key ? "bg-[#1F4D36] text-white" : "text-[#1F4D36]/70 hover:bg-[#F4F8F2]"
              )}
            >
              <t.icon className="h-4 w-4" /> {t.label}
              <span className={cn("rounded-full px-2 py-0.5 text-xs tabular-nums", view === t.key ? "bg-white/15" : "bg-[#F4F8F2]")}>{t.count}</span>
            </Link>
          ))}
        </nav>
        <form className="relative ml-auto w-full sm:w-auto">
          <input type="hidden" name="vista" value={view} />
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1B1B1B]/35" />
          <input
            name="q"
            defaultValue={q}
            placeholder={view === "equipo" ? "Buscar en el equipo" : "Buscar cliente: nombre, correo o celular"}
            className="h-10 w-full rounded-full border border-[#1F4D36]/12 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-[#8BC34A] sm:w-80"
          />
        </form>
      </div>

      {view === "equipo" ? (
        <TeamPanel people={people} roles={staffRoles} me={session.userId} term={term} />
      ) : (
        <ClientsPanel people={people} roles={staffRoles} total={clientCount ?? 0} term={term} page={page} pages={pages} href={href} />
      )}
    </div>
  );
}

function PersonCell({ user, me, size = 36 }: { user: Person; me: string; size?: number }) {
  return (
    <Link href={`/admin/usuarios/${user.id}`} className={cn("group flex min-w-0 items-center gap-3", !user.active && "opacity-60")}>
      <UserAvatar name={user.full_name} email={user.email} src={user.avatar_url} size={size} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-[#1F4D36] group-hover:underline">
          {user.full_name || "Sin nombre"}
          {user.id === me && <span className="ml-1.5 text-xs font-normal text-[#1B1B1B]/40">(tú)</span>}
          {!user.active && <span className="ml-2 rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-700 no-underline">Inactivo</span>}
        </p>
        <p className="truncate text-xs text-[#1B1B1B]/45">
          {user.email}
          {user.phone && ` · ${formatPhone(user.phone)}`}
        </p>
      </div>
    </Link>
  );
}

/** Equipo: una columna por rol con su interruptor. */
function TeamPanel({ people, roles, me, term }: { people: Person[]; roles: Role[]; me: string; term: string }) {
  if (!people.length) {
    return (
      <Panel>
        <EmptyState icon={Users} title="Sin resultados" description={term ? `Nadie del equipo coincide con “${term}”.` : "Aún no hay personas con rol en el sistema."} />
      </Panel>
    );
  }
  return (
    <Panel bodyClassName="p-0" title={`${people.length} ${people.length === 1 ? "persona" : "personas"} en el equipo`} description="Activa o quita roles. Si le quitas todos, vuelve a ser cliente.">
      <ul className="mt-5 divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06] md:hidden">
        {people.map((user) => {
          const assigned = new Set(user.user_roles.map((r) => r.role_id));
          return (
            <li key={user.id} className="px-5 py-4">
              <PersonCell user={user} me={me} size={40} />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {roles.map((role) => (
                  <label key={role.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#F8F7F2] px-3 py-2 text-xs font-medium text-[#1B1B1B]/70">
                    <span className="truncate">{role.name}</span>
                    <UserRoleToggle userId={user.id} roleId={role.id} roleName={role.name} checked={assigned.has(role.id)} locked={user.id === me && role.key === "admin"} />
                  </label>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2]/60 text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40">
              <th className="px-6 py-3">Persona</th>
              {roles.map((role) => (
                <th key={role.id} className="px-3 py-3 text-center">
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((user) => {
              const assigned = new Set(user.user_roles.map((r) => r.role_id));
              return (
                <tr key={user.id} className="border-b border-[#1F4D36]/[0.05] transition-colors last:border-0 hover:bg-[#F8F7F2]/60">
                  <td className="px-6 py-3.5">
                    <PersonCell user={user} me={me} />
                  </td>
                  {roles.map((role) => (
                    <td key={role.id} className="px-3 py-3.5 text-center">
                      <UserRoleToggle userId={user.id} roleId={role.id} roleName={role.name} checked={assigned.has(role.id)} locked={user.id === me && role.key === "admin"} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

/** Clientes: datos de contacto, pedidos y, si hace falta, dar acceso al equipo. */
function ClientsPanel({
  people,
  roles,
  total,
  term,
  page,
  pages,
  href,
}: {
  people: Person[];
  roles: Role[];
  total: number;
  term: string;
  page: number;
  pages: number;
  href: (patch: Record<string, string | number | null>) => string;
}) {
  if (!people.length) {
    return (
      <Panel>
        <EmptyState icon={ShoppingBag} title="Sin resultados" description={term ? `Ningún cliente coincide con “${term}”.` : "Aún no hay clientes registrados."} />
      </Panel>
    );
  }
  const from = (page - 1) * PAGE_SIZE + 1;
  return (
    <Panel bodyClassName="p-0" title={`${total} ${total === 1 ? "cliente" : "clientes"}`} description="Ordenados del más reciente al más antiguo.">
      <ul className="mt-5 divide-y divide-[#1F4D36]/[0.06] border-t border-[#1F4D36]/[0.06]">
        {people.map((user) => {
          const orders = user.orders?.[0]?.count ?? 0;
          return (
            <li key={user.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3.5 sm:px-6">
              <div className="min-w-0 flex-1 basis-64">
                <PersonCell user={user} me="" />
              </div>
              <div className="w-24 text-sm">
                <p className="font-semibold tabular-nums text-[#1F4D36]">{orders}</p>
                <p className="text-[11px] text-[#1B1B1B]/45">{orders === 1 ? "pedido" : "pedidos"}</p>
              </div>
              <div className="w-32 whitespace-nowrap text-sm">
                <p className="text-[#1B1B1B]/70">{fmtDate.format(new Date(user.created_at))}</p>
                <p className="text-[11px] text-[#1B1B1B]/45">cliente desde</p>
              </div>
              <details className="group w-full sm:w-auto">
                <summary className="cursor-pointer list-none rounded-full border border-[#1F4D36]/15 px-3 py-1.5 text-xs font-semibold text-[#1F4D36] transition hover:border-[#8BC34A] hover:bg-[#F4F8F2]">
                  <ShieldCheck className="mr-1 inline h-3.5 w-3.5" /> Dar rol
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:w-80">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#F8F7F2] px-3 py-2 text-xs font-medium text-[#1B1B1B]/70">
                      <span className="truncate">{role.name}</span>
                      <UserRoleToggle userId={user.id} roleId={role.id} roleName={role.name} checked={false} locked={false} />
                    </label>
                  ))}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-[#1F4D36]/[0.06] px-5 py-3 text-xs text-[#1B1B1B]/55 sm:px-6">
          <span>
            {from}–{from + people.length - 1} de {total}
          </span>
          <div className="flex gap-1">
            {page > 1 ? (
              <Link href={href({ pagina: page - 1 })} className="flex items-center gap-1 rounded-full px-3 py-1.5 font-semibold text-[#1F4D36] hover:bg-[#F4F8F2]">
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Link>
            ) : null}
            {page < pages ? (
              <Link href={href({ pagina: page + 1 })} className="flex items-center gap-1 rounded-full px-3 py-1.5 font-semibold text-[#1F4D36] hover:bg-[#F4F8F2]">
                Siguiente <ChevronRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </Panel>
  );
}
