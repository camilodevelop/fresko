import { Search, Users } from "lucide-react";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { EmptyState, PageHeader, Panel, StatusBadge } from "@/components/dashboard/ui";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { UserRoleToggle } from "./UserRoleToggle";

export default async function UsuariosPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await requirePermission("users.manage");
  const { q = "" } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, avatar_url, created_at, user_roles(role_id)", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);
  const term = q.trim().replace(/[%,()]/g, "");
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);

  const [{ data: users, count }, { data: roles }] = await Promise.all([
    query,
    supabase.from("roles").select("id, key, name").order("created_at"),
  ]);
  const clientRole = roles?.find((r) => r.key === "cliente");

  return (
    <div>
      <PageHeader
        eyebrow="Configuración"
        title="Usuarios"
        description="Asigna roles con los interruptores. Al darle un rol del equipo, la persona deja de ser cliente y entra directo al panel."
      />

      <Panel
        bodyClassName="p-0"
        title={`${count ?? 0} ${count === 1 ? "persona" : "personas"}`}
        actions={
          <form className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#1B1B1B]/35" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar nombre o correo"
              className="h-10 w-56 rounded-full border border-[#1F4D36]/12 bg-[#F8F7F2] pl-10 pr-4 text-sm outline-none transition focus:border-[#8BC34A] focus:bg-white sm:w-72"
            />
          </form>
        }
      >
        {users && users.length > 0 ? (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-y border-[#1F4D36]/[0.06] bg-[#F8F7F2]/60 text-[11px] font-bold uppercase tracking-wider text-[#1B1B1B]/40">
                  <th className="px-6 py-3">Persona</th>
                  <th className="px-4 py-3">Tipo</th>
                  {(roles ?? []).filter((r) => r.key !== "cliente").map((role) => (
                    <th key={role.id} className="px-3 py-3 text-center">{role.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const assigned = new Set(user.user_roles.map((r) => r.role_id));
                  const isClient = clientRole ? assigned.has(clientRole.id) : false;
                  return (
                    <tr key={user.id} className="border-b border-[#1F4D36]/[0.05] transition-colors last:border-0 hover:bg-[#F8F7F2]/60">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar name={user.full_name} email={user.email} src={user.avatar_url} size={36} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#1F4D36]">
                              {user.full_name || "Sin nombre"}
                              {user.id === session.userId && <span className="ml-1.5 text-xs font-normal text-[#1B1B1B]/40">(tú)</span>}
                            </p>
                            <p className="truncate text-xs text-[#1B1B1B]/45">
                              {user.email}
                              {user.phone && ` · ${user.phone}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {isClient ? <StatusBadge tone="gray">Cliente</StatusBadge> : <StatusBadge tone="dark">Equipo</StatusBadge>}
                      </td>
                      {(roles ?? []).filter((r) => r.key !== "cliente").map((role) => (
                        <td key={role.id} className="px-3 py-3.5 text-center">
                          <UserRoleToggle
                            userId={user.id}
                            roleId={role.id}
                            roleName={role.name}
                            checked={assigned.has(role.id)}
                            locked={user.id === session.userId && role.key === "admin"}
                          />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <EmptyState icon={Users} title="Sin resultados" description={term ? `Nadie coincide con “${term}”.` : "Aún no hay usuarios."} />
          </div>
        )}
      </Panel>
    </div>
  );
}
