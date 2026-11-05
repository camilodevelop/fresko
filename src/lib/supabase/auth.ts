import "server-only";
import { cache } from "react";
import { forbidden, redirect } from "next/navigation";
import { createClient } from "./server";
import { LEGAL_VERSIONS } from "@/lib/legal";

export type Permission =
  | "admin.access"
  | "users.manage"
  | "roles.manage"
  | "zones.manage"
  | "catalog.manage"
  | "inventory.view"
  | "inventory.manage"
  | "orders.view"
  | "orders.manage"
  | "kitchen.prepare"
  | "delivery.deliver"
  | "reports.view";

export type SessionInfo = {
  userId: string;
  email: string | null;
  fullName: string;
  avatarUrl: string | null;
  roleNames: string[];
  permissions: Set<string>;
  /** Personal (admin, cocina, domicilios…): usa el panel, no la zona de clientes. */
  isStaff: boolean;
  /** false si solo entra con Google (no tiene contraseña propia). */
  hasPassword: boolean;
  /** true si debe aceptar la versión vigente de términos y tratamiento de datos. */
  needsConsent: boolean;
};

/** Usuario actual y sus permisos (una sola consulta por request). */
export const getSession = cache(async (): Promise<SessionInfo | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: perms }, { data: roles }, { data: consents }] = await Promise.all([
    supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single(),
    supabase.rpc("my_permissions"),
    supabase.from("user_roles").select("roles(name)").eq("user_id", user.id),
    supabase
      .from("user_consents")
      .select("document, version, accepted")
      .eq("user_id", user.id)
      .in("document", ["terminos", "privacidad"])
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const latest = (doc: string) => consents?.find((c) => c.document === doc);
  const permissions = new Set(perms ?? []);

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? "",
    avatarUrl: profile?.avatar_url ?? null,
    roleNames: (roles ?? []).map((r) => r.roles.name),
    permissions,
    isStaff: permissions.has("admin.access"),
    hasPassword: (user.identities ?? []).some((i) => i.provider === "email"),
    needsConsent: !(
      latest("terminos")?.accepted &&
      latest("terminos")?.version === LEGAL_VERSIONS.terminos &&
      latest("privacidad")?.accepted &&
      latest("privacidad")?.version === LEGAL_VERSIONS.privacidad
    ),
  };
});

export async function requireSession(next = "/cuenta") {
  const session = await getSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(next)}`);
  return session;
}

/** Como requireSession, pero además exige haber aceptado los documentos legales vigentes. */
export async function requireConsentedSession(next = "/cuenta") {
  const session = await requireSession(next);
  if (session.needsConsent) redirect(`/legal/aceptar?next=${encodeURIComponent(next)}`);
  return session;
}

/** Para páginas y server actions: corta con 403 si falta el permiso. */
export async function requirePermission(perm: Permission) {
  const session = await requireConsentedSession("/admin");
  if (!session.permissions.has(perm)) forbidden();
  return session;
}
