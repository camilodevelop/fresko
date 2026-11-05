"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useFormValidation } from "@/hooks/use-form-validation";
import { first, rules } from "@/lib/validation";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/env";
import { safeNext } from "@/lib/safe-next";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";

const ERRORS: Record<string, string> = {
  "Invalid login credentials": "Correo o contraseña incorrectos.",
  "User already registered": "Ya existe una cuenta con ese correo.",
  "Email not confirmed": "Confirma tu correo antes de ingresar.",
};

function translate(message: string) {
  if (message.includes("provider is not enabled")) {
    return "El ingreso con Google aún no está configurado.";
  }
  if (message.includes("Password should be")) {
    return "La contraseña debe tener al menos 6 caracteres.";
  }
  return ERRORS[message] ?? message;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    !supabaseConfigured
      ? "El ingreso aún no está disponible. Estamos terminando de configurarlo."
      : searchParams.get("error")
        ? "No se pudo completar el ingreso. Intenta de nuevo."
        : null
  );
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const v = useFormValidation(
    () => ({
      full_name: mode === "register" ? rules.required(name, "Escribe tu nombre.") : null,
      email: first(rules.required(email, "Escribe tu correo."), rules.email(email)),
      password:
        mode === "register"
          ? first(rules.required(password, "Crea una contraseña."), rules.minLength(password, 8, "Usa al menos 8 caracteres."))
          : rules.required(password, "Escribe tu contraseña."),
    }),
    () => ({ name, email, password }),
    "login"
  );

  const switchMode = (value: Mode) => {
    setMode(value);
    setError(null);
    setInfo(null);
    v.reset();
  };

  const handleSubmit = async () => {
    setError(null);
    setInfo(null);
    if (!supabaseConfigured) return;
    setLoading(true);
    const supabase = createClient();

    const result =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: { full_name: name.trim() },
              emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            },
          });

    setLoading(false);
    if (result.error) {
      setError(translate(result.error.message));
      return;
    }
    if (!result.data.session) {
      setInfo("Te enviamos un correo para confirmar tu cuenta.");
      return;
    }
    router.push(next);
    router.refresh();
  };

  const handleGoogle = async () => {
    if (!supabaseConfigured) return;
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (oauthError) setError(translate(oauthError.message));
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-[#1F4D36]/8 bg-white p-6 shadow-xl shadow-[#1F4D36]/5 sm:p-8">
      <div className="mb-6 flex rounded-full bg-[#F4F8F2] p-1">
        {(["login", "register"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => switchMode(item)}
            className={cn(
              "flex-1 rounded-full py-2.5 text-xs font-bold uppercase tracking-wider transition-all",
              mode === item
                ? "bg-[#1F4D36] text-white shadow-sm"
                : "text-[#1F4D36]/60 hover:text-[#1F4D36]"
            )}
          >
            {item === "login" ? "Ingresar" : "Crear cuenta"}
          </button>
        ))}
      </div>

      <h1 className="font-display text-2xl font-bold text-[#1F4D36]">
        {mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}
      </h1>
      <p className="mt-1 text-sm text-[#1B1B1B]/55">
        {mode === "login"
          ? "Gestiona tus pedidos, tu plan y tus entregas."
          : "Compra planes y programa tus entregas."}
      </p>

      <Button
        type="button"
        variant="secondary"
        className="mt-6 w-full"
        onClick={handleGoogle}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.6 2.3 2.3 6.6 2.3 12s4.3 9.7 9.7 9.7c5.6 0 9.3-3.9 9.3-9.5 0-.6-.1-1.1-.2-1.6H12z" />
        </svg>
        Continuar con Google
      </Button>

      <div className="my-5 flex items-center gap-3 text-xs text-[#1B1B1B]/40">
        <span className="h-px flex-1 bg-[#1F4D36]/10" />o con tu correo
        <span className="h-px flex-1 bg-[#1F4D36]/10" />
      </div>

      <form {...v.formProps(handleSubmit)} className="space-y-4">
        {mode === "register" && (
          <Field name={v.idFor("full_name")} error={v.error("full_name")}>
            <Input
              {...v.field("full_name")}
              placeholder="Nombre completo"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
        )}
        <Field name={v.idFor("email")} error={v.error("email")}>
          <Input
            {...v.field("email")}
            type="email"
            placeholder="Correo electrónico"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field
          name={v.idFor("password")}
          error={v.error("password")}
          hint={mode === "register" ? "Mínimo 8 caracteres." : undefined}
        >
          <Input
            {...v.field("password")}
            type="password"
            placeholder="Contraseña"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {error && (
          <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {info && <p className="rounded-2xl bg-[#E8F3DC] px-4 py-3 text-sm text-[#1F4D36]">{info}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "login" ? "Ingresar" : "Crear cuenta"}
        </Button>
      </form>
    </div>
  );
}
