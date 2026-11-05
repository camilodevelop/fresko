import { Lock, Shield } from "lucide-react";
import { PageHeader, Panel, StatusBadge } from "@/components/dashboard/ui";
import { requirePermission } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { CreateRoleForm, DeleteRoleButton, PermissionToggle } from "./RoleControls";

export default async function RolesPage() {
  await requirePermission("roles.manage");
  const supabase = await createClient();
  const [{ data: roles }, { data: permissions }, { data: links }, { data: members }] = await Promise.all([
    supabase.from("roles").select("id, key, name, description, is_system").order("created_at"),
    supabase.from("permissions").select("key, module, description").order("module"),
    supabase.from("role_permissions").select("role_id, permission_key"),
    supabase.from("user_roles").select("role_id"),
  ]);

  const granted = new Set((links ?? []).map((l) => `${l.role_id}:${l.permission_key}`));
  const modules = Object.entries(Object.groupBy(permissions ?? [], (p) => p.module));
  const countBy = (list: { role_id: string }[] | null, id: string) => (list ?? []).filter((x) => x.role_id === id).length;

  return (
    <div>
      <PageHeader
        eyebrow="Configuración"
        title="Roles y permisos"
        description="Cada persona puede tener varios roles y sus permisos se suman. Los cambios aplican de inmediato."
      />

      <Panel title="Nuevo rol" description="Créalo y luego activa sus permisos." className="mb-6">
        <CreateRoleForm />
      </Panel>

      <div className="space-y-6">
        {(roles ?? []).map((role) => {
          const isAdmin = role.key === "admin";
          const permCount = countBy(links, role.id);
          return (
            <Panel
              key={role.id}
              icon={Shield}
              title={
                <span className="flex flex-wrap items-center gap-2">
                  {role.name}
                  {role.is_system && <StatusBadge tone="gray" dot={false}>Sistema</StatusBadge>}
                </span>
              }
              description={role.description || undefined}
              actions={
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs text-[#1B1B1B]/45 sm:inline">
                    {permCount} permisos · {countBy(members, role.id)} personas
                  </span>
                  {!role.is_system && <DeleteRoleButton roleId={role.id} name={role.name} />}
                </div>
              }
            >
              {isAdmin && (
                <p className="mb-4 flex items-center gap-2 rounded-2xl bg-[#F8F7F2] px-4 py-2.5 text-xs text-[#1B1B1B]/55">
                  <Lock className="h-3.5 w-3.5" /> El Administrador siempre tiene todos los permisos.
                </p>
              )}
              <div className="grid gap-x-8 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                {modules.map(([module, perms]) => (
                  <div key={module}>
                    <p className="border-b border-[#1F4D36]/[0.06] pb-2 text-[11px] font-bold uppercase tracking-wider text-[#7CB342]">
                      {module}
                    </p>
                    <div className="divide-y divide-[#1F4D36]/[0.04]">
                      {perms!.map((perm) => (
                        <PermissionToggle
                          key={perm.key}
                          roleId={role.id}
                          permission={perm.key}
                          label={perm.description}
                          checked={granted.has(`${role.id}:${perm.key}`)}
                          locked={isAdmin}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
