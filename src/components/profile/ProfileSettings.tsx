"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, KeyRound, Loader2, Trash2, UserRound } from "lucide-react";
import { setAvatar, updateContact, updatePassword, type ActionState } from "@/app/actions/profile";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export type ProfileData = {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  hasPassword: boolean;
};

const fieldLabel = "block text-xs font-semibold text-[#1B1B1B]/60";

function Card({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#1F4D36]/[0.07] bg-white p-6 shadow-[0_1px_2px_rgba(31,77,54,0.04)]">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F4F8F2] text-[#1F4D36]">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-display text-lg font-bold text-[#1F4D36]">{title}</h2>
          <p className="text-sm text-[#1B1B1B]/55">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="text-sm text-red-700">{state.error}</p>;
  if (state.ok) return <p className="text-sm font-medium text-[#1F4D36]">{state.ok}</p>;
  return null;
}

/** Recorta al centro y reduce a 400×400 WebP antes de subir. */
async function toSquareWebp(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 400;
  canvas
    .getContext("2d")!
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 400, 400);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen"))), "image/webp", 0.85)
  );
}

function AvatarCard({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ActionState>({});
  const [preview, setPreview] = useState(profile.avatarUrl);
  const [pending, startTransition] = useTransition();

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setState({ error: "El archivo debe ser una imagen." });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setState({ error: "La imagen pesa más de 10 MB." });
      return;
    }
    startTransition(async () => {
      try {
        const blob = await toSquareWebp(file);
        const path = `${profile.userId}/${Date.now()}.webp`;
        const { error } = await createClient()
          .storage.from("avatars")
          .upload(path, blob, { contentType: "image/webp", upsert: false });
        if (error) throw error;
        const result = await setAvatar(path);
        setState(result);
        if (!result.error) {
          setPreview(URL.createObjectURL(blob));
          router.refresh();
        }
      } catch {
        setState({ error: "No se pudo subir la foto. Intenta con otra imagen." });
      }
    });
  };

  const remove = () =>
    startTransition(async () => {
      const result = await setAvatar(null);
      setState(result);
      if (!result.error) {
        setPreview(null);
        router.refresh();
      }
    });

  return (
    <Card icon={Camera} title="Foto de perfil" description="JPG, PNG o WebP. La recortamos en cuadrado.">
      <div className="flex flex-wrap items-center gap-5">
        <div className="relative">
          <UserAvatar name={profile.fullName} email={profile.email} src={preview} size={88} />
          {pending && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
              <Loader2 className="h-6 w-6 animate-spin text-[#1F4D36]" />
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button type="button" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
            <Camera className="h-4 w-4" />
            {preview ? "Cambiar foto" : "Subir foto"}
          </Button>
          {preview && (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={remove}>
              <Trash2 className="h-4 w-4" />
              Quitar
            </Button>
          )}
        </div>
      </div>
      <div className="mt-3">
        <Feedback state={state} />
      </div>
    </Card>
  );
}

function ContactCard({ profile }: { profile: ProfileData }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateContact, {});
  return (
    <Card icon={UserRound} title="Datos de contacto" description="Los usamos para coordinar tus entregas.">
      <form action={action} className="space-y-4">
        <label className={fieldLabel}>
          Nombre completo
          <Input name="full_name" defaultValue={profile.fullName} autoComplete="name" className="mt-1.5" required />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={fieldLabel}>
            Celular
            <Input
              name="phone"
              defaultValue={profile.phone}
              inputMode="tel"
              autoComplete="tel"
              placeholder="3001234567"
              className="mt-1.5"
            />
          </label>
          <label className={fieldLabel}>
            Correo
            <Input name="email" type="email" defaultValue={profile.email} autoComplete="email" className="mt-1.5" required />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
          <Feedback state={state} />
        </div>
      </form>
    </Card>
  );
}

function PasswordCard({ hasPassword }: { hasPassword: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(async (prev, data) => {
    const result = await updatePassword(prev, data);
    if (result.ok) formRef.current?.reset();
    return result;
  }, {});

  return (
    <Card
      icon={KeyRound}
      title={hasPassword ? "Contraseña" : "Crear contraseña"}
      description={
        hasPassword
          ? "Mínimo 8 caracteres."
          : "Entras con Google. Si quieres, crea una contraseña para entrar también con tu correo."
      }
    >
      <form ref={formRef} action={action} className="space-y-4">
        {hasPassword && (
          <label className={fieldLabel}>
            Contraseña actual
            <Input name="current" type="password" autoComplete="current-password" className="mt-1.5" required />
          </label>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={fieldLabel}>
            Nueva contraseña
            <Input name="password" type="password" autoComplete="new-password" minLength={8} className="mt-1.5" required />
          </label>
          <label className={fieldLabel}>
            Confirmar
            <Input name="confirm" type="password" autoComplete="new-password" minLength={8} className="mt-1.5" required />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Guardando…" : hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
          </Button>
          <Feedback state={state} />
        </div>
      </form>
    </Card>
  );
}

export function ProfileSettings({ profile }: { profile: ProfileData }) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <AvatarCard profile={profile} />
        <PasswordCard hasPassword={profile.hasPassword} />
      </div>
      <ContactCard profile={profile} />
    </div>
  );
}
