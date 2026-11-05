import { Suspense } from "react";
import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión | FRESKO",
  description: "Accede a tu cuenta FRESKO para pedidos, suscripción y entregas.",
};

export default function LoginPage() {
  return (
    <>
      <Navbar />
      <main className="flex min-h-screen items-center justify-center bg-[#F8F7F2] px-4 py-28">
        <Suspense>
          <LoginForm />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
