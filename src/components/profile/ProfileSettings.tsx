"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, CheckCircle2, KeyRound, Loader2, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { setMarketingConsent } from "@/app/actions/consents";
import { Switch } from "@/components/ui/switch";
import { COMPANY } from "@/lib/legal";
import { setAvatar, updateContact, updatePassword, type ActionState } from "@/app/actions/profile";
import { UserAvatar } from "@/components/dashboard/UserAvatar";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhone, parseStoredPhone, type PhoneValue } from "@/lib/phone";
import { useFormValidation } from "@/hooks/use-form-validation";
import { first, rules } from "@/lib/validation";
import { notify, toast } from "@/lib/notify";
import { createClient } from "@/lib/supabase/client";

export type ProfileData = {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  marketing: boolean;
  consents: { document: string; version: string | null; date: string | null }[];
};


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
  const [preview, setPreview] = useState(profile.avatarUrl);
  const [pending, startTransition] = useTransition();

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("La imagen pesa más de 10 MB.");
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
        if (notify(await setAvatar(path))) {
          setPreview(URL.createObjectURL(blob));
          router.refresh();
        }
      } catch {
        toast.error("No se pudo subir la foto. Intenta con otra imagen.");
      }
    });
  };

  const remove = () =>
    startTransition(async () => {
      if (notify(await setAvatar(null))) {
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
    </Card>
  );
}

function ContactCard({ profile }: { profile: ProfileData }) {
  const [phone, setPhone] = useState<PhoneValue>(() => parseStoredPhone(profile.phone));
  const v = useFormValidation(
    (f) => ({
      full_name: rules.required(f.full_name, "Escribe tu nombre."),
      phone: !phone.number.trim()
        ? "Escribe tu celular para coordinar las entregas."
        : !isValidPhone(phone)
          ? "Ese número no es válido para el país elegido."
          : null,
      email: first(rules.required(f.email, "Escribe tu correo."), rules.email(f.email)),
    }),
    undefined,
    "contact"
  );
  const [, action, pending] = useActionState<ActionState, FormData>(async (prev, data) => {
    const r = await updateContact(prev, data);
    notify(r);
    return r;
  }, {});
  return (
    <Card icon={UserRound} title="Datos de contacto" description="Los usamos para coordinar tus entregas.">
      <form action={action} {...v.formProps()} className="space-y-4">
        <Field label="Nombre completo" name={v.idFor("full_name")} error={v.error("full_name")}>
          <Input {...v.field("full_name")} defaultValue={profile.fullName} autoComplete="name" />
        </Field>
        <Field label="Celular" name={v.idFor("phone")} error={v.error("phone")} hint="Elige el país y escribe el número.">
          <PhoneInput
            value={phone}
            onChange={(value) => {
              setPhone(value);
              if (v.error("phone")) requestAnimationFrame(v.revalidate);
            }}
            inputProps={v.field("phone")}
            hiddenName="phone_e164"
          />
        </Field>
        <Field label="Correo" name={v.idFor("email")} error={v.error("email")}>
          <Input {...v.field("email")} type="email" inputMode="email" defaultValue={profile.email} autoComplete="email" />
        </Field>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordCard({ hasPassword }: { hasPassword: boolean }) {
  const v = useFormValidation(
    (f) => ({
      current: hasPassword ? rules.required(f.current, "Escribe tu contraseña actual.") : null,
      password: first(rules.required(f.password, "Escribe la nueva contraseña."), rules.minLength(f.password, 8, "Usa al menos 8 caracteres.")),
      confirm: first(
        rules.required(f.confirm, "Repite la nueva contraseña."),
        rules.equals(f.confirm, f.password, "Las contraseñas no coinciden.")
      ),
    }),
    undefined,
    "password"
  );
  const [, action, pending] = useActionState<ActionState, FormData>(async (prev, data) => {
    const result = await updatePassword(prev, data);
    if (notify(result)) v.resetForm();
    return result;
  }, {});

  return (
    <Card
      icon={KeyRound}
      title={hasPassword ? "Contraseña" : "Crear contraseña"}
      description={
        hasPassword
          ? "Para cambiarla te pedimos la actual."
          : "Entras con Google. Si quieres, crea una contraseña para entrar también con tu correo."
      }
    >
      <form action={action} {...v.formProps()} className="space-y-4">
        {hasPassword && (
          <Field label="Contraseña actual" name={v.idFor("current")} error={v.error("current")}>
            <PasswordInput {...v.field("current")} autoComplete="current-password" />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nueva contraseña" name={v.idFor("password")} error={v.error("password")} hint="Mínimo 8 caracteres.">
            <PasswordInput {...v.field("password")} autoComplete="new-password" />
          </Field>
          <Field label="Confirmar" name={v.idFor("confirm")} error={v.error("confirm")}>
            <PasswordInput {...v.field("confirm")} autoComplete="new-password" />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="secondary" disabled={pending}>
            {pending ? "Guardando…" : hasPassword ? "Cambiar contraseña" : "Crear contraseña"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PrivacyCard({ profile }: { profile: ProfileData }) {
  const router = useRouter();
  const [marketing, setMarketing] = useState(profile.marketing);
  const [pending, start] = useTransition();
  const fmt = new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Bogota" });
  const LABEL: Record<string, { name: string; href: string }> = {
    terminos: { name: "Términos y condiciones", href: "/legal/terminos" },
    privacidad: { name: "Tratamiento de datos personales", href: "/legal/privacidad" },
  };

  return (
    <Card icon={ShieldCheck} title="Privacidad y datos" description="Tus autorizaciones y cómo ejercer tus derechos.">
      <ul className="space-y-2 text-sm">
        {profile.consents.map((c) => (
          <li key={c.document} className="flex items-center justify-between gap-3 rounded-2xl bg-[#F8F7F2] px-4 py-3">
            <div>
              <Link href={LABEL[c.document].href} target="_blank" className="font-medium text-[#1F4D36] underline">
                {LABEL[c.document].name}
              </Link>
              <p className="text-xs text-[#1B1B1B]/45">
                {c.date ? `Aceptado el ${fmt.format(new Date(c.date))} · versión ${c.version}` : "Sin aceptar"}
              </p>
            </div>
            <CheckCircle2 className={c.date ? "h-5 w-5 text-[#7CB342]" : "h-5 w-5 text-[#1B1B1B]/20"} />
          </li>
        ))}
      </ul>

      <label className="mt-4 flex items-start justify-between gap-4 rounded-2xl px-1 py-2 text-sm">
        <span>
          <span className="font-medium text-[#1F4D36]">Novedades y promociones</span>
          <span className="block text-xs text-[#1B1B1B]/50">Por correo o WhatsApp. Los avisos de tus pedidos llegan siempre.</span>
        </span>
        <Switch
          label="Recibir novedades y promociones"
          checked={marketing}
          disabled={pending}
          onChange={(value) =>
            start(async () => {
              setMarketing(value);
              if (!notify(await setMarketingConsent(value))) setMarketing(!value);
              router.refresh();
            })
          }
        />
      </label>

      <p className="mt-4 border-t border-[#1F4D36]/[0.06] pt-4 text-xs leading-relaxed text-[#1B1B1B]/50">
        Puedes actualizar tus datos aquí mismo. Para pedir una copia de tu información, la prueba de tu autorización o la eliminación de tu
        cuenta, escríbenos a{" "}
        <a href={`mailto:${COMPANY.privacyEmail}?subject=${encodeURIComponent("Solicitud de datos personales")}`} className="font-semibold text-[#1F4D36] underline">
          {COMPANY.privacyEmail}
        </a>{" "}
        desde el correo de tu cuenta. Respondemos según los plazos de la{" "}
        <Link href="/legal/privacidad#procedimiento" target="_blank" className="font-semibold text-[#1F4D36] underline">
          Política de tratamiento de datos
        </Link>
        .
      </p>
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
      <div className="space-y-6">
        <ContactCard profile={profile} />
        <PrivacyCard profile={profile} />
      </div>
    </div>
  );
}
