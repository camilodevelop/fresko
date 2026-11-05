"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { Field } from "@/components/ui/field";
import { useFormValidation } from "@/hooks/use-form-validation";
import { first, rules } from "@/lib/validation";
import { notify } from "@/lib/notify";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { createRole, deleteRole, setRolePermission, type FormState } from "./actions";

export function CreateRoleForm() {
  const v = useFormValidation(
    (f) => ({
      name: first(rules.required(f.name, "Escribe el nombre del rol."), rules.minLength(f.name, 3, "Usa al menos 3 caracteres.")),
    }),
    undefined,
    "role"
  );
  const [, action, pending] = useActionState<FormState, FormData>(async (prev, data) => {
    const r = await createRole(prev, data);
    if (notify(r)) v.resetForm();
    return r;
  }, {});
  return (
    <form action={action} {...v.formProps()} className="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <Field name={v.idFor("name")} error={v.error("name")} className="md:w-60">
          <Input {...v.field("name")} placeholder="Nombre (ej. Bodega)" className="h-11" />
        </Field>
        <Field name={v.idFor("description")} className="flex-1">
          <Input {...v.field("description")} placeholder="¿Qué hace este rol? (opcional)" className="h-11" />
        </Field>
        <Button type="submit" disabled={pending} className="h-11 shrink-0">
          <Plus className="h-4 w-4" /> Crear rol
        </Button>
      </div>
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
            notify(await setRolePermission(roleId, permission, next));
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
      onClick={() => startTransition(async () => void notify(await deleteRole(roleId)))}
      className="text-red-700 hover:bg-red-50"
      aria-label={`Eliminar rol ${name}`}
    >
      <Trash2 className="h-4 w-4" /> Eliminar
    </Button>
  );
}
