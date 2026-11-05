"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createRole, deleteRole, setRolePermission, type FormState } from "./actions";

export function CreateRoleForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createRole, {});
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row">
        <Input name="name" placeholder="Nombre (ej. Bodega)" required className="h-11 md:max-w-60" />
        <Input name="description" placeholder="¿Qué hace este rol? (opcional)" className="h-11" />
        <Button type="submit" disabled={pending} className="shrink-0">
          <Plus className="h-4 w-4" /> Crear rol
        </Button>
      </div>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
    </form>
  );
}

export function PermissionToggle({
  roleId,
  permission,
  label,
  checked,
  locked,
}: {
  roleId: string;
  permission: string;
  label: string;
  checked: boolean;
  locked: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className={`text-sm ${optimistic ? "text-[#1B1B1B]/80" : "text-[#1B1B1B]/45"}`}>{label}</span>
      <Switch
        size="sm"
        label={label}
        checked={optimistic}
        disabled={locked || pending}
        onChange={(next) =>
          startTransition(async () => {
            setOptimistic(next);
            await setRolePermission(roleId, permission, next);
          })
        }
      />
    </div>
  );
}

export function DeleteRoleButton({ roleId, name }: { roleId: string; name: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(() => deleteRole(roleId))}
      className="text-red-700 hover:bg-red-50"
      aria-label={`Eliminar rol ${name}`}
    >
      <Trash2 className="h-4 w-4" /> Eliminar
    </Button>
  );
}
