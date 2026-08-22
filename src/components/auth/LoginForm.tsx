"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DEMO_OTP,
  formatPhoneDisplay,
  isEmail,
  isValidColombianPhone,
  normalizePhone,
  saveDemoUser,
} from "@/lib/auth-demo";
import { cn } from "@/lib/utils";

type Mode = "login" | "register";
type RegisterStep = "datos" | "otp";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("datos");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetMode = (next: Mode) => {
    setMode(next);
    setRegisterStep("datos");
    setError(null);
    setOtp("");
  };

  const enterAccount = (payload: {
    name: string;
    email?: string;
    phone?: string;
    phoneVerified: boolean;
  }) => {
    saveDemoUser({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      phoneVerified: payload.phoneVerified,
    });
    router.push("/cuenta");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const value = account.trim();
    if (!isEmail(value) && !isValidColombianPhone(value)) {
      setError("Ingresa un celular colombiano (10 dígitos) o un correo.");
      return;
    }
    if (password.trim().length < 4) {
      setError("Ingresa tu contraseña.");
      return;
    }

    setLoading(true);
    const phoneValue = isEmail(value) ? "" : normalizePhone(value);
    window.setTimeout(() => {
      enterAccount({
        name: isEmail(value) ? value.split("@")[0] : "Cliente",
        email: isEmail(value) ? value : undefined,
        phone: isEmail(value) ? undefined : phoneValue,
        phoneVerified: !isEmail(value),
      });
    }, 350);
  };

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidColombianPhone(phone)) {
      setError("El celular es obligatorio. Usa 10 dígitos, por ejemplo 3001234567.");
      return;
    }
    if (email.trim() && !isEmail(email)) {
      setError("El correo no tiene un formato válido.");
      return;
    }
    if (password.trim().length < 4) {
      setError("Crea una contraseña de al menos 4 caracteres.");
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      setRegisterStep("otp");
    }, 500);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.replace(/\s/g, "") !== DEMO_OTP) {
      setError("Código incorrecto. En esta maqueta el OTP es 123456.");
      return;
    }

    setLoading(true);
    window.setTimeout(() => {
      enterAccount({
        name: name.trim() || "Cliente",
        email: email.trim() || undefined,
        phone: normalizePhone(phone),
        phoneVerified: true,
      });
    }, 350);
  };

  return (
    <div className="w-full max-w-md rounded-3xl border border-[#1F4D36]/8 bg-white p-6 shadow-xl shadow-[#1F4D36]/5 sm:p-8">
      <div className="mb-6 flex rounded-full bg-[#F4F8F2] p-1">
        {(["login", "register"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => resetMode(item)}
            className={cn(
              "flex-1 rounded-full py-2.5 text-xs font-bold uppercase tracking-wider transition-all",
              mode === item
                ? "bg-[#1F4D36] text-white shadow-sm"
                : "text-[#1F4D36]/60 hover:text-[#1F4D36]"
            )}
          >
            {item === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        ))}
      </div>

      {mode === "login" && (
        <>
          <h1 className="font-display text-2xl font-bold text-[#1F4D36]">
            Bienvenido de nuevo
          </h1>
          <p className="mt-2 text-sm text-[#1B1B1B]/55">
            Ingresa tu celular o correo y tu contraseña.
          </p>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-[#1F4D36]">
              Celular o correo
              <Input
                className="mt-1.5"
                required
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="3001234567 o tucorreo@email.com"
                autoComplete="username"
              />
            </label>
            <label className="block text-sm font-medium text-[#1F4D36]">
              Contraseña
              <Input
                className="mt-1.5"
                type="password"
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar a mi cuenta"
              )}
            </Button>
          </form>
        </>
      )}

      {mode === "register" && registerStep === "datos" && (
        <>
          <h1 className="font-display text-2xl font-bold text-[#1F4D36]">
            Crea tu cuenta FRESKO
          </h1>
          <p className="mt-2 text-sm text-[#1B1B1B]/55">
            El celular es obligatorio y lo validamos con un código OTP.
          </p>
          <form onSubmit={handleSendOtp} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-[#1F4D36]">
              Nombre
              <Input
                className="mt-1.5"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </label>
            <label className="block text-sm font-medium text-[#1F4D36]">
              Correo <span className="font-normal text-[#1B1B1B]/40">(opcional)</span>
              <Input
                className="mt-1.5"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@email.com"
                autoComplete="email"
              />
            </label>
            <label className="block text-sm font-medium text-[#1F4D36]">
              Celular
              <Input
                className="mt-1.5"
                type="tel"
                required
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="3001234567"
                autoComplete="tel"
              />
            </label>
            <label className="block text-sm font-medium text-[#1F4D36]">
              Contraseña
              <Input
                className="mt-1.5"
                type="password"
                required
                minLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando código...
                </>
              ) : (
                "Enviar código OTP"
              )}
            </Button>
          </form>
        </>
      )}

      {mode === "register" && registerStep === "otp" && (
        <>
          <h1 className="font-display text-2xl font-bold text-[#1F4D36]">
            Valida tu celular
          </h1>
          <p className="mt-2 text-sm text-[#1B1B1B]/55">
            Enviamos un código a {formatPhoneDisplay(phone)}. En esta maqueta el
            código es <span className="font-semibold text-[#1F4D36]">{DEMO_OTP}</span>.
          </p>
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4">
            <label className="block text-sm font-medium text-[#1F4D36]">
              Código OTP
              <Input
                className="mt-1.5 tracking-[0.4em]"
                inputMode="numeric"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                autoComplete="one-time-code"
              />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                "Validar y crear cuenta"
              )}
            </Button>
            <button
              type="button"
              className="w-full text-center text-sm text-[#1F4D36]/60 hover:text-[#1F4D36]"
              onClick={() => {
                setRegisterStep("datos");
                setOtp("");
                setError(null);
              }}
            >
              Cambiar número
            </button>
          </form>
        </>
      )}
    </div>
  );
}
