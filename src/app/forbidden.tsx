import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8F7F2] px-4 text-center">
      <h1 className="font-display text-3xl font-bold text-[#1F4D36]">Sin acceso</h1>
      <p className="mt-2 max-w-sm text-sm text-[#1B1B1B]/60">
        Tu rol no tiene permiso para ver esta sección. Pide a un administrador que te lo asigne.
      </p>
      <Button className="mt-6" asChild>
        <Link href="/cuenta">Ir a mi cuenta</Link>
      </Button>
    </main>
  );
}
