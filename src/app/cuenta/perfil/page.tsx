import { PageHeader } from "@/components/dashboard/ui";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { loadProfile } from "@/lib/profile";

export default async function PerfilPage() {
  const profile = await loadProfile("/cuenta/perfil");
  return (
    <div>
      <PageHeader eyebrow="Configuración" title="Mi perfil" description="Tu foto, tus datos de contacto y tu contraseña." />
      <ProfileSettings profile={profile} />
    </div>
  );
}
