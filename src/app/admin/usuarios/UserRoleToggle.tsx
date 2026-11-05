"use client";

import { useOptimistic, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { setUserRole } from "./actions";

export function UserRoleToggle({
  userId,
  roleId,
  roleName,
  checked,
  locked,
}: {
  userId: string;
  roleId: string;
  roleName: string;
  checked: boolean;
  locked: boolean;
}) {
  const [optimistic, setOptimistic] = useOptimistic(checked);
  const [pending, startTransition] = useTransition();
  return (
    <Switch
      size="sm"
      label={`Rol ${roleName}`}
      checked={optimistic}
      disabled={locked || pending}
      onChange={(next) =>
        startTransition(async () => {
          setOptimistic(next);
          await setUserRole(userId, roleId, next);
        })
      }
    />
  );
}
